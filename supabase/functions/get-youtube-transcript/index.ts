import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { video_id } = await req.json() as any
    console.log("Received video_id:", video_id)

    if (!video_id) {
      return new Response(JSON.stringify({ error: 'Video ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') || Deno.env.get('RAPID_API_KEY');
    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY (or RAPID_API_KEY) environment variable is missing.");
    }

    const videoUrl = `https://www.youtube.com/watch?v=${video_id}`;
    
    // Fetch title from oEmbed API
    let title = 'YouTube Video'
    try {
      const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${videoUrl}&format=json`)
      if (oembedResponse.ok) {
        const oembedData: any = await oembedResponse.json()
        title = oembedData.title || title
      }
    } catch (e) {
      console.error("Failed to fetch title:", e)
    }

    // Call RapidAPI for transcript (omitting lang to auto-fetch available language)
    const rapidApiUrl = `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${video_id}`;
    console.log("Fetching transcript from RapidAPI...");
    
    const rapidApiResponse = await fetch(rapidApiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube-transcriptor.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!rapidApiResponse.ok) {
      const errorText = await rapidApiResponse.text();
      throw new Error(`RapidAPI call failed. Status: ${rapidApiResponse.status}. Response: ${errorText}`);
    }

    const rapidApiData: any = await rapidApiResponse.json();
    
    // Log the exact JSON structure for debugging
    console.log("RapidAPI Raw Response Type:", typeof rapidApiData);
    console.log("RapidAPI Raw Response:", JSON.stringify(rapidApiData).substring(0, 1000));

    // Handle expected API error shapes
    if (rapidApiData && rapidApiData.error) {
      const apiError = rapidApiData.error.toLowerCase();
      if (apiError.includes("not available") || apiError.includes("no captions") || apiError.includes("disabled")) {
        throw new Error("This video doesn't have captions available. Please try a different video.");
      }
      throw new Error(`Transcript API error: ${rapidApiData.error}`);
    }
    
    if (rapidApiData && rapidApiData.message) {
       throw new Error(`Transcript API message: ${rapidApiData.message}`);
    }

    let transcriptText = "";

    if (Array.isArray(rapidApiData) && rapidApiData.length > 0) {
      transcriptText = rapidApiData[0].transcriptionAsText || rapidApiData[0].description || "";
      if (rapidApiData[0].title) {
        title = rapidApiData[0].title;
      }
    }

    if (!transcriptText) {
       console.error("Unrecognized or empty transcript format:", rapidApiData);
       throw new Error("Unexpected response format from transcript API. Please check the logs.");
    }

    console.log("Transcript extracted length:", transcriptText.length);
    console.log("Transcript starts with:", transcriptText.substring(0, 100));

    // Return successful structured data
    return new Response(JSON.stringify({ transcript: transcriptText, title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('YouTube transcript error:', error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
