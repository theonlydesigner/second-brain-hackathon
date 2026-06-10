import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export interface TranscriptResponse {
  segments: TranscriptSegment[];
  title: string;
  author: string;
  thumbnailUrl: string;
}

// Helper to fetch and parse fallback transcript from youtube-transcript.ai
async function fetchFallbackTranscript(videoId: string): Promise<TranscriptSegment[]> {
  const url = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Fallback transcript service failed (HTTP ${res.status})`);
  }
  
  const text = await res.text();
  
  // Parse the transcript text
  const lines = text.split("\n");
  const segments: TranscriptSegment[] = [];
  
  let inTranscriptSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "## Transcript") {
      inTranscriptSection = true;
      continue;
    }
    // End section marker
    if (trimmed.startsWith("---") && inTranscriptSection) {
      break;
    }
    
    if (inTranscriptSection && trimmed) {
      // Matches [m:ss], [mm:ss], or [h:mm:ss] e.g., [0:01] or [1:02:03]
      const match = trimmed.match(/^\[(?:(\d+):)?(\d+):(\d{2})\]\s*(.*)$/);
      if (match) {
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const content = match[4].trim();
        
        const offset = ((hours * 60 + minutes) * 60 + seconds) * 1000;
        
        segments.push({
          text: content,
          offset,
          duration: 0, // Will compute below
        });
      }
    }
  }
  
  if (segments.length === 0) {
    throw new Error("No transcript segments could be parsed from fallback service");
  }
  
  // Calculate durations based on the next segment's offset
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].duration = segments[i + 1].offset - segments[i].offset;
  }
  // Set a default duration for the last segment
  segments[segments.length - 1].duration = 5000; // 5 seconds
  
  return segments;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { videoId } = body as { videoId?: string };

    if (!videoId || typeof videoId !== "string" || videoId.length !== 11) {
      return NextResponse.json(
        { error: "videoId must be an 11-character YouTube video ID" },
        { status: 400 }
      );
    }

    // 1. Fetch video metadata via oEmbed (works on cloud datacenter IPs)
    const metaRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!metaRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video metadata (HTTP ${metaRes.status})` },
        { status: metaRes.status }
      );
    }

    const meta = (await metaRes.json()) as {
      title: string;
      author_name: string;
      thumbnail_url: string;
    };

    // 2. Fetch transcript with progressive fallback
    let segments: TranscriptSegment[];
    try {
      console.log(`[Transcript API] Attempting primary fetch for video: ${videoId}`);
      segments = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`[Transcript API] Primary fetch successful. Segments: ${segments.length}`);
    } catch (primaryError) {
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      console.warn(
        `[Transcript API] Primary fetch failed for ${videoId}. Error: ${primaryMsg}. Attempting fallback...`
      );
      
      try {
        segments = await fetchFallbackTranscript(videoId);
        console.log(`[Transcript API] Fallback fetch successful. Segments: ${segments.length}`);
      } catch (fallbackError) {
        const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.error(`[Transcript API] Fallback fetch also failed: ${fallbackMsg}`);
        
        segments = [];
      }
    }

    const response: TranscriptResponse = {
      segments,
      title: meta.title,
      author: meta.author_name,
      thumbnailUrl: meta.thumbnail_url,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/transcript] Error:", message);

    const status =
      message.includes("disabled") || message.includes("No transcripts") || message.includes("No captions")
        ? 404
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

