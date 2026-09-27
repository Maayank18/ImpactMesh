# Architecture

Capture, understand, connect, verify, search, explain, publish.

Cloudinary stores and, when the add-on is enabled, reads the media. ImpactMesh keeps the evidence: project, place, activity, review, edges, and the brief. Jev is the decision layer. It does not write captions. A local policy makes the same class of decision when no key is configured, and the interface says which one ran.

The graph engine builds nodes from projects, locations, activities, evidence sets, partners, reports, and — only when asked — media. Rejected assets stay out. Evidence mode keeps the assets cited by a brief.

Search parses activity, place, and time with a lexicon, then ranks captions and tags. It does not pretend to be a vector database. Embedding rows are stored in MongoDB as documents when a model is attached later.

MongoDB is the system of record. The API keeps a process cache of the workspace and flushes writes back to collections, including a sparse 2dsphere index on location points. The 3D graph is a browser scene. Three.js draws it from the graph payload. No vendor API key is involved in that picture.

Location confidence follows a fixed order: EXIF GPS, then the project location, then unknown. A project location is never presented as GPS.

Reports are assembled from approved assets. Organization-reported numbers are stored separately and labeled as such. Print uses the browser. Puppeteer is intentionally not in the default install.
