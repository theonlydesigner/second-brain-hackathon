// ─── Types ───────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export interface Chunk {
  sequence: number;
  startTime: number;
  endTime: number;
  text: string;
}

// ─── URL utilities ────────────────────────────────────────────────────────────

/**
 * Extracts the 11-character YouTube video ID from any YouTube URL format.
 * Returns null if the URL is not a recognizable YouTube URL.
 */
export function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/
  );
  return match ? match[1] : null;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

/**
 * Fetches video title, channel name, and thumbnail from YouTube's oEmbed API.
 * This endpoint is NOT blocked by YouTube for datacenter IPs.
 */
export async function fetchYoutubeMetadata(videoId: string): Promise<{
  title: string;
  author: string;
  thumbnailUrl: string;
}> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch video metadata (HTTP ${res.status}). The video may be private or deleted.`
    );
  }

  const data = (await res.json()) as {
    title: string;
    author_name: string;
    thumbnail_url: string;
  };

  return {
    title: data.title,
    author: data.author_name,
    thumbnailUrl: data.thumbnail_url,
  };
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

const CHUNK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const OVERLAP_MS = 30 * 1000;            // 30 seconds

/**
 * Splits raw transcript segments into overlapping 5-minute chunks.
 *
 * Strategy:
 *  - A new chunk closes when its accumulated span reaches CHUNK_DURATION_MS.
 *  - The next chunk starts OVERLAP_MS before the end of the previous one
 *    (backtracking to the nearest segment boundary).
 *  - Any remaining text after the last closed chunk is saved as a final chunk.
 *
 * This keeps every chunk under ~8 KB of text, safely below Convex's 1 MB
 * document size limit even for very long videos.
 */
export function chunkTranscriptSegments(segments: TranscriptSegment[]): Chunk[] {
  if (segments.length === 0) return [];

  const chunks: Chunk[] = [];
  let currentText = "";
  let currentStart = segments[0].offset;
  let sequence = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (currentText === "") {
      currentStart = seg.offset;
    }

    currentText += (currentText ? " " : "") + seg.text;

    const spanMs = seg.offset + seg.duration - currentStart;

    if (spanMs >= CHUNK_DURATION_MS) {
      chunks.push({
        sequence,
        startTime: currentStart,
        endTime: seg.offset + seg.duration,
        text: currentText,
      });
      sequence++;

      // Find the overlap start point
      const overlapStart = seg.offset + seg.duration - OVERLAP_MS;
      let backtrack = i;
      while (backtrack > 0 && segments[backtrack].offset > overlapStart) {
        backtrack--;
      }

      // Seed the next chunk with overlap text
      currentText = "";
      currentStart = segments[backtrack].offset;
      for (let j = backtrack; j <= i; j++) {
        currentText += (currentText ? " " : "") + segments[j].text;
      }
    }
  }

  // Flush remaining text
  if (currentText.trim().length > 0) {
    const last = segments[segments.length - 1];
    chunks.push({
      sequence,
      startTime: currentStart,
      endTime: last.offset + last.duration,
      text: currentText,
    });
  }

  return chunks;
}
