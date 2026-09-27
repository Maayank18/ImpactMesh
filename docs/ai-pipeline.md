# Analysis pipeline

1. The browser asks for a signed Cloudinary upload, or posts the file to the API in demo mode.
2. EXIF GPS and the capture date are read with exifr. Images get an average hash.
3. The asset is marked `analyzing`.
4. If Cloudinary is configured, AI Vision tagging runs in batches of ten definitions, then one general caption prompt. Failures are logged and do not pretend to have returned tags.
5. The sustainability taxonomy normalizes activity, signals, and change language.
6. Location is resolved from GPS, then the project site, then unknown.
7. The hash is compared with assets already in the record.
8. Jev, or the local policy, returns a project choice, activity, evidence role, relation, confidence, and reasons.
9. The application forces review when confidence is under 0.75, the choice is `needs_review` or `unrelated`, the duplicate risk is high, Jev asks for review, or Jev and the policy disagree.
10. The asset is marked `ready` and either joins the graph or waits in the queue.

The decision object stores `source: jev` or `source: policy` and the model name. The lineage drawer shows that chain through to report citation.
