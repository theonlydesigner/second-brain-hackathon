import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

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

    // Fetch transcript and oEmbed metadata in parallel — both are server-side
    // so YouTube does not block them via datacenter-IP detection here.
    const [segments, metaRes] = await Promise.all([
      YoutubeTranscript.fetchTranscript(videoId),
      fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      ),
    ]);

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
      message.includes("disabled") || message.includes("No transcripts")
        ? 404
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
