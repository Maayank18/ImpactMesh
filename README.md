# ImpactMesh

From field media to verifiable impact evidence.

ImpactMesh is an evidence workspace for NGOs and field teams. Photos and videos become a record you can review, search, map, compare, and publish. Every claim in a brief points back to the asset it came from.

## Run it

Node 20 or newer.

```bash
npx pnpm@10.15.0 install
npm run dev
```

`npm run dev` starts the API and the web app together. It uses port 5173 for the app and 8787 for the API, and moves to the next free port if one of those is already taken. The address is printed when the process starts.

The web app proxies `/api` to the API, so the browser does not need a separate address.

Sign in as one of the demo people. There is no password.

| Person | Email | Can |
| --- | --- | --- |
| Asha Mehra | asha@greenyamuna.org | Own the workspace, publish, reset the demo |
| Rohit Kapoor | rohit@greenyamuna.org | Upload, review, write briefs |
| Leela Das | leela@greenyamuna.org | Read only |

The seeded story is the Green Yamuna Collective: a public river project in Delhi, a private Aravalli survey, and a public solar courtyard in Jhajjar. Three assets are waiting in the review queue, including a near-duplicate.

## What works before you add keys

Records live in MongoDB. If `MONGODB_URI` is empty, the API uses MongoDB on `localhost:27017`. If that is not running, it starts an embedded MongoDB in the system temp directory. The Green Yamuna story is seeded the first time the database is empty.

The 3D graph is rendered in the browser with Three.js. It reads evidence from this API. It does not call Mapbox, Cloudinary, or any other vendor to draw the scene. The map uses free CARTO tiles. Photos in the seed are ordinary image URLs. Uploads without Cloudinary are saved under `apps/api/data/uploads`.

Copy `.env.example` to `.env` when you want the optional live services:

- **Cloudinary** — signed uploads, CDN transforms, AI Vision tagging and captions.
- **Jev** (`TYPESAFE_API_KEY`) — bounded decisions for project, activity, review, evidence role, and graph relation. The application still applies the review rule. If Jev and the local policy disagree, the asset waits for a person.
- **Redis** — BullMQ. The worker in `apps/worker` calls back into the API. Without Redis, analysis stays in-process.

Never put the Cloudinary secret or the TypeSafe key in the browser.

## A path through the product

1. Sign in as Asha.
2. Open Review and approve the ITO duplicate, or reject it as the same pile.
3. Open Graph. Show media. Right-click Yamuna River Restoration. Click an edge and read why it exists.
4. Open Map and fly from a location node back to the graph.
5. Open Compare. The Nigambodh pair is a visual comparison, not a measurement.
6. Open the Yamuna brief. Print it. The sources are the assets.
7. Open the public story at `/feed/river-restoration` without using the workspace.

## Layout

```
apps/web        React workspace
apps/api        Express API. MongoDB is the record store.
apps/worker     BullMQ consumer, used when REDIS_URL is set
packages/shared-types
packages/evidence-core   taxonomy, policy, Jev, search, lineage, briefs
packages/graph-engine    graph built from the evidence, not drawn by hand
packages/cloudinary-client
```

The graph is the record. Media, map, comparison, and the brief are other readings of the same assets.
