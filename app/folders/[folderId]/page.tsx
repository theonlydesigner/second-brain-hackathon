"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import { useMode } from "../../providers";
import MoveToModal from "../../components/MoveToModal";
import { toast } from "sonner";

// ─── Source Chunk Component ───────────────────────────────────────────────────

function SourceChunk({ chunkId }: { chunkId: Id<"transcriptChunks"> }) {
  const chunks = useQuery(api.chat.getChunksByIds, { chunkIds: [chunkId] });
  if (chunks === undefined) return <div className="mt-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse h-20" />;
  const chunk = chunks[0];
  if (!chunk) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 shadow-sm transition-all hover:shadow-md hover:border-zinc-700">
      <div className="font-medium mb-2 text-zinc-100 flex items-center gap-2">
        <span>Segment {chunk.sequence}</span>
        <span className="text-zinc-500 font-mono text-xs font-normal bg-zinc-800/50 px-1.5 py-0.5 rounded">{formatTime(chunk.startTime)} – {formatTime(chunk.endTime)}</span>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-zinc-400">{chunk.text}</p>
    </div>
  );
}

// ─── Markdown Configuration ────────────────────────────────────────────────────

const markdownComponents = {
  strong: ({ children }: any) => <strong className="font-semibold text-zinc-50">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-zinc-300">{children}</em>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-zinc-300">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-zinc-300">{children}</ol>,
  li: ({ children }: any) => <li className="text-[15px] leading-relaxed">{children}</li>,
  p: ({ children }: any) => <p className="mb-4 last:mb-0 text-zinc-300 leading-relaxed whitespace-pre-wrap">{children}</p>,
  a: ({ children, href }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-zinc-100 underline hover:text-white transition-colors">
      {children}
    </a>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto my-3 font-mono text-[13px] text-zinc-200 leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ children, className }: any) => {
    const isInline = !className || !className.includes("language-");
    if (isInline) {
      return (
        <code className="bg-zinc-800/80 text-zinc-100 px-1.5 py-0.5 rounded font-mono text-[13px] border border-zinc-700/50">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
};

// ─── Assistant Message Component ──────────────────────────────────────────────────

function AssistantMessage({ msg }: { msg: Doc<"messages"> }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className="self-start w-full text-zinc-100 text-[15px] leading-relaxed">
       <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-900 flex items-center justify-center text-[10px] font-bold tracking-wider shadow-sm">AI</div>
          <span className="font-semibold text-[13px] text-zinc-100 tracking-tight">Second Brain</span>
       </div>
       <div className="text-zinc-300 prose prose-sm max-w-none prose-invert">
          <ReactMarkdown components={markdownComponents}>
             {msg.text}
          </ReactMarkdown>
       </div>

       {msg.sourceChunkIds && msg.sourceChunkIds.length > 0 && (
          <div className="mt-5 w-full">
             <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-900/50 hover:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-800/80"
             >
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showSources ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                {showSources ? "Hide Sources" : "Show Sources"}
             </button>
             
             {showSources && (
                <div className="mt-3 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                   {msg.sourceChunkIds.map((id) => (
                      <SourceChunk key={id} chunkId={id} />
                   ))}
                </div>
             )}
          </div>
       )}
    </div>
  );
}

// ─── Video Card Component ─────────────────────────────────────────────────────

function FolderVideoCard({ video, onDelete, onMoveTo }: { video: Doc<"videos">; onDelete: () => void; onMoveTo: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative group flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-lg">
      <Link href={`/videos/${video._id}`} className="flex-1 flex flex-col">
        <div className="relative aspect-video bg-zinc-950 overflow-hidden border-b border-zinc-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
        </div>
        <div className="p-3 flex flex-col flex-1 gap-1.5">
          <h3 className="font-semibold text-[14px] leading-snug text-zinc-100 line-clamp-2 group-hover:text-white transition-colors pr-6">{video.title}</h3>
          
          <div className="mt-auto pt-2 flex justify-between items-center">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
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

      {/* Three Dots Menu */}
      <div className="absolute top-2 right-2 z-10" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="w-6 h-6 rounded bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shadow animate-in fade-in"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-36 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl z-20">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                onMoveTo();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Move To...
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/20 rounded-lg text-left transition-colors cursor-pointer mt-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Interface ───────────────────────────────────────────────────────────

function FolderChat({ folderId, videos }: { folderId: Id<"folders">; videos: Doc<"videos">[] }) {
  const messages = useQuery(api.chat.getMessages, { folderId });
  const saveUserMessage = useMutation(api.chat.saveUserMessage);
  const answerFolderQuestion = useAction(api.chat.answerFolderQuestion);

  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQ = question.trim();
    setQuestion("");
    setIsLoading(true);

    try {
      await saveUserMessage({ folderId, text: currentQ });
      await answerFolderQuestion({ folderId, question: currentQ });
    } catch (error: any) {
      console.error("Folder chat error:", error);
      if (error?.data?.code === "GEMINI_QUOTA_EXHAUSTED") {
        alert("AI quota temporarily exhausted. Please try again later.");
      } else {
        alert("Failed to get an answer. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasCompletedVideos = videos.some((v) => v.status === "completed");

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-6rem)] bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-sm overflow-hidden sticky top-8">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-md z-10">
         <div>
            <h2 className="text-[14px] font-semibold text-zinc-100 flex items-center gap-2">
               <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               Folder Chat
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">Ask questions across all videos in this folder</p>
         </div>
      </div>

      {/* Messages Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scroll-smooth">
        {!messages || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-xs mx-auto">
             <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-800 shadow-sm">
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
             </div>
             <p className="text-[14px] font-medium text-zinc-100 mb-1">Start a conversation</p>
             <p className="text-[13px] text-zinc-500 leading-relaxed">Ask anything to search through transcripts of all the completed videos in this folder.</p>
          </div>
        ) : (
          messages.map((msg: Doc<"messages">) => (
            <div key={msg._id} className="w-full flex flex-col group">
              {msg.sender === "user" ? (
                <div className="self-end max-w-[85%] bg-zinc-900 text-zinc-100 px-4 py-3 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed border border-zinc-800 shadow-sm">
                  {msg.text}
                </div>
              ) : (
                <AssistantMessage msg={msg} />
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="self-start w-full text-zinc-100 text-[15px]">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-900 flex items-center justify-center text-[10px] font-bold tracking-wider shadow-sm">AI</div>
               <span className="font-semibold text-[13px] text-zinc-100 tracking-tight">Second Brain</span>
            </div>
            <div className="flex gap-1.5 items-center h-6 pl-1">
               <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
               <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.15s]" />
               <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-zinc-950 shrink-0 border-t border-zinc-800/80">
        <form onSubmit={handleSubmit} className="relative flex items-end bg-zinc-900/50 border border-zinc-800 rounded-2xl focus-within:bg-zinc-900 focus-within:border-zinc-700 focus-within:shadow-lg transition-all focus-within:ring-2 focus-within:ring-zinc-800/50">
          <textarea
            rows={1}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={!hasCompletedVideos ? "Waiting for videos to process..." : "Ask anything..."}
            disabled={isLoading || !hasCompletedVideos}
            className="flex-1 bg-transparent px-4 py-3.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 resize-none max-h-[120px] overflow-y-auto"
            style={{ minHeight: "52px" }}
          />
          <div className="p-2 shrink-0">
            <button
              type="submit"
              disabled={isLoading || !question.trim() || !hasCompletedVideos}
              className="p-2 rounded-xl text-zinc-900 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Folder Modals ────────────────────────────────────────────────────────────

function RenameFolderModal({
  folderId,
  initialName,
  isOpen,
  onClose,
}: {
  folderId: Id<"folders">;
  initialName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const renameFolder = useMutation(api.folders.renameFolder);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await renameFolder({ folderId, name: name.trim() });
      onClose();
    } catch (err) {
      console.error("Rename folder failed:", err);
      alert("Failed to rename folder.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-zinc-50 mb-4">Rename Folder</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all font-medium"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-50 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteFolderModal({
  folderName,
  isOpen,
  onClose,
  onConfirm,
}: {
  folderName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-900/50 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-zinc-50 mb-1">Delete Folder?</h3>
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
          This will permanently delete the folder <span className="font-semibold text-zinc-300">"{folderName}"</span> and all of its contents:
        </p>
        <ul className="text-xs text-zinc-500 space-y-1 mb-5 pl-4 list-disc">
          <li>all videos</li>
          <li>transcripts</li>
          <li>chats</li>
          <li>summaries</li>
        </ul>
        <p className="text-xs text-red-400/80 mb-5">
          This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-medium rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md"
          >
            Delete Folder
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteVideoConfirmModal({
  title,
  isOpen,
  onClose,
  onConfirm,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-900/50 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-zinc-50 mb-1">Delete Video?</h3>
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-5">
          This will permanently delete <span className="font-semibold text-zinc-300">"{title}"</span>, including transcripts, summaries, and chat history. This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-medium rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Folder Page Component ────────────────────────────────────────────────────

export default function FolderPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.folderId as Id<"folders">;
  const { mode } = useMode();

  const folder = useQuery(api.folders.getFolderById, { folderId });
  const videos = useQuery(api.videos.getVideosByFolder, { folderId });
  const allFolders = useQuery(api.folders.getFolders, { mode });
  
  const deleteFolderMutation = useMutation(api.folders.deleteFolder);
  const deleteVideoMutation = useMutation(api.videos.deleteVideo);
  const moveVideoToFolder = useMutation(api.folders.moveVideoToFolder);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTargetVideo, setDeleteTargetVideo] = useState<Doc<"videos"> | null>(null);
  const [moveTargetVideo, setMoveTargetVideo] = useState<Doc<"videos"> | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (folder && (folder.mode ?? "personal") !== mode) {
      router.push("/");
    }
  }, [folder, mode, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMoveConfirm = async (targetFolderId: Id<"folders"> | undefined) => {
    if (!moveTargetVideo) return;
    try {
      await moveVideoToFolder({ videoId: moveTargetVideo._id, folderId: targetFolderId, mode });
      toast.success(targetFolderId ? "Moved to folder" : "Moved to unorganized");
    } catch (err) {
      console.error("Failed to move video:", err);
      toast.error("Failed to move video.");
    } finally {
      setMoveTargetVideo(null);
    }
  };

  if (folder === undefined || videos === undefined) {
    return (
      <main className="w-full max-w-[1200px] mx-auto p-6 md:p-8 font-sans flex-1">
        <div className="animate-pulse flex flex-col md:flex-row gap-8 mt-8">
           <div className="flex-1 space-y-4">
              <div className="h-8 bg-zinc-900 rounded-lg w-1/3"></div>
              <div className="h-4 bg-zinc-900 rounded-lg w-1/4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                 <div className="h-32 bg-zinc-900 rounded-xl"></div>
                 <div className="h-32 bg-zinc-900 rounded-xl"></div>
              </div>
           </div>
           <div className="w-full md:w-[400px] h-[600px] bg-zinc-900 rounded-2xl"></div>
        </div>
      </main>
    );
  }

  if (folder === null) {
    return (
      <main className="w-full max-w-[1200px] mx-auto p-6 md:p-8 font-sans flex-1 flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 shadow-sm border border-zinc-800">
           <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </div>
        <p className="text-[15px] font-medium text-zinc-100 mb-4">Folder not found</p>
        <Link href="/" className="px-5 py-2.5 bg-zinc-100 text-zinc-900 text-[14px] font-semibold rounded-xl hover:bg-white transition-colors shadow-sm">
          Return Home
        </Link>
      </main>
    );
  }

  const existingVideoIds = new Set(videos.map((v) => v._id as string));

  return (
    <main className="w-full max-w-[1200px] mx-auto p-6 md:p-8 font-sans flex-1">
      <div className="flex flex-col md:flex-row gap-8">
        {/* ── Left Pane: Folder Info & Videos ── */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <Link
              href="/"
              className="text-[12px] font-medium text-zinc-500 hover:text-zinc-300 mb-3 inline-flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Dashboard
            </Link>
            
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
                <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                {folder.name}
              </h1>
              
              <div className="relative mt-1" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-8 h-8 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
                
                {menuOpen && (
                  <div className="absolute left-0 mt-1 w-40 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl z-20">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowRename(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg text-left transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Rename Folder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowDelete(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/20 rounded-lg text-left transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Folder
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-[14px] text-zinc-400 mt-2">
              {videos.length} {videos.length === 1 ? "video" : "videos"} in this folder
            </p>
          </div>

          {videos.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center bg-zinc-900/30">
               <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 shadow-sm rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               </div>
               <p className="text-[14px] font-medium text-zinc-100 mb-1">Folder is empty</p>
               <p className="text-xs text-zinc-500">Go back to the dashboard to ingest videos and move them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map((video) => (
                <FolderVideoCard key={video._id} video={video} onDelete={() => setDeleteTargetVideo(video)} onMoveTo={() => setMoveTargetVideo(video)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right Pane: Chat ── */}
        <div className="w-full md:w-[440px] shrink-0">
          <FolderChat folderId={folderId} videos={videos} />
        </div>
      </div>

      <RenameFolderModal
        folderId={folderId}
        initialName={folder.name}
        isOpen={showRename}
        onClose={() => setShowRename(false)}
      />
      
      <DeleteFolderModal
        folderName={folder.name}
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          try {
            await deleteFolderMutation({ folderId });
            router.push("/");
          } catch (err) {
            console.error("Delete folder failed:", err);
            alert("Failed to delete folder.");
          }
        }}
      />
      
      <DeleteVideoConfirmModal
        title={deleteTargetVideo?.title ?? ""}
        isOpen={!!deleteTargetVideo}
        onClose={() => setDeleteTargetVideo(null)}
        onConfirm={async () => {
          if (!deleteTargetVideo) return;
          try {
            await deleteVideoMutation({ videoId: deleteTargetVideo._id });
            toast.success("Video deleted");
          } catch (err) {
            console.error("Delete video failed:", err);
            toast.error("Failed to delete video.");
          } finally {
            setDeleteTargetVideo(null);
          }
        }}
      />
      
      <MoveToModal
        isOpen={!!moveTargetVideo}
        onClose={() => setMoveTargetVideo(null)}
        folders={allFolders ?? []}
        currentFolderId={moveTargetVideo?.folderId}
        onSelectFolder={handleMoveConfirm}
      />
    </main>
  );
}
