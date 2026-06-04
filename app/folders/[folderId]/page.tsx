"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: Doc<"videos"> }) {
  const removeFromFolder = useMutation(api.folders.removeVideoFromFolder);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeFromFolder({ videoId: video._id });
    } finally {
      setRemoving(false);
    }
  };

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
                : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {video.status}
        </span>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </div>
    </div>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────

function RenameModal({
  folderId,
  currentName,
  onClose,
}: {
  folderId: Id<"folders">;
  currentName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const renameFolder = useMutation(api.folders.renameFolder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await renameFolder({ folderId, name: name.trim() });
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
        <h2 className="text-lg font-semibold mb-4">Rename Folder</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            id="rename-folder-input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Video Modal ──────────────────────────────────────────────────────────

function AddVideoModal({
  folderId,
  existingVideoIds,
  onClose,
}: {
  folderId: Id<"folders">;
  existingVideoIds: Set<string>;
  onClose: () => void;
}) {
  const allVideos = useQuery(api.videos.getVideos);
  const assignVideo = useMutation(api.folders.assignVideoToFolder);
  const [busy, setBusy] = useState<string | null>(null);

  const eligible = allVideos?.filter(
    (v) => !existingVideoIds.has(v._id) && v.status === "completed"
  ) ?? [];

  const handleAdd = async (videoId: Id<"videos">) => {
    setBusy(videoId);
    try {
      await assignVideo({ videoId, folderId });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Add Video to Folder</h2>
        {eligible.length === 0 ? (
          <p className="text-sm text-gray-500">No eligible videos to add.</p>
        ) : (
          <ul className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {eligible.map((video) => (
              <li
                key={video._id}
                className="flex items-center justify-between py-2 gap-3"
              >
                <span className="text-sm line-clamp-1 flex-1">{video.title}</span>
                <button
                  onClick={() => handleAdd(video._id)}
                  disabled={busy === video._id}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50 shrink-0"
                >
                  {busy === video._id ? "Adding…" : "Add"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FolderPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.folderId as Id<"folders">;

  const [showRename, setShowRename] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const folder = useQuery(api.folders.getFolderById, { folderId });
  const videos = useQuery(api.videos.getVideosByFolder, { folderId });
  const deleteFolder = useMutation(api.folders.deleteFolder);

  const handleDelete = async () => {
    if (!confirm("Delete this folder? Videos will be unassigned.")) return;
    setDeleting(true);
    try {
      await deleteFolder({ folderId });
      router.push("/");
    } catch {
      setDeleting(false);
    }
  };

  if (folder === undefined || videos === undefined) {
    return (
      <main className="max-w-5xl mx-auto p-8 font-sans">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (folder === null) {
    return (
      <main className="max-w-5xl mx-auto p-8 font-sans">
        <p className="text-sm text-red-500">Folder not found.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 block">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  const existingVideoIds = new Set(videos.map((v) => v._id as string));

  return (
    <main className="max-w-5xl mx-auto p-8 font-sans">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{folder.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            id="rename-folder-button"
            onClick={() => setShowRename(true)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
          >
            Rename
          </button>
          <button
            id="add-video-button"
            onClick={() => setShowAddVideo(true)}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Video
          </button>
          <button
            id="delete-folder-button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* ── Videos ── */}
      {videos.length === 0 ? (
        <p className="text-sm text-gray-400">
          No videos in this folder yet.{" "}
          <button
            onClick={() => setShowAddVideo(true)}
            className="text-blue-600 hover:underline"
          >
            Add one
          </button>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}

      {showRename && (
        <RenameModal
          folderId={folderId}
          currentName={folder.name}
          onClose={() => setShowRename(false)}
        />
      )}

      {showAddVideo && (
        <AddVideoModal
          folderId={folderId}
          existingVideoIds={existingVideoIds}
          onClose={() => setShowAddVideo(false)}
        />
      )}
    </main>
  );
}
