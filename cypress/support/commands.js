/**
 * Custom Cypress commands for Payment System testing
 */

// Generic API request helper with auth + idempotency
Cypress.Commands.add("apiRequest", (method, path, options = {}) => {
  const { body, idempotencyKey, qs, failOnStatusCode = true } = options;
  const apiUrl = Cypress.env("apiUrl");
  const apiKey = Cypress.env("apiKey");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  return cy.request({
    method,
    url: `${apiUrl}${path}`,
    headers,
    body,
    qs,
    failOnStatusCode,
  });
});

// Create a payment intent
Cypress.Commands.add("createPaymentIntent", (payload = {}) => {
  const defaultPayload = {
    amount: 2599,
    currency: "USD",
    customer_id: "cus_cypress_test",
    payment_method_id: "pm_fake_visa",
    capture_method: "automatic",
    metadata: { orderId: `ORD-CY-${Date.now()}` },
  };

  return cy.apiRequest("POST", "/payment_intents", {
    body: { ...defaultPayload, ...payload },
    idempotencyKey: `cy-create-${Cypress._.uniqueId()}-${Date.now()}`,
  });
});

// Confirm a payment intent
Cypress.Commands.add(
  "confirmPaymentIntent",
  (intentId, data = {}, forceFailure = false) => {
    const path = `/payment_intents/${intentId}/confirm${forceFailure ? "?force=failure" : ""}`;
    return cy.apiRequest("PATCH", path, {
      body: data,
      idempotencyKey: `cy-confirm-${Cypress._.uniqueId()}-${Date.now()}`,
    });
  },
);

// Poll payment intent until terminal state
Cypress.Commands.add("pollPaymentIntent", (intentId, options = {}) => {
  const { timeoutMs = 30000, intervalMs = 2000 } = options;
  const startTime = Date.now();

  function poll() {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        `Polling timeout after ${timeoutMs}ms for intent ${intentId}`,
      );
    }

    return cy.apiRequest("GET", `/payment_intents/${intentId}`).then((res) => {
      const status = res.body.status;
      if (status === "succeeded" || status === "failed") {
        return cy.wrap(res.body);
      }
      // Still processing — wait and retry
      return cy.wait(intervalMs).then(() => poll());
    });
  }

  return poll();
});

// Poll jobs until all terminal
Cypress.Commands.add("pollJobs", (intentId, options = {}) => {
  const { timeoutMs = 30000, intervalMs = 2000 } = options;
  const startTime = Date.now();

  function poll() {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        `Jobs polling timeout after ${timeoutMs}ms for intent ${intentId}`,
      );
    }

    return cy
      .apiRequest("GET", `/payment_intents/${intentId}/jobs`)
      .then((res) => {
        const jobs = res.body.jobs;
        const allTerminal =
          jobs.length === 5 &&
          jobs.every((j) => j.status === "completed" || j.status === "failed");
        if (allTerminal) {
          return cy.wrap(jobs);
        }
        return cy.wait(intervalMs).then(() => poll());
      });
  }

  return poll();
});
