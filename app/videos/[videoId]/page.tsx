"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ─── Source Chunk Component ───────────────────────────────────────────────────

function SourceChunk({ chunkId }: { chunkId: Id<"transcriptChunks"> }) {
  const chunks = useQuery(api.chat.getChunksByIds, { chunkIds: [chunkId] });
  if (chunks === undefined) return <p className="text-xs text-gray-500">Loading source...</p>;
  const chunk = chunks[0];
  if (!chunk) return <p className="text-xs text-gray-500">Source not found.</p>;

  // Convert seconds to mm:ss format
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-2 p-3 bg-white border border-gray-200 rounded text-xs text-gray-700">
      <div className="font-semibold mb-1 text-gray-900">
        Segment {chunk.sequence} ({formatTime(chunk.startTime)} – {formatTime(chunk.endTime)})
      </div>
      <p className="whitespace-pre-wrap">{chunk.text}</p>
    </div>
  );
}

// ─── Chat Interface ───────────────────────────────────────────────────────────

export default function VideoPage() {
  const params = useParams();
  const videoId = params.videoId as Id<"videos">;

  const video = useQuery(api.videos.getVideoById, { videoId });
  const messages = useQuery(api.chat.getMessages, { videoId });
  const saveUserMessage = useMutation(api.chat.saveUserMessage);
  const answerQuestion = useAction(api.chat.answerQuestion);

  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<Id<"messages"> | null>(null);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQ = question.trim();
    setQuestion("");
    setIsLoading(true);

    try {
      // 1. Optimistically save user message (appears instantly)
      await saveUserMessage({ videoId, text: currentQ });
      
      // 2. Trigger Gemini action
      await answerQuestion({ videoId, question: currentQ });
    } catch (error) {
      console.error("Chat error:", error);
      alert("Failed to get an answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (video === undefined || messages === undefined) {
    return (
      <main className="max-w-4xl mx-auto p-8 font-sans">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (video === null) {
    return (
      <main className="max-w-4xl mx-auto p-8 font-sans">
        <p className="text-sm text-red-500">Video not found.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans flex flex-col h-screen">
      {/* ── Header ── */}
      <div className="shrink-0 mb-6 flex gap-6 items-start bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-48 aspect-video object-cover rounded bg-gray-100"
        />
        <div className="flex-1">
          <Link
            href={video.folderId ? `/folders/${video.folderId}` : "/"}
            className="text-xs text-gray-500 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold leading-snug line-clamp-2">{video.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{video.description}</p>
          <div className="mt-3">
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
      </div>

      {/* ── Insights Panel (if summarized) ── */}
      {video.status === "completed" && video.summary && (
        <div className="shrink-0 mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl">
          <h2 className="text-sm font-semibold text-blue-900 mb-1">AI Summary</h2>
          <p className="text-sm text-blue-800 leading-relaxed">{video.summary}</p>
          {video.keyIdeas && video.keyIdeas.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">Key Ideas</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                {video.keyIdeas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Ask a question about the video to get started.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex flex-col max-w-[85%] ${
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-3 rounded-xl text-sm whitespace-pre-wrap shadow-sm ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
              
              {/* Source Chunks Toggle */}
              {msg.sender === "assistant" && msg.sourceChunkIds && msg.sourceChunkIds.length > 0 && (
                <div className="mt-2 w-full max-w-sm">
                  <button
                    onClick={() =>
                      setExpandedMessageId(expandedMessageId === msg._id ? null : msg._id)
                    }
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 bg-gray-200/50 px-2 py-1 rounded"
                  >
                    {expandedMessageId === msg._id ? "▼ Hide Sources" : "▶ Show Sources"}
                  </button>
                  {expandedMessageId === msg._id && (
                    <div className="mt-2 space-y-2">
                      {msg.sourceChunkIds.map((id) => (
                        <SourceChunk key={id} chunkId={id} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="mr-auto items-start max-w-[85%]">
            <div className="p-3 bg-white border border-gray-200 text-gray-500 rounded-xl rounded-bl-sm text-sm shadow-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* ── Input Box ── */}
      <form onSubmit={handleSubmit} className="shrink-0 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={video.status !== "completed" ? "Waiting for video to process..." : "Ask a question..."}
          disabled={isLoading || video.status !== "completed"}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim() || video.status !== "completed"}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </main>
  );
}
