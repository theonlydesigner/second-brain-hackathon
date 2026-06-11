# Second Brain

Second Brain is a YouTube-first knowledge base that helps you remember and retrieve things from videos you've already watched.

The idea came from a simple problem:

I consume a lot of long-form content — podcasts, startup interviews, lectures, tutorials — and a few weeks later I remember almost none of the useful details.

I didn't want another bookmarking tool.

I wanted something that could answer:

> "What did that founder say about hiring?"

without making me rewatch a 2-hour podcast.

So I built Second Brain.

---

## What It Does

### Save YouTube Videos

Paste a YouTube URL and Second Brain:

- Extracts the transcript
- Breaks it into timestamped chunks
- Stores everything in a searchable knowledge base

---

### Generate AI Insights

For every video, Gemini generates:

- Summary
- Key ideas
- Mental models
- Notable quotes

This gives a quick overview before diving into the full transcript.

---

### Chat With a Video

Ask questions about a specific video.

Examples:

- What did the speaker say about product-market fit?
- Summarize the hiring advice.
- What mistakes should founders avoid?

Answers include source citations and timestamps so you can verify exactly where the information came from.

One thing I focused heavily on was reducing hallucinations.

If the answer is not present in the transcript, the AI should say that instead of inventing something.

---

### Organize Videos Into Folders

Videos can be grouped into folders such as:

- Startups
- Marketing
- AI
- Investing
- Programming

This makes it easier to build topic-specific knowledge collections.

---

### Chat Across Multiple Videos

This is probably my favourite feature.

Instead of querying a single video, you can ask questions across an entire folder.

Example:

> "What do all these startup videos say about hiring engineers?"

Second Brain searches multiple videos, retrieves relevant transcript sections, and generates a combined answer with sources.

---

## Why I Built It

The internet has made information cheap.

Remembering and finding information later is still hard.

Most of us spend hundreds of hours consuming content but have no system for retrieving it when we actually need it.

Second Brain tries to solve that.

Instead of treating videos as content you watch once and forget, it turns them into something you can search, question and learn from repeatedly.

---

## Why Not Just Use NotebookLM?

It's a fair question.

NotebookLM is great and solves a similar problem.

The difference is that Second Brain is designed around a YouTube-first workflow.

A few things I focused on:

- Timestamp-level citations
- Video-centric knowledge management
- Folder-based knowledge discovery
- Cross-video synthesis
- Fast ingestion directly from YouTube links

The goal isn't to replace NotebookLM.

The goal is to create a lightweight personal knowledge system specifically optimized for video content.

---

## How It Works

1. User submits a YouTube URL
2. Transcript is extracted
3. Transcript is chunked with timestamps
4. Gemini generates insights
5. Chunks are indexed for retrieval
6. User asks questions
7. Relevant chunks are retrieved
8. Gemini answers using only retrieved context
9. Sources are attached to the response

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

- Gemini 2.5 Flash
- Automatic fallback handling for model availability issues

### Retrieval

- Convex Full-Text Search
- Retrieval-Augmented Generation (RAG)

### Transcript Processing

- YouTube transcript extraction
- Timestamped chunking pipeline

---

## Current Limitations

A few things are still on the roadmap.

### Retrieval Is Keyword-Based

Right now retrieval uses full-text search instead of vector embeddings.

That means:

> "recruiting engineers"

may not always match:

> "hiring developers"

even though they mean similar things.

The next major improvement is embedding-based semantic search.

### YouTube Only

The current version focuses entirely on YouTube.

Support for PDFs, articles, podcasts and personal notes is planned in future versions.

---

## Running Locally

Clone the repository:

```bash
git clone <repo-url>
cd second-brain
```

Install dependencies:

```bash
npm install
```

Create environment variables:

```env
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
GEMINI_API_KEY=
```

Run the app:

```bash
npm run dev
```

Run Convex:

```bash
npx convex dev
```

---

## Future Plans

- Semantic search with embeddings
- PDF support
- Podcast support
- Browser extension
- Mobile app
- Personal note ingestion
- Knowledge graph visualization

---

## Built For

Hackathon 2026.

Built by one person over a few days with a simple goal:

> Make information from YouTube actually retrievable after you've watched it.

---