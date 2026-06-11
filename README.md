# Second Brain

Turn YouTube videos into a searchable AI knowledge base.

---

## The Problem

You watch hundreds of hours of YouTube — lectures, interviews, startup advice, deep dives. A week later, you can barely recall what was in them.

The problem is not access to information. It is retrieval.

Second Brain converts passive consumption into a personal knowledge system you can actually query.

---

## What It Does

**Save a video** — paste any YouTube URL and Second Brain extracts the transcript, chunks it, and stores it.

**Generate insights** — every video gets an AI-generated summary, key ideas, mental models, and notable quotes.

**Chat with a video** — ask questions about a specific video and get answers with timestamp citations showing exactly where in the video the answer came from.

**Organize into folders** — group related videos into knowledge folders (e.g. "Startups", "Machine Learning", "Investing").

**Chat across folders** — ask questions that span your entire library and get synthesized answers sourced from multiple videos at once.

Instead of:
> "I remember hearing something about this once..."

You can ask:
> "What did all my startup videos say about hiring engineers?"

And get an answer in seconds, with sources.

---

## Features

- YouTube transcript extraction and automatic chunking
- AI-powered summarization (summary, key ideas, mental models, quotes)
- RAG-powered chat with source attribution and timestamp references
- Folder organization and cross-folder knowledge discovery
- Multi-video reasoning and knowledge synthesis

---

## Who It Is For

- **Founders and indie hackers** who learn by consuming content
- **Students and researchers** who want their study material to be queryable
- **Knowledge workers** — consultants, PMs, marketers — who process a lot of long-form content
- **Anyone** who has ever rewatched a video just to find one thing they half-remembered

---

## Demo

1. Paste a YouTube URL
2. Transcript is extracted automatically
3. AI generates insights for the video
4. Ask a question — get a timestamped, source-backed answer
5. Add more videos to a folder
6. Ask a question across the entire folder
7. Get synthesized knowledge from multiple sources at once

---

## Tech Stack

> _Update this section with your actual stack_

- **Frontend:** [e.g. Next.js, React]
- **Backend:** [e.g. Node.js, FastAPI]
- **AI:** [e.g. Gemini, OpenAI]
- **Vector DB:** [e.g. Pinecone, Supabase pgvector]
- **Transcript:** [e.g. YouTube Data API, yt-dlp]

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/second-brain.git
cd second-brain

# Install dependencies
npm install

# Add environment variables
cp .env.example .env

# Run locally
npm run dev
```

> _Fill in any additional setup steps specific to your stack_

---

## Roadmap

- [ ] Browser extension for one-click saving
- [ ] Podcast and audio support
- [ ] Mobile app
- [ ] Public knowledge sharing
- [ ] Spaced repetition and review mode

---

## Feedback

This is in active development. If you consume a lot of long-form content and want to try it, reach out — honest feedback is welcome.

---

## License

MIT
