import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { validatePayloadSize, sanitizeInput } from '../_shared/validate.ts'

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Rate limiting check (Max 25 questions per 5 minutes per IP)
    const rateLimit = checkRateLimit(req, { maxRequests: 25, windowSeconds: 300 });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Please retry in ${rateLimit.retryAfter} seconds.` }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter),
          },
        }
      );
    }

    // 2. Validate payload size
    const bodyText = await req.text();
    if (!validatePayloadSize(bodyText)) {
      return new Response(
        JSON.stringify({ error: 'Payload size exceeds 500KB limit.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { question, note_content } = parsedBody;

    if (!question || typeof question !== 'string' || !note_content) {
      return new Response(JSON.stringify({ error: 'Question and note_content are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const sanitizedQuestion = sanitizeInput(question);

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    const systemPrompt = `You are answering questions about the following note content: 
${JSON.stringify(note_content, null, 2)}. 

Answer the user's question concisely and accurately based only on this content. If the answer isn't in the content, say so.`;

    const model = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';

    const requestBody: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitizedQuestion }
      ],
      temperature: 0.3
    };

    if (model.includes('gpt-oss') || model.includes('reasoning') || model.includes('deepseek-r1')) {
      requestBody.reasoning_effort = 'low';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data: any = await response.json();
    const rawResponse = data.choices[0]?.message?.content || '';

    return new Response(rawResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

