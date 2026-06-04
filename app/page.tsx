"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { extractYoutubeVideoId, chunkTranscriptSegments } from "@/lib/youtube";
import type { TranscriptResponse } from "./api/transcript/route";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Convex mutations — called directly from the browser, no action needed
  const insertDraftVideo = useMutation(api.videos.insertDraftVideo);
  const insertChunks = useMutation(api.videos.insertChunks);
  const updateVideoStatus = useMutation(api.videos.updateVideoStatus);
  const videos = useQuery(api.videos.getVideos);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsIngesting(true);
    setErrorMsg(null);

    let convexVideoId: Id<"videos"> | null = null;

    try {
      // 1. Extract YouTube video ID from URL (runs in browser)
      const youtubeId = extractYoutubeVideoId(url.trim());
      if (!youtubeId) throw new Error("Invalid YouTube URL");

      // 2. Call Next.js route handler for transcript + metadata.
      //    This runs on the Next.js server (good IP reputation with YouTube).
      //    The browser calls it as a relative URL — no localhost/SSRF issue.
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: youtubeId }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status} from transcript API`);
      }

      const data = (await res.json()) as TranscriptResponse;
      const { segments, title, author, thumbnailUrl } = data;

      if (!segments || segments.length === 0) {
        throw new Error("No transcript segments returned from API");
      }

      // 3. Create the video record in Convex (status = "ingesting")
      convexVideoId = await insertDraftVideo({
        youtubeId,
        title,
        channelName: author,
        thumbnailUrl,
      });

      // 4. Chunk the transcript into 5-minute windows (runs in browser)
      const chunks = chunkTranscriptSegments(segments);

      // 5. Persist chunks to Convex
      await insertChunks({ videoId: convexVideoId, chunks });

      // 6. Mark the video as completed
      await updateVideoStatus({ videoId: convexVideoId, status: "completed" });

      setUrl("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Ingestion failed:", msg);
      setErrorMsg(msg);

      // If the video record was already created, mark it failed
      if (convexVideoId) {
        await updateVideoStatus({ videoId: convexVideoId, status: "failed" }).catch(
          () => {} // best-effort
        );
      }
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8">Second Brain MVP</h1>

      <form onSubmit={handleSubmit} className="mb-4 flex gap-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL here…"
          className="flex-1 p-3 border border-gray-300 rounded text-black"
          disabled={isIngesting}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded font-medium disabled:opacity-50"
          disabled={isIngesting || !url.trim()}
        >
          {isIngesting ? "Ingesting…" : "Ingest Video"}
        </button>
      </form>

      {errorMsg && (
        <div className="mb-8 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-6">Your Videos</h2>

      {videos === undefined ? (
        <p>Loading…</p>
      ) : videos.length === 0 ? (
        <p className="text-gray-500">No videos ingested yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video: Doc<"videos">) => (
            <div
              key={video._id}
              className="border p-4 rounded-lg flex flex-col gap-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-auto rounded"
              />
              <h3 className="font-semibold text-lg line-clamp-2">
                {video.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-1">
                {video.description}
              </p>
              <div className="mt-auto pt-4 flex justify-between items-center">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    video.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : video.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {video.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
