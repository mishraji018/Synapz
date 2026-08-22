import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getLengthInstruction = (length: string) => {
  switch (length) {
    case 'short': return 'Generate a very concise summary. Keep bullet_summary to 3-4 points. TL;DR should be 1-2 sentences.';
    case 'detailed': return 'Generate a very thorough and comprehensive summary. bullet_summary should have 10-15 detailed points. TL;DR can be 3-4 sentences.';
    default: return 'Generate a balanced summary. bullet_summary should have 6-10 points. TL;DR should be 2-3 sentences.';
  }
}

const getStyleInstruction = (style: string) => {
  switch (style) {
    case 'simple': return 'Use simple, easy-to-understand language. Avoid jargon. Explain concepts as if to a beginner.';
    case 'professional': return 'Use professional, business-appropriate language. Be precise and formal.';
    case 'academic': return 'Use academic language with proper terminology. Include methodological observations where relevant.';
    case 'bullets': return 'Prioritize bullet-point format everywhere. Minimize paragraph text.';
    default: return 'Use clear, well-structured language appropriate for a general audience.';
  }
}

const getFocusInstruction = (focus: string) => {
  switch (focus) {
    case 'exam': return 'Focus on exam-relevant content: definitions, key concepts, formulas, important facts, and potential exam questions. Make flashcards especially thorough.';
    case 'research': return 'Focus on research aspects: methodology, findings, data, conclusions, limitations, and future work. Highlight statistical significance and research gaps.';
    case 'business': return 'Focus on business-relevant insights: metrics, KPIs, strategic decisions, market trends, competitive analysis, and actionable recommendations.';
    case 'legal': return 'Focus on legal aspects: clauses, obligations, rights, deadlines, penalties, and compliance requirements. Be precise about legal terminology.';
    case 'news': return 'Focus on newsworthy elements: who, what, when, where, why, and how. Highlight key events, quotes, and implications.';
    case 'meeting': return 'Focus on meeting outcomes: decisions made, action items with owners, deadlines, discussion points, and follow-ups needed.';
    default: return 'Provide a general-purpose summary covering all important aspects of the content.';
  }
}

const getSystemPrompt = (existing_subjects: string[] = [], options: { length?: string; style?: string; focus?: string } = {}) => `You are an expert AI summarizer that outputs STRICTLY valid JSON. Do not include markdown code fences (like \`\`\`json) or any conversational text.

Generate a structured summary from the user's content.
Regardless of the language of the input content, always generate the summary, bullet points, treemap, mindmap, flashcards, and timeline in English. If the source content is in a non-English language, translate the key concepts into clear English while preserving accuracy.

Given the content, assign the most appropriate subject/category for this note. If it fits one of these existing subjects: [${existing_subjects.join(', ')}], reuse that exact subject name. If none fit well, create a new, concise, relevant subject name (1-2 words, Title Case).

${getLengthInstruction(options.length || 'medium')}
${getStyleInstruction(options.style || 'simple')}
${getFocusInstruction(options.focus || 'general')}

EXPECTED JSON SCHEMA:
{
  "subject": "string",
  "title": "string",
  "document_type": "research_paper | meeting_transcript | news | lecture | legal | general",
  "tldr": "string (a brief 1-3 sentence summary of the entire content)",
  "bullet_summary": ["string"],
  "key_points": ["string (the most critical takeaways, 3-5 items)"],
  "action_items": ["string (actionable tasks or next steps derived from the content, can be empty array if none)"],
  "keywords": ["string (5-8 important keywords/terms)"],
  "entities": [{ "name": "string", "type": "person | company | place | date | concept | other", "context": "string (brief context of how this entity appears)" }],
  "treemap": { 
    "main_topic": "string", 
    "subtopics": [
      { "name": "string", "points": ["string"], "weight": number }
    ] 
  },
  "mindmap": { 
    "nodes": [{ "id": "string", "label": "string", "details": ["string", "string"] }], 
    "edges": [{ "source": "string", "target": "string" }] 
  },
  "flashcards": [{ "question": "string", "answer": "string" }],
  "timeline": [{ "step": "string", "description": "string" }],
  "tags": ["string"],
  "quality_score": {
    "coverage": number (0-100, how much of the source content is covered),
    "faithfulness": number (0-100, how accurately it represents the source),
    "redundancy": number (0-100, lower is better - how much repetition exists),
    "overall": number (0-100, overall quality assessment)
  }
}

CRITICAL INSTRUCTION: Be thorough and detailed — extract as much structured insight as the content supports. Do not artificially limit the number of items.

Guidelines:
- "document_type": Automatically detect the type of document from its content.
- "tldr": A concise 1-3 sentence summary capturing the essence of the entire content.
- "subject": The assigned subject/category.
- "title": A concise title for the content.
- "bullet_summary": Detailed bullets proportional to content complexity.
- "key_points": The 3-5 most critical takeaways that a reader absolutely must know.
- "action_items": Concrete next steps, tasks, or recommendations derived from the content. Return empty array if not applicable.
- "keywords": 5-8 important terms or concepts from the content.
- "entities": People, companies, places, dates, and key concepts mentioned. Include brief context for each.
- "treemap": Extract main topic and 4-6 subtopics. Each subtopic MUST have 3-5 detailed points. Distribute a total weight of 100 among subtopics based on importance.
- "mindmap": Create a deep hierarchical graph (15-20 nodes total). 1 root node -> 4-6 subtopic nodes -> 2-3 leaf/detail nodes under each subtopic. Nodes need an id, label, and a "details" array. Every single node in the mindmap, including the root and all leaf nodes, MUST include a 'details' array with exactly 2-4 specific, non-empty string points directly about that node's topic. Do not return an empty array or omit this field under any circumstances. Edges connect them.
- "flashcards": 6-10 key Q&A pairs covering different, specific aspects of the content.
- "timeline": Sequential steps, events, or logical flow. Provide descriptive text per step (2-3 sentences each).
- "tags": 3-5 relevant keywords.
- "quality_score": Self-evaluate the quality of your summary honestly.
`;

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Parse request body
    const { content, source_type, title, existing_subjects = [], summary_options = {} } = await req.json() as any

    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 3. Get Groq API key
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }

    const promptMessage = `Source Type: ${source_type}\nOptional Title: ${title || 'None'}\n\nContent:\n${content}`;

    const model = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';

    // 4. Call Groq API
    const requestBody: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: getSystemPrompt(existing_subjects, summary_options) },
        { role: 'user', content: promptMessage }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
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
    const rawResponse = data.choices[0]?.message?.content || '{}';

    // 5. Parse and clean JSON response
    let parsedData;
    try {
      // Strip markdown code fences if the LLM accidentally included them
      const cleanJson = rawResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, '\\nRaw Response:', rawResponse);
      // Fallback error if the LLM hallucinated invalid JSON
      return new Response(JSON.stringify({ 
        error: 'Failed to generate structured summary, please try again. The AI response was invalid.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 422, // Unprocessable Entity
      })
    }

    // 6. Return successful structured data
    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
