<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Second Brain Hackathon

## Goal
Build a working hackathon MVP in 7 days.

## Tech Stack
- Next.js 16
- React 19
- TypeScript
- Convex
- Gemini
- shadcn/ui

## Priorities
1. Ship features fast
2. Keep architecture simple
3. Optimize for demo quality
4. Avoid premature abstractions

## Must Have
- Video ingestion
- Folder organization
- Chat history
- Video chat
- Cross-video knowledge discovery

## Do Not Build
- Authentication
- Payments
- Analytics
- Monitoring
- Email systems
- Enterprise architecture
- Microservices

## Coding Rules
- Use App Router
- Use TypeScript everywhere
- Prefer Server Components when possible
- Keep files small
- Avoid overengineering
- Follow latest official docs before implementation

## Before Coding
Always verify APIs and patterns against current official documentation rather than memory.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
