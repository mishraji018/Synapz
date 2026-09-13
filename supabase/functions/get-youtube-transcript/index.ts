import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { sanitizeInput } from '../_shared/validate.ts'

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Rate limiting check (Max 15 requests per 5 minutes per IP)
    const rateLimit = checkRateLimit(req, { maxRequests: 15, windowSeconds: 300 });
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

    let parsedBody: any;
    try {
      parsedBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { video_id } = parsedBody;

    if (!video_id || typeof video_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Video ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate YouTube video ID format (11 characters: [a-zA-Z0-9_-])
    const cleanVideoId = sanitizeInput(video_id);
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(cleanVideoId)) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube Video ID format.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') || Deno.env.get('RAPID_API_KEY');
    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY (or RAPID_API_KEY) environment variable is missing.");
    }

    const videoUrl = `https://www.youtube.com/watch?v=${cleanVideoId}`;
    
    // Fetch title from oEmbed API
    let title = 'YouTube Video';
    try {
      const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${videoUrl}&format=json`);
      if (oembedResponse.ok) {
        const oembedData: any = await oembedResponse.json();
        title = oembedData.title || title;
      }
    } catch (e) {
      console.error("Failed to fetch title:", e);
    }

    // Call RapidAPI for transcript (omitting lang to auto-fetch available language)
    const rapidApiUrl = `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${cleanVideoId}`;
    
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

    // Handle expected API error shapes
    if (rapidApiData && rapidApiData.error) {
      const apiError = String(rapidApiData.error).toLowerCase();
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
       throw new Error("Unexpected response format from transcript API. Please check the logs.");
    }

    // Return successful structured data
    return new Response(JSON.stringify({ transcript: transcriptText, title: sanitizeInput(title) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('YouTube transcript error:', error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

