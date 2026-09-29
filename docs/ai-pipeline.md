# Analysis Pipeline

> Every asset moves through a deterministic pipeline. The stages are real — they reflect actual processing, not UI decoration.

## Pipeline Stages

```
uploaded → analyzing → connecting → ready (or failed)
```

## Step-by-Step

| Step | Stage | What Happens |
|------|-------|-------------|
| 1 | `uploaded` | Browser sends a signed Cloudinary upload (or direct POST in demo mode). EXIF GPS and capture date are extracted with `exifr`. A perceptual hash is computed. |
| 2 | `analyzing` | If Cloudinary is configured, AI Vision runs batched tag recognition using the sustainability taxonomy (9 activities, 9 signals, 5 change types), then generates a caption. Failures are logged — never faked. |
| 3 | `analyzing` | The taxonomy normalizer classifies activity, evidence signals, and change language from the combined filename + caption + tags. |
| 4 | `analyzing` | Location is resolved in priority order: EXIF GPS → project site → unknown. A project location is never presented as GPS data. |
| 5 | `analyzing` | The perceptual hash is compared against existing assets. A similarity score ≥ 0.92 flags a near-duplicate. |
| 6 | `connecting` | **Jev** (via OpenRouter) or the **local policy** returns a structured decision: project choice, activity category, evidence role, graph relation, confidence, and reasoning. |
| 7 | `connecting` | The **application** enforces the review rule. Review is required when ANY of: confidence < 0.75, choice is `needs_review` or `unrelated`, duplicate risk ≥ 0.92, model requests review (probability ≥ 0.55), or Jev disagrees with the local policy. |
| 8 | `ready` | The asset joins the evidence graph or enters the review queue. Graph edges are created with relation type, confidence, and a reasons array. |

## Decision Object

```typescript
{
  source: 'jev' | 'policy',     // Who made the decision
  model: string,                 // Model name or 'impactmesh-policy-v1'
  projectChoice: string,         // Project ID, 'needs_review', or 'unrelated'
  confidence: number,            // 0–1
  requiresReview: boolean,       // App-enforced, not model-decided
  evidenceRole: EvidenceRole,    // cover, before, after, activity_evidence, etc.
  relation: RelationType,        // BELONGS_TO, SHOWS_ACTIVITY, etc.
  activityCategory: string | null,
  reasons: string[],             // Human-readable decision trace
  debug?: {                      // Only present when Jev runs
    respondingModel: string,
    latencyMs: number,
    promptTokens: number,
    completionTokens: number,
    reviewProbability: number,
    policyProjectChoice: string,
    agreedWithPolicy: boolean,
  }
}
```

## Failure Handling

Every failure path resolves to the **policy result** with an appended reason explaining what went wrong. `routeEvidence` never throws — it always returns an `EvidenceDecision`.

| Failure | Result |
|---------|--------|
| No API key | Policy result (silent, expected) |
| Network timeout (10s) | Policy result + "Jev was unavailable (aborted)" |
| Non-2xx response | Policy result + status code in reason |
| Malformed JSON | Policy result + "Malformed JSON in model response" |
| Schema validation fail | Policy result + "Model response failed schema validation" |

The lineage drawer in the UI shows `source: jev` or `source: policy` so a person always knows which path ran.
