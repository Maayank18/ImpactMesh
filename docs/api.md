# API

Base path: `/api/v1`

Public:

- `GET /health`
- `POST /auth/login`
- `GET /public/projects`
- `GET /public/projects/:slug`
- `GET /public/projects/:slug/graph`
- `POST /webhooks/cloudinary` (signature required)
- `POST /internal/jobs/analyze` (worker secret)

Signed in:

- `GET /auth/me`
- `GET /dashboard`
- `GET|PATCH /org`, `GET /members`
- `GET|POST /projects`, `GET|PATCH|DELETE /projects/:id`, `POST /projects/:id/publish`, `POST /projects/:id/reports`
- `GET|PATCH|DELETE /media/:id`, `POST /media/:id/approve|reject|reanalyze`, `POST /media/register`
- `POST /uploads/signature`, `POST /uploads/direct`
- `GET /reviews`
- `GET /graph`, `GET /graph/org/:orgId`, `GET /graph/project/:projectId`, `GET /graph/node/:nodeId`
- `GET /search?q=`
- `GET|POST /comparisons`
- `GET /reports`, `GET /reports/:id`, `GET /reports/:id/html`
- `GET /locations`, `GET /locations/nearby?lat&lng&km`
- `GET /audit`, `GET /jobs`
- `POST /admin/reset` (owner, not in production)

Viewers can read. Editors write. Admins edit the organization. Owners can reset the demo.
