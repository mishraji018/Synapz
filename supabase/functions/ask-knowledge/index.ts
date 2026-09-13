import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { validatePayloadSize, sanitizeInput } from '../_shared/validate.ts'

interface Citation {
  document_id: string;
  document_title: string;
  source_type: string;
  section_title?: string;
  viz_type?: string;
  viz_node_id?: string;
  snippet: string;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Rate Limiting check (Max 20 requests per 5 minutes per IP)
    const rateLimit = checkRateLimit(req, { maxRequests: 20, windowSeconds: 300 });
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

    const { question, notes_context = [], history = [] } = parsedBody;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const sanitizedQuestion = sanitizeInput(question);

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    // Rank / find most relevant notes & sections based on the query keywords & semantic overlap
    const queryTerms = sanitizedQuestion.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);

    const scoredNotes = (Array.isArray(notes_context) ? notes_context : []).map((note: any) => {
      let score = 0;
      const titleLower = (note.title || '').toLowerCase();
      const subjectLower = (note.subject || '').toLowerCase();
      const tldrLower = (note.tldr || '').toLowerCase();
      const tagsLower = (note.tags || []).join(' ').toLowerCase();
      const bulletsLower = (note.bullet_summary || []).join(' ').toLowerCase();
      const keyPointsLower = (note.key_points || []).join(' ').toLowerCase();

      queryTerms.forEach((term: string) => {
        if (titleLower.includes(term)) score += 10;
        if (subjectLower.includes(term)) score += 6;
        if (tagsLower.includes(term)) score += 5;
        if (tldrLower.includes(term)) score += 4;
        if (bulletsLower.includes(term)) score += 3;
        if (keyPointsLower.includes(term)) score += 3;
      });

      return { note, score };
    });

    // Sort by score and pick top relevant notes (or default to top recent if broad question)
    scoredNotes.sort((a: any, b: any) => b.score - a.score);
    const topNotes = scoredNotes.slice(0, 5).map((sn: any) => sn.note);

    // Build grounding knowledge chunks and citations
    const citations: Citation[] = [];
    const formattedKnowledgeChunks: string[] = [];

    topNotes.forEach((note: any) => {
      const docCitations: Citation[] = [];

      // Citation for main summary
      if (note.tldr || (note.bullet_summary && note.bullet_summary.length > 0)) {
        const snippet = note.tldr || note.bullet_summary.slice(0, 2).join(' ');
        docCitations.push({
          document_id: note.id,
          document_title: note.title,
          source_type: note.source_type || 'text',
          section_title: 'Summary & TL;DR',
          viz_type: 'summary',
          snippet: snippet.substring(0, 180) + '...',
        });
      }

      // Citation for mindmap / treemap if relevant
      if (note.mindmap?.nodes?.length > 0) {
        const matchingNode = note.mindmap.nodes.find((n: any) => 
          queryTerms.some((t: string) => (n.label || '').toLowerCase().includes(t))
        );
        if (matchingNode) {
          docCitations.push({
            document_id: note.id,
            document_title: note.title,
            source_type: note.source_type || 'text',
            section_title: `Mindmap: ${matchingNode.label}`,
            viz_type: 'mindmap',
            viz_node_id: matchingNode.id,
            snippet: matchingNode.details?.join(' ') || matchingNode.label,
          });
        }
      }

      citations.push(...docCitations.slice(0, 2));

      formattedKnowledgeChunks.push(`---
DOCUMENT: "${note.title}" (Subject: ${note.subject || 'General'}, Type: ${note.source_type})
TL;DR: ${note.tldr || 'N/A'}
KEY POINTS:
${(note.key_points || []).map((p: string) => `• ${p}`).join('\n')}
DETAILED BULLETS:
${(note.bullet_summary || []).slice(0, 8).map((b: string) => `• ${b}`).join('\n')}
MINDMAP SUBTOPICS:
${(note.mindmap?.nodes || []).slice(0, 6).map((n: any) => `- ${n.label}: ${(n.details || []).join('; ')}`).join('\n')}
---`);
    });

    const systemPrompt = `You are "Ask My Knowledge", an intelligent personal AI assistant that answers questions accurately based ON THE USER'S SAVED KNOWLEDGE BASE below.

GUIDELINES:
1. Base your answer strictly on the provided knowledge base context whenever possible.
2. Synthesize insights across multiple notes if relevant.
3. Explicitly cite the document titles you draw information from (e.g. "According to [Document Name]...").
4. If the information is not present in the user's notes, clearly mention what you know from their notes and state that the specific detail was not found in their existing library.
5. Format your answer with clear markdown (bullet points, bold highlights, concise sections).

USER'S KNOWLEDGE CONTEXT:
${formattedKnowledgeChunks.join('\n\n')}
`;

    const sanitizedHistory = (Array.isArray(history) ? history : [])
      .slice(-4)
      .map((h: any) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: sanitizeInput(String(h.content || '')),
      }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sanitizedHistory,
      { role: 'user', content: sanitizedQuestion },
    ];

    const model = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';

    const requestBody: Record<string, any> = {
      model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 1024,
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
    const content = data.choices[0]?.message?.content || '';

    return new Response(JSON.stringify({
      answer: content,
      citations: citations.slice(0, 4)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Ask Knowledge Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

