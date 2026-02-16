describe("Receipt & Refund - UI", () => {
  const stubIntent = {
    id: "pi_stub_receipt",
    status: "succeeded",
    amount: 2599,
    currency: "USD",
    customer_id: "cus_test",
    payment_method_id: "pm_fake_visa",
    capture_method: "automatic",
    client_secret: "pi_stub_receipt_secret",
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const stubPayment = {
    payment_id: "pay_stub_receipt",
    payment_intent_id: "pi_stub_receipt",
    status: "succeeded",
    captured_amount: 2599,
    auth_code: "ABC123",
    receipt_url: "https://example.com/receipt/pay_stub_receipt",
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    // 1. Stub create -> requires_confirmation
    cy.intercept("POST", "**/payment_intents", {
      statusCode: 201,
      body: { ...stubIntent, status: "requires_confirmation" },
    }).as("create");

    // 2. Stub confirm -> processing
    cy.intercept("PATCH", "**/confirm", {
      statusCode: 202,
      body: { id: stubIntent.id, status: "processing" },
    }).as("confirm");

    // 3. Stub polling -> succeeded (hook polls after confirm)
    cy.intercept("GET", `**/payment_intents/${stubIntent.id}`, {
      statusCode: 200,
      body: stubIntent, // status: "succeeded"
    });

    // 4. Stub payment result
    cy.intercept("GET", `**/payments/${stubIntent.id}`, {
      statusCode: 200,
      body: stubPayment,
    });

    // 5. Stub jobs
    cy.intercept("GET", `**/payment_intents/${stubIntent.id}/jobs`, {
      statusCode: 200,
      body: { payment_intent_id: stubIntent.id, jobs: [] },
    });

    // Drive full flow: create -> confirm -> poll resolves succeeded
    cy.visit("/");
    cy.get("#amount").clear().type("25.99");
    cy.contains("button", "Create Payment Intent").click();
    cy.wait("@create");

    // Confirm to trigger polling (button text is "Confirm Payment")
    cy.contains("button", "Confirm Payment").click();
    cy.wait("@confirm");

    // Wait for polling to resolve and show Succeeded badge
    cy.contains("Succeeded", { timeout: 15000 }).should("be.visible");
  });

  it("shows payment details when succeeded", () => {
    cy.contains("pay_stub_receipt").should("be.visible");
    cy.contains("ABC123").should("be.visible");
  });

  it("refund form submits successfully (stubbed)", () => {
    cy.intercept("POST", "**/refunds", {
      statusCode: 201,
      body: {
        id: "re_stub_001",
        payment_id: "pay_stub_receipt",
        amount: 1000,
        reason: "requested_by_customer",
        status: "succeeded",
        created_at: new Date().toISOString(),
      },
    }).as("refund");

    // Navigate to Refund tab (enabled now that currentPayment is set)
    cy.contains("Refund").click();

    // Refund amount input has id="refund_amount" and type="text"
    cy.get("#refund_amount").clear().type("10.00");
    // Submit button text is "Create Refund"
    cy.contains("button", "Create Refund").click();
    cy.wait("@refund");

    cy.contains("Refund Created").should("be.visible");
    cy.contains("re_stub_001").should("be.visible");
  });

  it("reset button returns to create tab", () => {
    cy.contains("button", "Reset").click();
    cy.contains("Create Payment Intent").should("be.visible");
  });
});
