describe("Confirm & Jobs - UI", () => {
  const stubIntent = {
    id: "pi_stub_confirm",
    status: "requires_confirmation",
    amount: 2599,
    currency: "USD",
    customer_id: "cus_test",
    payment_method_id: "pm_fake_visa",
    capture_method: "automatic",
    client_secret: "pi_stub_confirm_secret",
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const stubJobs = [
    {
      id: "j1",
      type: "anti_fraud",
      name: "Anti-Fraud Check",
      status: "completed",
      order: 1,
    },
    {
      id: "j2",
      type: "authorization",
      name: "Payment Authorization",
      status: "processing",
      order: 2,
    },
    {
      id: "j3",
      type: "risk_assessment",
      name: "Risk Assessment",
      status: "pending",
      order: 3,
    },
    {
      id: "j4",
      type: "compliance_check",
      name: "Compliance Verification",
      status: "pending",
      order: 4,
    },
    {
      id: "j5",
      type: "capture",
      name: "Payment Capture",
      status: "pending",
      order: 5,
    },
  ];

  beforeEach(() => {
    cy.intercept("POST", "**/payment_intents", {
      statusCode: 201,
      body: stubIntent,
    }).as("create");

    cy.visit("/");
    cy.get("#amount").clear().type("25.99");
    cy.contains("button", "Create Payment Intent").click();
    cy.wait("@create");
  });

  it("shows requires_confirmation status and confirm button", () => {
    // UI renders "Requires Confirmation" (formatted), not the raw enum
    cy.contains("Requires Confirmation").should("be.visible");
    // Button text is "Confirm Payment"
    cy.contains("button", "Confirm Payment").should("be.visible");
  });

  it("confirm triggers processing and shows jobs", () => {
    cy.intercept("PATCH", "**/confirm", {
      statusCode: 202,
      body: { id: "pi_stub_confirm", status: "processing" },
    }).as("confirm");

    cy.intercept("GET", "**/payment_intents/pi_stub_confirm", {
      statusCode: 200,
      body: { ...stubIntent, status: "processing" },
    });

    cy.intercept("GET", "**/payment_intents/pi_stub_confirm/jobs", {
      statusCode: 200,
      body: { payment_intent_id: "pi_stub_confirm", jobs: stubJobs },
    });

    cy.contains("button", "Confirm Payment").click();
    cy.wait("@confirm");

    cy.contains("Anti-Fraud Check").should("be.visible");
    cy.contains("Payment Authorization").should("be.visible");
    cy.contains("Risk Assessment").should("be.visible");
    cy.contains("Compliance Verification").should("be.visible");
    cy.contains("Payment Capture").should("be.visible");
  });

  it("shows failed status with failure reason (stubbed)", () => {
    cy.intercept("PATCH", "**/confirm", {
      statusCode: 202,
      body: { id: "pi_stub_confirm", status: "processing" },
    }).as("confirm");

    cy.intercept("GET", "**/payment_intents/pi_stub_confirm", {
      statusCode: 200,
      body: {
        ...stubIntent,
        status: "failed",
        failure_reason: "processing_failed",
      },
    });

    cy.intercept("GET", "**/payment_intents/pi_stub_confirm/jobs", {
      statusCode: 200,
      body: {
        payment_intent_id: "pi_stub_confirm",
        jobs: stubJobs.map((j) => ({
          ...j,
          status: j.order === 2 ? "failed" : "completed",
        })),
      },
    });

    cy.contains("button", "Confirm Payment").click();
    cy.wait("@confirm");

    // Badge renders "Failed"
    cy.contains("Failed", { timeout: 10000 }).should("be.visible");
  });
});
