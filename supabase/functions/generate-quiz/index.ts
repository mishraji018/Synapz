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
    const { note_title, note_content, count = 5, difficulty = 'medium' } = await req.json() as any

    if (!note_content) {
      return new Response(JSON.stringify({ error: 'Note content is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }

    const systemPrompt = `You are an expert tutor creating a high-quality, multiple-choice quiz based on the provided study material.
You output STRICTLY valid JSON with no markdown fences (\`\`\`json) and no conversational text.

Generate exactly ${count} multiple choice questions of ${difficulty} difficulty.
Each question must test real understanding, key facts, concepts, or applications from the document.
Provide 4 plausible options for each question (only 1 strictly correct), the 0-indexed correct_index, and a clear explanation of why that answer is correct.

JSON SCHEMA:
{
  "title": "Quiz Title",
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Clear explanation of why option A is correct and references key details from the content."
    }
  ]
}`

    const userPrompt = `Document Title: ${note_title || 'Untitled Study Note'}\n\nDocument Summary & Content:\n${typeof note_content === 'string' ? note_content : JSON.stringify(note_content, null, 2)}`

    const model = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';

    const requestBody: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
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
      const errorData = await response.text()
      console.error('Groq API Error:', errorData)
      throw new Error(`Groq API returned status ${response.status}`)
    }

    const data: any = await response.json()
    const rawResponse = data.choices[0]?.message?.content || '{}'
    const cleanJson = rawResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleanJson)

    // Ensure proper question IDs
    if (parsed.questions && Array.isArray(parsed.questions)) {
      parsed.questions = parsed.questions.map((q: any, i: number) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${i + 1}`
      }))
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Generate Quiz Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
