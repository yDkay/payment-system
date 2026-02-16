describe("Create Payment Intent - UI", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("page loads with form visible and no errors", () => {
    cy.contains("Payment Processing System").should("be.visible");
    cy.contains("Create Payment Intent").should("be.visible");
    cy.get("#amount").should("exist");
    cy.get("#currency").should("exist");
    cy.get("#customer_id").should("exist");
    cy.get("#payment_method").should("exist");
  });

  it("shows client-side validation for empty amount", () => {
    cy.get("#amount").clear();
    cy.get("#customer_id").clear().type("cus_test");
    cy.contains("button", "Create Payment Intent").click();
    cy.contains("Amount must be a positive number").should("be.visible");
  });

  it("shows client-side validation for empty customer ID", () => {
    cy.get("#amount").clear().type("25.99");
    cy.get("#customer_id").clear();
    cy.contains("button", "Create Payment Intent").click();
    cy.contains("Customer ID is required").should("be.visible");
  });

  it("creates intent successfully with stubbed API", () => {
    cy.intercept("POST", "**/payment_intents", {
      statusCode: 201,
      body: {
        id: "pi_stub_12345",
        status: "requires_confirmation",
        amount: 2599,
        currency: "USD",
        customer_id: "cus_demo_customer",
        payment_method_id: "pm_fake_visa",
        capture_method: "automatic",
        client_secret: "pi_stub_12345_secret_sample",
        metadata: { orderId: "ORD-STUB" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }).as("createIntent");

    cy.get("#amount").clear().type("25.99");
    cy.contains("button", "Create Payment Intent").click();
    cy.wait("@createIntent");

    // Should switch to status tab and show intent ID
    cy.contains("pi_stub_12345").should("be.visible");
  });

  it("displays API error with stubbed 422", () => {
    cy.intercept("POST", "**/payment_intents", {
      statusCode: 422,
      body: {
        error: {
          type: "validation_error",
          code: "invalid_amount",
          message: "Amount must be a positive number",
          param: "amount",
        },
      },
    }).as("createError");

    cy.get("#amount").clear().type("25.99");
    cy.contains("button", "Create Payment Intent").click();
    cy.wait("@createError");

    // Error should appear in toast or inline
    cy.contains("Amount must be a positive number").should("be.visible");
  });

  it("tab navigation: status and refund tabs disabled initially", () => {
    cy.contains("button", "Payment Status").should("be.disabled");
    cy.contains("button", "Refund").should("be.disabled");
    cy.contains("button", "Create Intent").should("not.be.disabled");
  });

  it("accessibility: form fields have labels", () => {
    cy.get('label[for="amount"]').should("exist");
    cy.get('label[for="currency"]').should("exist");
    cy.get('label[for="customer_id"]').should("exist");
    cy.get('label[for="payment_method"]').should("exist");
    cy.get('label[for="capture_method"]').should("exist");
    cy.get('label[for="order_id"]').should("exist");
  });
});
