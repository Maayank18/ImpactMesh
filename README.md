# ImpactMesh

**From field media to verifiable impact evidence.**

ImpactMesh is an evidence workspace for NGOs and field teams. Photos and videos captured in the field become a structured, verifiable record you can review, search, map, compare, and publish. Every claim in an impact brief traces back to the source asset.

[![Live Demo](https://img.shields.io/badge/Live-impact--mesh.vercel.app-00c896?style=for-the-badge)](https://impact-mesh.vercel.app)
[![API](https://img.shields.io/badge/API-impactmesh.onrender.com-5865F2?style=for-the-badge)](https://impactmesh.onrender.com)

---

## Quick Start

**Prerequisites:** Node.js ≥ 20

```bash
# Clone and install
git clone https://github.com/Maayank18/ImpactMesh.git
cd ImpactMesh
npx pnpm@10.15.0 install

# Start both API and web app
npm run dev
```

The dev server starts on **:5173** (web) and **:8787** (API). The web app proxies `/api` to the API automatically — no separate address needed in the browser.

### Demo Accounts

Sign in as a demo person. No password required.

| Person | Email | Role | Capabilities |
|--------|-------|------|-------------|
| 🟢 Asha Mehra | `asha@greenyamuna.org` | Owner | Full workspace control, publish, reset demo |
| 🔵 Rohit Kapoor | `rohit@greenyamuna.org` | Editor | Upload, review, write briefs |
| ⚪ Leela Das | `leela@greenyamuna.org` | Viewer | Read-only access |

The seeded story is the **Green Yamuna Collective**: a public river restoration project in Delhi, a private Aravalli Ridge biodiversity survey, and a public solar courtyard installation in Jhajjar. Three assets wait in the review queue, including a near-duplicate.

---

## Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full system design, data flow, and technology decisions.

### Monorepo Layout

```
ImpactMesh/
├── apps/
│   ├── web/                 React + Vite frontend
│   ├── api/                 Express API server (MongoDB)
│   └── worker/              BullMQ consumer (when Redis is configured)
├── packages/
│   ├── shared-types/        TypeScript interfaces & Zod schemas
│   ├── evidence-core/       Taxonomy, policy, Jev AI, search, lineage, reports
│   ├── graph-engine/        Evidence graph builder (nodes, edges, confidence)
│   └── cloudinary-client/   Signed upload, CDN transforms, AI Vision wrapper
├── docs/                    Architecture decisions and API reference
├── .env.example             Environment variable template
└── pnpm-workspace.yaml      Workspace configuration
```

---

## What Works Without Any API Keys

Everything below runs out of the box with **zero configuration**:

| Feature | How |
|---------|-----|
| **MongoDB** | Auto-detects local MongoDB on `:27017`, or starts an embedded instance |
| **3D Evidence Graph** | Three.js renders in the browser — no vendor API needed |
| **Map** | Free CARTO vector tiles — no Mapbox key |
| **Upload** | Files save locally to `apps/api/data/uploads/` |
| **AI Routing** | Local policy classifies assets by vocabulary matching |
| **Search** | Lexicon-based parser for activity, location, and time ranges |
| **Review Queue** | Full approve/reject workflow |
| **Impact Briefs** | Auto-generated from approved evidence |
| **Demo Data** | Green Yamuna Collective seeds on first empty database |

---

## Optional Integrations

Copy `.env.example` → `.env` and add keys for live services:

### Cloudinary — Media Intelligence

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Enables: signed uploads, CDN delivery, responsive transforms, AI Vision tagging, auto-captions.

### Jev AI — Evidence Routing via OpenRouter

```env
OPENROUTER_API_KEY=sk-or-v1-...
JEV_MODEL=typesafe/jev-router        # configurable model slug
```

Enables: AI-powered classification for project assignment, activity detection, evidence role, graph relation, and confidence scoring. The **application** — not the model — enforces the review rule. When Jev and the local policy disagree, the asset waits for human review.

- Uses structured JSON schema output (no free-text parsing)
- 10-second timeout with automatic policy fallback
- Decision trace shows model, latency, token usage, and agreement status

### Groq — Fast LLM (reserved for future features)

```env
GROQ_API_KEY=gsk_...
```

### Redis — Background Job Queue

```env
REDIS_URL=redis://...
```

Enables: BullMQ job processing via the worker in `apps/worker`. Without Redis, analysis runs in-process within the API.

> ⚠️ **Security:** Never expose `CLOUDINARY_API_SECRET`, `OPENROUTER_API_KEY`, or `GROQ_API_KEY` to the browser.

---

## Walkthrough

1. **Sign in** as Asha (owner persona)
2. **Upload** — Drop images. Watch the pipeline: `uploaded → analyzing → connecting → ready`
3. **Review** — Approve the Yamuna assets, reject the ITO near-duplicate
4. **Graph** — Toggle "Show media". Right-click a project node. Click an edge to read why it exists
5. **Map** — Click a location node to fly there. Navigate back via the graph link
6. **Compare** — Open the Nigambodh before/after pair. Visual change, not a measurement
7. **Report** — Generate or open the Yamuna brief. Every sentence cites its source asset
8. **Publish** — Make a project public, then open `/feed/river-restoration` in a private window

---

## Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | [impact-mesh.vercel.app](https://impact-mesh.vercel.app) |
| Backend | Render | [impactmesh.onrender.com](https://impactmesh.onrender.com) |
| Database | MongoDB Atlas | Free M0 cluster |

### Environment Variables (Backend — Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DB` | | Database name (default: `impactmesh`) |
| `CLOUDINARY_CLOUD_NAME` | | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | | Cloudinary API secret |
| `CLOUDINARY_URL` | | Full Cloudinary URL (alternative to individual keys) |
| `OPENROUTER_API_KEY` | | OpenRouter key for Jev AI routing |
| `JEV_MODEL` | | Model slug (default: `typesafe/jev-router`) |
| `GROQ_API_KEY` | | Groq API key for LLM features |
| `SESSION_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `WORKER_SECRET` | | Worker authentication secret |
| `FRONTEND_URL` | ✅ | Vercel frontend URL (for CORS) |
| `API_URL` | | Backend's own public URL |
| `PORT` | | Server port (default: `8787`) |
| `NODE_ENV` | | `production` or `development` |

---

## API Reference

See **[docs/api.md](./docs/api.md)** for the full endpoint listing.

Base path: `/api/v1`

**Key endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth/login` | Public | Create session |
| `GET /dashboard` | Signed in | Workspace overview |
| `POST /uploads/signature` | Editor+ | Get Cloudinary signed upload URL |
| `POST /media/register` | Editor+ | Register uploaded asset for analysis |
| `GET /graph` | Signed in | Full evidence graph payload |
| `GET /search?q=` | Signed in | Natural language evidence search |
| `GET /public/projects` | Public | Published project cards |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Zustand, TanStack Query |
| 3D Graph | Three.js via react-force-graph-3d |
| Map | Leaflet + React Leaflet + CARTO tiles |
| Animations | Framer Motion |
| Styling | Tailwind CSS 4 |
| Backend | Express 4, TypeScript, tsx |
| Database | MongoDB (Atlas / local / embedded) |
| Media | Cloudinary SDK v2 |
| AI Routing | OpenRouter (Jev) — structured JSON schema |
| Queue | BullMQ + Redis (optional) |
| Monorepo | pnpm workspaces |
| Deploy | Vercel (frontend) + Render (backend) |

---

## License

MIT — see [LICENSE](./LICENSE)
