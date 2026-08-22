import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, question, note_content } = await req.json() as any

    if (!question || !note_content) {
      return new Response(JSON.stringify({ error: 'Question and note_content are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }

    const systemPrompt = `You are answering questions about the following note content: 
${JSON.stringify(note_content, null, 2)}. 

Answer the user's question concisely and accurately based only on this content. If the answer isn't in the content, say so.`

    const model = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';

    const requestBody: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.3
    };

    if (model.includes('gpt-oss') || model.includes('reasoning')) {
      requestBody.reasoning_effort = 'low';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data: any = await response.json()
    const rawResponse = data.choices[0]?.message?.content || '';

    return new Response(rawResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
