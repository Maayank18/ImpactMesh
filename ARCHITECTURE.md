# Architecture

> **Design principle:** Capture → Understand → Connect → Verify → Search → Explain → Publish.  
> Every layer serves this pipeline. Nothing is decorative.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + Vite)                       │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Upload   │ │  Review  │ │  Graph   │ │   Map    │ │  Report  │ │
│  │  (Drop)   │ │  Queue   │ │ (Three)  │ │(Leaflet) │ │ (Brief)  │ │
│  └────┬──────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │             │            │             │            │       │
│       └─────────────┴────────────┴─────────────┴────────────┘       │
│                              │                                      │
│                    fetch('/api/v1/...')                              │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Vercel Rewrites   │  (production only)
                    │   /api/* → Render   │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                     EXPRESS API (apps/api)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Middleware: helmet → CORS → rate-limit → JSON → pino-http   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │  Routes   │ │ Services │ │   Data   │ │  Config  │              │
│  │ (REST)    │ │(pipeline)│ │ (repo)   │ │  (env)   │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│       │             │            │                                   │
│       │        ┌────┴────┐  ┌───┴────┐                             │
│       │        │Cloudinary│  │MongoDB │                             │
│       │        │ Vision   │  │ (Atlas)│                             │
│       │        └─────────┘  └────────┘                             │
│       │                                                             │
│  ┌────┴───────────────────────────────────────────────────────┐    │
│  │              EVIDENCE PIPELINE                              │    │
│  │  EXIF → Vision → Taxonomy → Location → Similarity → Jev    │    │
│  │                                              ↓              │    │
│  │                                     Policy (fallback)       │    │
│  │                                              ↓              │    │
│  │                                   Graph Engine → Edges      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Upload to Evidence

```
  User drops image
        │
        ▼
  ┌──────────────┐     ┌──────────────────┐
  │ Signed Upload │────▶│    Cloudinary     │  CDN storage + transforms
  │  (or direct)  │     │  AI Vision Tags   │  auto-caption, tagging
  └──────┬───────┘     └────────┬─────────┘
         │                      │
         ▼                      ▼
  ┌──────────────────────────────────┐
  │         ANALYSIS PIPELINE         │
  │                                   │
  │  1. EXIF extraction (GPS, date)   │
  │  2. Perceptual hash (similarity)  │
  │  3. AI Vision tags + caption      │
  │  4. Taxonomy classification       │
  │  5. Location resolution           │
  │  6. Duplicate detection           │
  │  7. Jev routing (or policy)       │
  │  8. Review rule enforcement       │
  │  9. Graph edge creation           │
  └──────────────┬───────────────────┘
                 │
                 ▼
  ┌──────────────────────┐
  │    EVIDENCE RECORD    │
  │                       │
  │  • Project assignment │
  │  • Activity category  │
  │  • Evidence role      │
  │  • Confidence score   │
  │  • Graph connections  │
  │  • Review status      │
  └───────────────────────┘
```

---

## Package Architecture

### `packages/shared-types`

TypeScript interfaces and Zod validation schemas shared by all packages and apps. Single source of truth for:
- Entity types (Project, MediaAsset, Location, Activity, etc.)
- Evidence decisions (EvidenceDecision with optional debug trace)
- Graph payload types (GraphNode, GraphLink)
- API request/response schemas

### `packages/evidence-core`

The intelligence layer. Contains:

| Module | Purpose |
|--------|---------|
| `taxonomy.ts` | 9 sustainability activities, 9 evidence signals, 5 change types. Vocabulary-based classification |
| `policy.ts` | Local routing policy. Token-matching + taxonomy scoring. Always available, no API key needed |
| `jev.ts` | OpenRouter integration. Structured JSON schema output. 10s timeout. Silent fallback to policy |
| `search.ts` | Lexicon parser for activity, location, time. Caption + tag ranking |
| `lineage.ts` | Evidence chain builder: upload → analysis → decision → review → publication |
| `report.ts` | Impact brief generator. Every sentence cites its source asset |
| `similarity.ts` | Perceptual hash comparison for near-duplicate detection |
| `geo.ts` | Location resolution: EXIF GPS → project site → unknown |

### `packages/graph-engine`

Builds the evidence graph from entities, not from manual connections:

- **Nodes:** Organization, Project, Location, Activity, Evidence Set, Media, Report, Partner, Tag
- **Edges:** Carry relation type, confidence, and reasons array
- **Modes:** Explore (structural) and Evidence (brief-scoped)
- **Filtering:** Confidence threshold, project scope, media toggle

### `packages/cloudinary-client`

Wraps the Cloudinary SDK:
- Signed upload URL generation
- AI Vision tagging (batched by taxonomy definitions)
- Caption generation
- CDN URL transforms (responsive, format optimization)

---

## AI Decision Architecture

### Two-Path Routing

```
                    routeEvidence(input, apiKey?, model?)
                                  │
                         ┌────────┴────────┐
                    apiKey set?        apiKey empty
                         │                  │
                ┌────────▼────────┐   ┌─────▼──────┐
                │   OpenRouter    │   │   Policy    │
                │   (Jev model)   │   │  (local)    │
                │                 │   │             │
                │ JSON schema     │   │ Token match │
                │ constrained     │   │ + taxonomy  │
                │ response        │   │ scoring     │
                └────────┬────────┘   └─────┬──────┘
                         │                  │
                         ▼                  ▼
                ┌──────────────────────────────┐
                │  App-level review rule        │
                │                               │
                │  requiresReview = ANY of:     │
                │  • confidence < 0.75          │
                │  • choice = needs_review      │
                │  • choice = unrelated         │
                │  • duplicateRisk ≥ 0.92       │
                │  • reviewProbability ≥ 0.55   │
                │  • Jev ≠ policy (disagree)    │
                └──────────────────────────────┘
```

**Key principle:** The model classifies. The application decides review. The person confirms.

### Cost Controls

- **One call per asset** — not per question
- **Structured JSON schema** — no free-text parsing, small completion tokens
- **Low max_tokens** (500) — classification answers are small
- **Temperature 0** — consistency over creativity
- **10s timeout** — abort and fallback, don't hang
- **Silent fallback** — any failure returns the policy result with an explanation

### Decision Trace

When Jev runs successfully, the `EvidenceDecision.debug` field captures:
- Responding model name
- Latency (ms)
- Prompt and completion token counts
- Review probability from the model
- Whether Jev agreed with the local policy

---

## Database Design

MongoDB is the system of record. Collections:

| Collection | Indexes | Purpose |
|------------|---------|---------|
| `users` | `email` (unique) | User accounts and roles |
| `projects` | `organizationId + slug` | Impact projects |
| `media` | `projectId + reviewStatus`, `cloudinaryPublicId` (sparse) | Media assets with decisions |
| `locations` | `geo` (2dsphere, sparse) | Geolocated places |
| `edges` | `sourceId + targetId + relation` | Evidence graph connections |
| `audit` | `createdAt` (descending) | Complete audit trail |

The API maintains an in-process cache of the workspace and flushes writes to MongoDB. This pattern keeps reads fast while ensuring persistence.

---

## Frontend Architecture

```
React 19 + Vite 7 + TypeScript
│
├── stores/          Zustand — workspace state, auth, local previews
├── hooks/           TanStack Query — server state, caching, mutations
├── features/        Page-level components (workspace, graph, upload, etc.)
├── components/      Shared UI (evidence drawer, graph canvas, pills, etc.)
├── lib/             API client, formatters, utilities
└── styles/          Tailwind CSS 4 + glassmorphism system
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Three.js in browser** | No vendor API for the graph. Works offline. |
| **CARTO tiles** | Free map tiles. No Mapbox key needed. |
| **Zustand over Redux** | Simpler, faster, less boilerplate for workspace state |
| **TanStack Query** | Automatic caching, refetching, optimistic updates |
| **Glassmorphism UI** | Premium, modern aesthetic with backdrop blur and transparency |
| **Framer Motion** | Smooth micro-animations for state transitions |

---

## Security

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | JWT tokens via `Authorization: Bearer` header |
| **RBAC** | Owner > Admin > Editor > Viewer role hierarchy |
| **CORS** | Locked to `FRONTEND_URL` + localhost |
| **Rate Limiting** | 400 requests/minute per IP |
| **Helmet** | Security headers including CORP cross-origin |
| **Signed Uploads** | Cloudinary signatures generated server-side |
| **Secrets** | All API keys server-side only, never in browser bundles |

---

## Deployment Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Vercel     │     │     Render       │     │ MongoDB Atlas│
│  (Frontend)  │────▶│   (Backend)      │────▶│  (Database)  │
│              │     │                  │     │              │
│ Static SPA   │     │ Node.js + tsx    │     │ Free M0      │
│ + rewrites   │     │ Express API      │     │ cluster      │
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
              ┌──────▼─────┐   ┌──────▼──────┐
              │ Cloudinary │   │  OpenRouter  │
              │ (Media CDN)│   │  (Jev AI)    │
              └────────────┘   └─────────────┘
```

| Service | Free Tier | Purpose |
|---------|-----------|---------|
| Vercel | ✅ Hobby | Static frontend hosting with rewrites |
| Render | ✅ Free (spins down) | Node.js API server |
| MongoDB Atlas | ✅ M0 Free | 512 MB database |
| Cloudinary | ✅ 25 credits/mo | Media storage + AI Vision |
| OpenRouter | Pay-per-use | Jev AI routing (~$0.001/decision) |

---

## Testing

```bash
# Run all tests
pnpm -r --filter "./packages/**" test

# Type check everything
pnpm -r typecheck

# Build frontend
pnpm --filter @impactmesh/web build
```

Test coverage includes:
- `policy.test.ts` — 12 tests for local routing logic
- `jev.test.ts` — 11 tests covering success, failure, timeout, and fallback paths

---

## Performance Notes

- **Vite HMR** — sub-second hot reload in development
- **Graph rendering** — Three.js with force-directed layout, media nodes lazy-loaded
- **API response** — in-memory workspace cache, MongoDB for persistence
- **Image delivery** — Cloudinary responsive transforms with format auto-negotiation
- **Bundle size** — ~1.9 MB (gzipped ~530 KB), chunked by route

---

## Contributing

1. Fork and clone
2. `npx pnpm@10.15.0 install`
3. `npm run dev`
4. Make changes, run `pnpm -r typecheck`
5. Submit a PR

The graph is the record. Media, map, comparison, and the brief are all readings of the same evidence.
