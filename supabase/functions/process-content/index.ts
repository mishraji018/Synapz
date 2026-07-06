/// <reference types="npm:@types/deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getSystemPrompt = (existing_subjects: string[] = []) => `You are an expert AI summarizer that outputs STRICTLY valid JSON. Do not include markdown code fences (like \`\`\`json) or any conversational text.

Generate a structured summary from the user's content.
Regardless of the language of the input content, always generate the summary, bullet points, treemap, mindmap, flashcards, and timeline in English. If the source content is in a non-English language, translate the key concepts into clear English while preserving accuracy.

Given the content, assign the most appropriate subject/category for this note. If it fits one of these existing subjects: [${existing_subjects.join(', ')}], reuse that exact subject name. If none fit well, create a new, concise, relevant subject name (1-2 words, Title Case).

EXPECTED JSON SCHEMA:
{
  "subject": "string",
  "title": "string",
  "bullet_summary": ["string"],
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
  "tags": ["string"]
}

CRITICAL INSTRUCTION: Be thorough and detailed — extract as much structured insight as the content supports. Do not artificially limit the number of items.

Guidelines:
- "subject": The assigned subject/category.
- "title": A concise title for the content.
- "bullet_summary": Generate 6-10 highly detailed bullets for substantial content. Proportional to content complexity.
- "treemap": Extract main topic and 4-6 subtopics. Each subtopic MUST have 3-5 detailed points. Distribute a total weight of 100 among subtopics based on importance.
- "mindmap": Create a deep hierarchical graph (15-20 nodes total). 1 root node -> 4-6 subtopic nodes -> 2-3 leaf/detail nodes under each subtopic. Nodes need an id, label, and a "details" array. Every single node in the mindmap, including the root and all leaf nodes, MUST include a 'details' array with exactly 2-4 specific, non-empty string points directly about that node's topic. Do not return an empty array or omit this field under any circumstances. Edges connect them.
- "flashcards": 6-10 key Q&A pairs covering different, specific aspects of the content.
- "timeline": Sequential steps, events, or logical flow. Provide descriptive text per step (2-3 sentences each).
- "tags": 3-5 relevant keywords.
`;

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Parse request body
    const { content, source_type, title, existing_subjects = [] } = await req.json()

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

    // 4. Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: getSystemPrompt(existing_subjects) },
          { role: 'user', content: promptMessage }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json()
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
