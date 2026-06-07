# On-Demand Review Translation Design

## Goal

Let users switch CV review results between English and Bahasa Indonesia while keeping LLM token cost low for a non-profitable project.

## Decision

Use on-demand translation with caching.

The initial CV review generates only one language: the language selected in the form. When the user toggles to another language on the result page, the app translates the completed review once, stores the translated result, and reuses it for future toggles.

## Why this approach

- Avoids doubling output tokens for every review.
- Avoids running a second full CV review.
- Charges translation tokens only when a user actually needs another language.
- Keeps UX acceptable with a short loading state on first toggle.
- Preserves scoring consistency because translation cannot change scores or priorities.

## Alternatives considered

### Bilingual one-shot

Generate English and Indonesian in the first LLM call.

- Pro: instant toggle.
- Con: larger output for every review, even if user never toggles.
- Rejected because token cost matters more than instant toggle.

### Labels-only toggle

Change UI labels only, leave review content in original language.

- Pro: no extra tokens.
- Con: does not meet user expectation that review output changes language.
- Rejected because feature would feel incomplete.

### Local templates with issue codes

Ask LLM for structured issue codes and render text locally in both languages.

- Pro: best long-term token efficiency.
- Con: bigger schema redesign and more rigid review tone.
- Deferred until review taxonomy stabilizes.

## Data model

Extend review state:

```ts
type ReviewState = {
  id: string;
  status: ReviewStatus;
  request: AnalyzeRequest;
  result?: CVReviewResult;
  translations?: Partial<Record<ReviewLanguage, CVReviewResult>>;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
```

Rules:

- `result` remains the original review output in `request.language`.
- `translations[language]` stores translated review output.
- Do not store a translation for the original language unless useful for read simplicity.
- Existing review records without `translations` remain valid.

## API

Add route:

```txt
POST /api/cv-reviews/[id]/translate
```

Request:

```json
{ "language": "en" }
```

Response:

```json
{
  "id": "review-id",
  "language": "en",
  "result": { "overallScore": 80 }
}
```

Behavior:

1. Validate review exists.
2. Validate status is `completed`.
3. Validate target language is `en` or `id`.
4. If target language matches original request language, return `result`.
5. If cached translation exists, return cached translation.
6. Otherwise translate existing result and save to `translations[targetLanguage]`.

## Translation prompt

Translation prompt must say:

- Translate text fields only.
- Keep JSON shape identical.
- Keep all numbers identical.
- Keep all `score` values identical.
- Keep all `priority` values identical.
- Keep section keys unchanged.
- Keep arrays same length and same order.
- Do not add new findings.
- Do not remove findings.
- Do not re-review the CV.

This makes translation cheaper and safer than full review.

## UI behavior

Result page language toggle:

- Initial language = `review.request.language`.
- If target language data is already available, switch immediately.
- If not available, show loading state on the selected toggle button.
- Call translation endpoint.
- Store translated result in component state.
- Render translated result after response.
- If translation fails, show inline error and keep current language visible.

Share and back-home buttons remain unchanged.

## Error handling

- Review not found: show existing not-found error behavior.
- Review not completed: return `409` with clear message.
- Invalid language: return `400`.
- Translation provider error: return `502`; UI shows retry-friendly message.
- Cached translation malformed: ignore cache and regenerate once, then overwrite.

## Testing

Run:

```powershell
rtk npm run lint
rtk npm run build
```

Manual checks:

1. Create English review.
2. Open result page.
3. Toggle to Indonesian.
4. Confirm loading appears only first time.
5. Toggle back to English instantly.
6. Toggle to Indonesian again instantly.
7. Confirm scores and priorities do not change.

## Scope limits

- No full review regeneration when toggling language.
- No bilingual one-shot prompt for normal review.
- No local translation dictionary for free-form review text.
- No production analytics added in this change.
