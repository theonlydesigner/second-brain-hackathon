"use client";

import { Id, Doc } from "@/convex/_generated/dataModel";

export default function MoveToModal({
  isOpen,
  onClose,
  onSelectFolder,
  folders,
  currentFolderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: Id<"folders"> | undefined) => void;
  folders: Doc<"folders">[];
  currentFolderId?: Id<"folders">;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-zinc-50 mb-4">Move Video</h2>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => onSelectFolder(undefined)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800/50 bg-zinc-950/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">Unorganized</span>
            </div>
            {currentFolderId === undefined && (
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          
          {folders.map((folder) => (
            <button
              key={folder._id}
              type="button"
              onClick={() => onSelectFolder(folder._id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800/50 bg-zinc-950/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors line-clamp-1">{folder.name}</span>
              </div>
              {currentFolderId === folder._id && (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
