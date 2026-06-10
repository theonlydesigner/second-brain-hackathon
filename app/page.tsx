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
      className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">New Folder</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            id="folder-name-input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-[15px] text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
          />
          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-50 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm"
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
      className="group flex flex-col gap-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 hover:bg-zinc-900 hover:border-zinc-700 transition-all"
    >
      <div className="w-9 h-9 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50 group-hover:scale-105 transition-transform duration-300">
        <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
      </div>
      <div>
         <p className="font-semibold text-[15px] text-zinc-100 line-clamp-1">{folder.name}</p>
         <p className="text-[13px] text-zinc-500 mt-0.5 font-medium">
           {videoCount} {videoCount === 1 ? "video" : "videos"}
         </p>
      </div>
    </Link>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: Doc<"videos"> }) {
  return (
    <Link href={`/videos/${video._id}`} className="group flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-lg">
      <div className="relative aspect-video bg-zinc-950 overflow-hidden border-b border-zinc-800/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-[15px] leading-snug text-zinc-100 line-clamp-2 group-hover:text-white transition-colors">{video.title}</h3>
        <p className="text-[13px] text-zinc-400 line-clamp-1">{video.description}</p>
        
        <div className="mt-auto pt-3 flex justify-between items-center">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
              video.status === "completed"
                ? "bg-zinc-800 text-zinc-300"
                : video.status === "failed"
                  ? "bg-red-950/50 text-red-400"
                  : video.status === "summarizing"
                    ? "bg-amber-950/50 text-amber-400"
                    : video.status === "queued"
                      ? "bg-purple-950/50 text-purple-400"
                      : "bg-zinc-800/50 text-zinc-400"
            }`}
          >
            {video.status === "summarizing" ? "summarizing…" : video.status === "queued" ? "queued…" : video.status}
          </span>
        </div>
      </div>
    </Link>
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
      // Transition to queued
      await updateVideoStatus({ videoId: convexVideoId, status: "queued" });
      // Trigger the queue
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
    <div className="w-full max-w-[640px] mx-auto mt-6 mb-2">
      <form onSubmit={handleSubmit} className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg hover:shadow-xl focus-within:shadow-xl focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-800/50 transition-all group overflow-hidden">
        <div className="flex items-center justify-center pl-4 pr-2 text-zinc-500">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path><polygon points="10 15 15 12 10 9 10 15"></polygon></svg>
        </div>
        <input
          id="youtube-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube link..."
          className="flex-1 bg-transparent px-2 py-4 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
          disabled={isIngesting}
        />
        <div className="pr-2">
          <button
            type="submit"
            id="ingest-button"
            disabled={isIngesting || !url.trim()}
            className="bg-zinc-100 text-zinc-900 px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-white disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-400 disabled:hover:bg-zinc-800 transition-all shadow-sm"
          >
            {isIngesting ? (
              <div className="flex items-center gap-2">
                 <div className="w-3.5 h-3.5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                 <span>Ingesting</span>
              </div>
            ) : "Ingest"}
          </button>
        </div>
      </form>
      {errorMsg && (
        <div className="mt-3 text-[13px] font-medium text-red-400 flex items-center justify-center gap-1.5 bg-red-950/30 py-1.5 px-3 rounded-lg border border-red-900/50 max-w-fit mx-auto">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {errorMsg}
        </div>
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
    <main className="w-full max-w-[1200px] mx-auto px-6 font-sans flex-1 py-8">
      
      {/* ── Hero section ── */}
      <section className="mb-10 flex flex-col items-center text-center">
         <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-2">
           Unlock your knowledge.
         </h1>
         <p className="text-[15px] text-zinc-400 max-w-lg mx-auto leading-relaxed">
           Ingest YouTube videos, extract semantic insights, and chat across your entire collection instantly.
         </p>
         <IngestForm />
      </section>

      {/* ── Folders section ── */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4 pb-2 border-b border-zinc-800/80">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Folders</h2>
          <button
            id="create-folder-button"
            onClick={() => setShowCreateFolder(true)}
            className="text-[12px] font-medium text-zinc-400 hover:text-zinc-100 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Folder
          </button>
        </div>

        {folders === undefined ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
             {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>)}
          </div>
        ) : folders.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center bg-zinc-900/30">
             <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 shadow-sm rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
             </div>
             <p className="text-[14px] font-medium text-zinc-100 mb-1">No folders yet</p>
             <p className="text-xs text-zinc-500 mb-4 max-w-sm">Create a folder to organize related videos and chat across them.</p>
             <button
               onClick={() => setShowCreateFolder(true)}
               className="text-[13px] font-medium px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 shadow-sm transition-colors text-zinc-100"
             >
               Create Folder
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4 pb-2 border-b border-zinc-800/80">
           <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
             Library
             {unfolderedVideos.length > 0 && <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 align-middle">{unfolderedVideos.length} unorganized</span>}
           </h2>
        </div>

        {allVideos === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
             {[1,2,3,4].map(i => <div key={i} className="aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-2xl"></div>)}
          </div>
        ) : unfolderedVideos.length === 0 && allVideos.length > 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
             <p className="text-[14px] font-medium text-zinc-100">All caught up!</p>
             <p className="text-sm text-zinc-500 mt-1">Every video is neatly organized into folders.</p>
          </div>
        ) : unfolderedVideos.length === 0 ? (
           <div className="py-10 flex flex-col items-center text-center">
             <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center mb-3 border border-zinc-800 shadow-sm">
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
             </div>
             <p className="text-[14px] font-medium text-zinc-100 mb-1">Your library is empty</p>
             <p className="text-xs text-zinc-500">Paste a YouTube URL above to start building your second brain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
