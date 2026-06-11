# Second Brain

Turn YouTube videos into a searchable personal knowledge system.

---

## The Problem

Most of us consume hours of content every week.

Podcasts, interviews, lectures, startup advice, tutorials, deep dives.

The problem isn't finding information anymore.

The problem is remembering where you heard it.

A useful idea gets buried inside a 2-hour podcast, and a week later you're scrolling through videos trying to find that one moment you vaguely remember.

Second Brain was built to solve that.

Instead of treating YouTube as something you watch once and forget, it turns videos into a knowledge base you can search, organize, and chat with.

---

## What It Does

Paste a YouTube URL.

Second Brain:

- Extracts the transcript
- Splits it into timestamped chunks
- Generates AI insights
- Stores everything in a searchable knowledge base

From there you can:

- Chat with a single video
- Ask questions across multiple videos
- Organize videos into folders
- Discover connections between different sources
- Jump back to the exact transcript segments used to generate an answer

---

## Features

### Transcript Extraction

Paste a YouTube URL and the transcript is automatically extracted and stored.

### AI Insights

Every video receives:

- Summary
- Key ideas
- Mental models
- Notable quotes

### Source-Grounded Chat

Ask questions about a video and get answers based only on its transcript.

Every answer includes sources.

### Timestamp Citations

Answers link back to the exact transcript segments that were used.

You can inspect the evidence instead of blindly trusting the AI.

### Folder Organization

Group related videos together.

Examples:

- Startups
- Machine Learning
- Marketing
- Psychology

### Cross-Video Knowledge Discovery

Ask questions across an entire folder.

Example:

> What do all my startup videos say about hiring engineers?

The system retrieves relevant information from multiple videos and synthesizes a single answer.

### Hallucination Resistance

The goal is not to sound smart.

The goal is to stay faithful to the source material.

For example, when asked:

> What colour are the elephants?

about the famous "Me at the Zoo" video, Second Brain correctly responded that the transcript never mentions the elephants' colour.

Instead of inventing an answer, it admitted the information was unavailable.

---

## Why I Built This

I watch a lot of long-form content.

Startup podcasts.

Interviews.

Lectures.

Technical tutorials.

The same thing kept happening.

I knew I had heard something valuable before, but I couldn't remember where.

I built Second Brain because I wanted YouTube to behave more like a searchable knowledge system and less like an endless feed.

---

## Why Not Just Use NotebookLM?

NotebookLM is probably the closest comparison.

The difference is that Second Brain was designed specifically around YouTube learning.

Instead of treating videos as just another file type, the entire workflow starts with videos.

Some things I focused on:

- YouTube-first experience
- Timestamp-level citations
- AI-generated video insights
- Folder organization
- Cross-video knowledge discovery
- Source-grounded answers

The goal wasn't to compete with every feature NotebookLM has.

The goal was to build a focused tool for people who learn primarily through YouTube.

---

## How It Works

1. User pastes a YouTube URL
2. Transcript is extracted
3. Transcript is chunked with timestamps
4. AI generates insights for the video
5. Chunks are indexed for retrieval
6. User asks a question
7. Relevant transcript chunks are retrieved
8. AI generates an answer using only retrieved context
9. Sources are displayed alongside the answer

---

## Tech Stack

### Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS

### Backend

- Convex

### AI

- OpenRouter
- Multi-model fallback architecture

### Search

- Convex Full-Text Search

### Deployment

- Vercel
- Convex Cloud

---

## Current Limitations

Retrieval currently uses keyword-based full-text search rather than semantic embeddings.

For example:

> hiring engineers

may not always match content that only mentions:

> recruiting developers

This was a deliberate tradeoff during the hackathon to prioritize a complete, reliable end-to-end product.

Semantic search is the next major improvement planned.

---

## Future Improvements

- Semantic search with embeddings
- Browser extension
- Podcast support
- Mobile application
- Knowledge graphs
- Spaced repetition and review mode

---

## Running Locally

```bash
git clone <repo-url>

cd second-brain

npm install

npm run dev
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
OPENROUTER_API_KEY=
```

---

## Demo Flow

1. Paste a YouTube URL
2. Wait for transcript extraction
3. AI generates insights
4. Open the video chat page
5. Ask questions about the video
6. Inspect the cited sources
7. Add videos to a folder
8. Ask questions across the entire folder
9. Discover connections between multiple videos

---

## What I'm Most Proud Of

The system knows when it doesn't know.

During testing, we asked:

> What colour are the elephants?

about the "Me at the Zoo" video.

The transcript never mentions the elephants' colour.

Instead of hallucinating an answer, Second Brain correctly stated that the information wasn't present in the source material and cited the relevant transcript section.

For me, that matters more than generating impressive-sounding responses.

---

## License

MIT