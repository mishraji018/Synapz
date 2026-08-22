import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractMainContent(html: string): { title: string; content: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  let title = titleMatch ? titleMatch[1].trim() : '';
  // Decode HTML entities in title
  title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // Try to find og:title
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  if (ogTitleMatch) title = ogTitleMatch[1];

  // Remove script, style, nav, footer, header, aside tags
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');

  // Try to extract article or main content
  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  
  let contentHtml = articleMatch ? articleMatch[1] : mainMatch ? mainMatch[1] : cleaned;

  // If no article/main found, try common content divs
  if (!articleMatch && !mainMatch) {
    const contentDivMatch = cleaned.match(/<div[^>]*class=["'][^"']*(content|post|article|entry|story|text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (contentDivMatch) {
      contentHtml = contentDivMatch[2];
    }
  }

  // Convert paragraphs and headings to text with newlines
  let text = contentHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Strip all remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove empty lines and excessive whitespace
  text = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0).join('\n');

  return { title, content: text };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json() as any;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log("Fetching article from:", url);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }

    const html = await response.text();
    const { title, content } = extractMainContent(html);

    if (!content || content.length < 50) {
      throw new Error("Could not extract meaningful content from this URL. The page might be JavaScript-rendered or behind a paywall.");
    }

    // Truncate very long content (max ~30k chars)
    const truncatedContent = content.length > 30000 ? content.substring(0, 30000) + '\n\n[Content truncated...]' : content;

    console.log("Extracted article length:", truncatedContent.length);

    return new Response(JSON.stringify({ 
      title: title || 'Untitled Article', 
      content: truncatedContent,
      url 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Article extraction error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to extract article' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
