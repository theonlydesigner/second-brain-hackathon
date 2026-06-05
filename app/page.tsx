"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { extractYoutubeVideoId, chunkTranscriptSegments } from "@/lib/youtube";
import type { TranscriptResponse } from "./api/transcript/route";

// ─── Create Folder Modal ──────────────────────────────────────────────────────

function CreateFolderModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const createFolder = useMutation(api.folders.createFolder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createFolder({ name: name.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">New Folder</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            id="folder-name-input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="border border-gray-300 rounded px-3 py-2 text-sm text-black"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Folder Card ──────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  videoCount,
}: {
  folder: Doc<"folders">;
  videoCount: number;
}) {
  return (
    <Link
      href={`/folders/${folder._id}`}
      className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all flex flex-col gap-1 bg-white"
    >
      <div className="text-2xl">📁</div>
      <p className="font-medium text-sm line-clamp-1">{folder.name}</p>
      <p className="text-xs text-gray-500">
        {videoCount} {videoCount === 1 ? "video" : "videos"}
      </p>
    </Link>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: Doc<"videos"> }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={video.thumbnailUrl}
        alt={video.title}
        className="w-full aspect-video object-cover rounded"
      />
      <p className="font-medium text-sm line-clamp-2">{video.title}</p>
      <p className="text-xs text-gray-500 line-clamp-1">{video.description}</p>
      <div className="mt-auto flex justify-between items-center">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            video.status === "completed"
              ? "bg-green-100 text-green-800"
              : video.status === "failed"
                ? "bg-red-100 text-red-800"
                : video.status === "summarizing"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {video.status === "summarizing" ? "summarizing…" : video.status}
        </span>
      </div>
    </div>
  );
}

// ─── Ingest Form ──────────────────────────────────────────────────────────────

function IngestForm() {
  const [url, setUrl] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const insertDraftVideo = useMutation(api.videos.insertDraftVideo);
  const insertChunks = useMutation(api.videos.insertChunks);
  const updateVideoStatus = useMutation(api.videos.updateVideoStatus);
  const scheduleSummarization = useMutation(api.videos.scheduleSummarization);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsIngesting(true);
    setErrorMsg(null);
    let convexVideoId: Id<"videos"> | null = null;

    try {
      const youtubeId = extractYoutubeVideoId(url.trim());
      if (!youtubeId) throw new Error("Invalid YouTube URL");

      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: youtubeId }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as TranscriptResponse;
      const { segments, title, author, thumbnailUrl } = data;
      if (!segments?.length) throw new Error("No transcript returned");

      convexVideoId = await insertDraftVideo({
        youtubeId,
        title,
        channelName: author,
        thumbnailUrl,
      });

      const chunks = chunkTranscriptSegments(segments);
      await insertChunks({ videoId: convexVideoId, chunks });
      // Transition to summarizing — "completed" is only set by saveInsights after Gemini finishes
      await updateVideoStatus({ videoId: convexVideoId, status: "summarizing" });
      // Fire summarization asynchronously — browser does not wait for it
      await scheduleSummarization({ videoId: convexVideoId });

      setUrl("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMsg(msg);
      if (convexVideoId) {
        await updateVideoStatus({ videoId: convexVideoId, status: "failed" }).catch(() => {});
      }
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          id="youtube-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube URL to ingest…"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-black"
          disabled={isIngesting}
        />
        <button
          type="submit"
          id="ingest-button"
          disabled={isIngesting || !url.trim()}
          className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {isIngesting ? "Ingesting…" : "Ingest"}
        </button>
      </form>
      {errorMsg && (
        <p className="mt-2 text-xs text-red-600">
          <strong>Error:</strong> {errorMsg}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const folders = useQuery(api.folders.getFolders);
  const allVideos = useQuery(api.videos.getVideos);

  // Build a count map: folderId → video count
  const folderVideoCount = new Map<string, number>();
  if (allVideos) {
    for (const v of allVideos) {
      if (v.folderId) {
        folderVideoCount.set(
          v.folderId,
          (folderVideoCount.get(v.folderId) ?? 0) + 1
        );
      }
    }
  }

  // Unfoldered = videos with no folderId
  const unfolderedVideos = allVideos?.filter((v) => !v.folderId) ?? [];

  return (
    <main className="max-w-5xl mx-auto p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Second Brain</h1>

      <IngestForm />

      {/* ── Folders section ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">Folders</h2>
          <button
            id="create-folder-button"
            onClick={() => setShowCreateFolder(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + New Folder
          </button>
        </div>

        {folders === undefined ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : folders.length === 0 ? (
          <p className="text-sm text-gray-400">No folders yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {folders.map((folder) => (
              <FolderCard
                key={folder._id}
                folder={folder}
                videoCount={folderVideoCount.get(folder._id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Videos section ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Videos{unfolderedVideos.length > 0 ? ` (${unfolderedVideos.length} unorganised)` : ""}
        </h2>

        {allVideos === undefined ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : unfolderedVideos.length === 0 && allVideos.length > 0 ? (
          <p className="text-sm text-gray-400">All videos are in folders.</p>
        ) : unfolderedVideos.length === 0 ? (
          <p className="text-sm text-gray-400">No videos yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {unfolderedVideos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </section>

      {showCreateFolder && (
        <CreateFolderModal onClose={() => setShowCreateFolder(false)} />
      )}
    </main>
  );
}
