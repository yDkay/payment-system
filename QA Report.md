# QA Report — Payment Processing System

**Date:** 2026-02-14
**Repo:** https://github.com/gateless/payment-system

## Bugs Found

I went through the backend and frontend source code and found 10 bugs. Here's what's broken and why it matters.

### BUG-001 — TooEarly error returns the wrong format (Critical)

When you try to fetch payment results while processing is still running, the API returns `{ error: "processing" }` — just a bare string. Every other error in the system returns the standard `{ error: { type, code, message } }` object. This breaks the frontend's `ApiError` parsing, so the user sees a generic "API Error" instead of something useful.

**Where:** `backend/server.js`, `handleError` function
**How to reproduce:** Create intent → confirm → immediately GET `/payments/:intentId`
**Fix:** Return `{ error: { type: 'invalid_request_error', code: 'payment_processing', message: 'Payment is still processing' } }`

**Test that covers it:** `api/payment_intents.cy.js` → "TooEarly 425 returns bare string"

### BUG-002 — Only the first validation error is returned (Major)

If you send a request with multiple bad fields (wrong amount, invalid currency, missing customer ID), the API only tells you about the first one. The rest are silently dropped.

**Where:** `backend/server.js`, `handleError` — `error.errors[0]`
**Fix:** Return `{ errors: [...] }` as an array, or at least document this behavior.

**Test that covers it:** `api/payment_intents.cy.js` — validation tests send one bad field at a time, so they pass. A dedicated test for multi-field validation would expose this.

### BUG-003 — Missing Idempotency-Key returns 409 instead of 400 (Minor)

A missing header is a bad request (400), not a conflict (409). 409 is for when the resource itself is in a conflicting state. Small thing, but it confuses clients trying to handle errors properly.

**Where:** `backend/server.js`, `handleIdempotency` middleware
**Fix:** Change `res.status(409)` to `res.status(400)`.

**Test that covers it:** `api/auth_and_idempotency.cy.js` → "missing Idempotency-Key returns 409"

### BUG-004 — Polling backoff is dead code (Major)

The polling in `usePaymentFlow.js` uses `setInterval(poll, retryDelay)`. The problem is `setInterval` captures the initial delay (3000ms) at creation time. Updating `retryDelay` later does nothing — the interval keeps firing every 3 seconds forever. The exponential backoff math is there but never actually takes effect.

**Where:** `frontend/src/hooks/usePaymentFlow.js`, `startPolling`
**Fix:** Replace `setInterval` with recursive `setTimeout` calls that read the updated delay each time.

### BUG-005 — `isPolling` never triggers re-renders (Major)

`isPolling` is derived from `pollingRef.current !== null`, but `useRef` doesn't cause re-renders when it changes. So any UI element that depends on `isPolling` (spinners, "Processing..." text) won't update.

**Where:** `frontend/src/hooks/usePaymentFlow.js`, return block
**Fix:** Add a separate `useState(false)` for `isPolling` and update it alongside the ref.

### BUG-006 — README doesn't match the actual API (Major)

Several things the docs promise don't exist in the code:

- `GET /health` docs say `{ status: "healthy", version, uptime }` — actual returns `{ status: "ok", timestamp }`
- `POST /refunds` docs say `refund_id` — actual returns `id`
- `POST /refunds` docs list `currency` and `metadata` fields — neither exists
- `GET /payment_intents/:id` docs mention `confirmed_at`, `succeeded_at` — neither is tracked

**Fix:** Update the README to match what the API actually returns.

### BUG-007 — You can refund more than was captured (Critical)

There's no check that the refund amount is less than or equal to the captured amount. You can refund $9999 on a $25 payment and it goes through.

**Where:** `backend/lib/payments.js`, `createRefund` — `validateRefundData` only checks `amount > 0`
**How to reproduce:** `POST /refunds { payment_id: "pay_XXX", amount: 999999 }` on a 2599-cent payment → 201 Created
**Fix:** Add `if (data.amount > payment.captured_amount)` check.

**Test that covers it:** `api/refunds.cy.js` → "overpayment refund is accepted (BUG-007)"

### BUG-008 — No limit on total refunds per payment (Major)

Each refund is stored independently. There's no running total. You can issue 10 refunds of $10 each on a $25.99 payment and they all succeed.

**Where:** `backend/lib/payments.js` + `backend/lib/store.js`
**Fix:** Track cumulative refunded amount per payment and reject when it exceeds captured amount.

### BUG-009 — Idempotency key doesn't check request body (Minor)

If you send the same idempotency key with a completely different request body, you get back the cached response from the first request. No warning, no error.

**Where:** `backend/server.js`, `handleIdempotency` middleware
**How to reproduce:** POST with key "abc" and amount 2599 → then POST with key "abc" and amount 9999 → get back the 2599 response
**Fix:** Hash the request body and return 422 if the body differs for the same key.

### BUG-010 — No `data-testid` attributes anywhere (Minor)

None of the frontend components have `data-testid` attributes. Tests have to rely on `#id` selectors, button text, or CSS classes, which are all fragile and break when the UI changes.

**Fix:** Add `data-testid` to key interactive elements: form inputs, buttons, status badges, job items, tabs.

---

## Test Coverage

I built a Cypress suite with 3 layers:

**API tests** (`cypress/e2e/api/`) — hit the real backend with `cy.request()`. These cover auth, idempotency, validation, the full payment lifecycle, jobs, and refunds. They're fast and deterministic.

**UI tests** (`cypress/e2e/ui/`) — stub all API calls with `cy.intercept()`. These verify the form behavior, status display, job list rendering, and refund flow without needing a running backend.

**E2E smoke tests** (`cypress/e2e/e2e/`) — full stack, real backend. These run the complete create → confirm → poll → refund flow. They handle the 10% random failure rate by accepting both outcomes.

### What's tested and what bugs they hit

| Test file                        | What it covers                                                         | Bugs exposed                |
| -------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| `api/auth_and_idempotency.cy.js` | Missing/invalid auth, missing idempotency key, cached responses        | BUG-003, BUG-009            |
| `api/payment_intents.cy.js`      | Validation, create, confirm, force failure, jobs count, TooEarly error | BUG-001, BUG-002            |
| `api/refunds.cy.js`              | Refund happy path, nonexistent payment, overpayment                    | BUG-007                     |
| `ui/create_intent.cy.js`         | Form loads, client validation, stubbed create, error display, tabs     | —                           |
| `ui/confirm_and_jobs.cy.js`      | Status badge, confirm button, job list, failure display                | —                           |
| `ui/receipt_and_refund.cy.js`    | Payment details, refund form, reset                                    | —                           |
| `e2e/smoke_real_backend.cy.js`   | Full happy path, forced failure, conditional refund, jobs terminal     | All backend bugs indirectly |

---

## Proposed Improvements

These aren't bugs, but they'd make the system more solid:

**Add refund amount validation (BUG-007 + BUG-008).** This is the most important one. Right now there's nothing stopping unlimited refunds. Add a cap against captured amount and track cumulative refunds.

**Fix the polling mechanism (BUG-004 + BUG-005).** Switch from `setInterval` to recursive `setTimeout` so backoff actually works, and add a proper `useState` for `isPolling` so the UI reflects polling state.

**Standardize error responses (BUG-001 + BUG-002).** Every endpoint should return the same error shape. Return all validation errors, not just the first.

**Add `data-testid` attributes (BUG-010).** This makes test automation way more reliable. Key elements that need them: amount input, currency select, customer ID input, payment method select, submit buttons, confirm button, force failure button, status badge, job items, refund amount input, tab buttons, toast container, reset button.

**Update the README (BUG-006).** The docs and the code tell different stories. Pick one and make them match.

**Add request body hashing to idempotency (BUG-009).** Low priority but would prevent subtle bugs where clients accidentally reuse keys.

---

## How to Run

Start the backend and frontend first:

```
cd payment-system && npm run dev:api   # localhost:3001
npm run dev:web                         # localhost:3000
```

Then run the tests:

```
npx cypress run                                              # everything
npx cypress run --spec "cypress/e2e/api/**/*.cy.js"          # API only
npx cypress run --spec "cypress/e2e/ui/**/*.cy.js"           # UI only
npx cypress run --spec "cypress/e2e/e2e/**/*.cy.js"          # E2E only
npx cypress open                                             # interactive GUI
```

If you hit rate limiting (429s), add small waits between API tests or restart the backend. If E2E tests seem flaky, remember the 10% random failure rate is by design — the happy-path test handles both outcomes.
