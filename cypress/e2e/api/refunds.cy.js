describe("Refunds API", () => {
  // Helper: create a succeeded payment
  function createSucceededPayment() {
    return cy.createPaymentIntent({ amount: 5000 }).then((createRes) => {
      const intentId = createRes.body.id;
      return cy.confirmPaymentIntent(intentId).then(() => {
        return cy
          .pollPaymentIntent(intentId, { timeoutMs: 30000 })
          .then((intent) => {
            if (intent.status !== "succeeded") {
              // Retry once with a new intent if random failure hit
              return createSucceededPayment();
            }
            return cy
              .apiRequest("GET", `/payments/${intentId}`)
              .then((payRes) => {
                return cy.wrap({ intent, payment: payRes.body });
              });
          });
      });
    });
  }

  it("returns 404 for non-existent payment_id", () => {
    cy.apiRequest("POST", "/refunds", {
      body: { payment_id: "pay_doesnotexist", amount: 100 },
      idempotencyKey: `refund-404-${Date.now()}`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.error.code).to.eq("resource_not_found");
    });
  });

  it("creates refund successfully for succeeded payment", () => {
    createSucceededPayment().then(({ payment }) => {
      cy.apiRequest("POST", "/refunds", {
        body: { payment_id: payment.payment_id, amount: 1000 },
        idempotencyKey: `refund-ok-${Date.now()}`,
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.id).to.match(/^re_/);
        expect(res.body.payment_id).to.eq(payment.payment_id);
        expect(res.body.amount).to.eq(1000);
        expect(res.body.status).to.eq("succeeded");
      });
    });
  });

  it("BUG-007: allows refund exceeding captured amount (should fail)", () => {
    createSucceededPayment().then(({ payment }) => {
      cy.apiRequest("POST", "/refunds", {
        body: { payment_id: payment.payment_id, amount: 999999 },
        idempotencyKey: `refund-over-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        // BUG-007: This succeeds when it should return 422
        expect(res.status).to.eq(201); // Documents the bug
        // If fixed: expect(res.status).to.eq(422);
      });
    });
  });

  it("rejects refund with missing payment_id", () => {
    cy.apiRequest("POST", "/refunds", {
      body: { amount: 100 },
      idempotencyKey: `refund-noid-${Date.now()}`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(422);
      expect(res.body.error.code).to.eq("missing_payment_id");
    });
  });

  it("rejects refund with invalid amount", () => {
    cy.apiRequest("POST", "/refunds", {
      body: { payment_id: "pay_xxx", amount: -5 },
      idempotencyKey: `refund-negamt-${Date.now()}`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(422);
    });
  });
});
