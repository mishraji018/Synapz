async function testTranscript(videoId: string) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    const html = await response.text();

    const regex = /"captionTracks":\s*(\[.*?\])/;
    const match = regex.exec(html);

    if (!match) throw new Error("No captionTracks found.");

    const captionTracks = JSON.parse(match[1]);
    let track = captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.includes('en')) || captionTracks[0];

    const baseUrl = track.baseUrl;
    console.log(`URL: ${baseUrl}`);
    
    const xmlResponse = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://www.youtube.com',
        'Referer': videoUrl,
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const xmlText = await xmlResponse.text();
    console.log("XML length:", xmlText.length);
    console.log("XML start:", xmlText.substring(0, 100));

    if (xmlText.length > 0) {
      const textRegex = />([^<]+)</g;
      let transcriptText = "";
      let xmlMatch;
      while ((xmlMatch = textRegex.exec(xmlText)) !== null) {
        const decodedText = xmlMatch[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        transcriptText += decodedText + " ";
      }
      console.log("Transcript extracted!");
      console.log("Length:", transcriptText.trim().length);
      console.log("Start:", transcriptText.trim().substring(0, 100));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testTranscript("jNQXAC9IVRw");
