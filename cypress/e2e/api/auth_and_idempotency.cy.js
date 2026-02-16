describe("Auth & Idempotency", () => {
  const apiUrl = Cypress.env("apiUrl");

  describe("Authentication", () => {
    it("rejects request with missing Authorization header (401)", () => {
      cy.request({
        method: "POST",
        url: `${apiUrl}/payment_intents`,
        headers: { "Content-Type": "application/json" },
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
        expect(res.body.error).to.have.property("type", "auth_error");
        expect(res.body.error).to.have.property(
          "code",
          "missing_authorization",
        );
        expect(res.body.error).to.have.property("message");
      });
    });

    it("rejects request with invalid API key (401)", () => {
      cy.request({
        method: "POST",
        url: `${apiUrl}/payment_intents`,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wrong_key_here",
        },
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
        expect(res.body.error).to.have.property("code", "invalid_key");
      });
    });

    it("health endpoint does not require auth", () => {
      cy.request(`${apiUrl}/health`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("status", "ok");
        expect(res.body).to.have.property("timestamp");
      });
    });
  });

  describe("Idempotency", () => {
    it("rejects POST without Idempotency-Key (409 — BUG-003: should be 400)", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: 1000,
          currency: "USD",
          customer_id: "c",
          payment_method_id: "pm_fake_visa",
        },
        failOnStatusCode: false,
        // deliberately no idempotencyKey
      }).then((res) => {
        // Note: BUG-003 documents that this should be 400, not 409
        expect(res.status).to.eq(409);
        expect(res.body.error).to.have.property(
          "code",
          "missing_idempotency_key",
        );
      });
    });

    it("returns cached response on idempotency key replay", () => {
      const idemKey = `idem-cache-test-${Date.now()}`;
      const payload = {
        amount: 5000,
        currency: "EUR",
        customer_id: "cus_idem_test",
        payment_method_id: "pm_fake_visa",
      };

      // First request
      cy.apiRequest("POST", "/payment_intents", {
        body: payload,
        idempotencyKey: idemKey,
      }).then((first) => {
        expect(first.status).to.eq(201);

        // Second request with same key, different body
        cy.apiRequest("POST", "/payment_intents", {
          body: { ...payload, amount: 9999, currency: "GBP" },
          idempotencyKey: idemKey,
        }).then((second) => {
          expect(second.status).to.eq(201);
          // Should return cached response (original data)
          expect(second.body.id).to.eq(first.body.id);
          expect(second.body.amount).to.eq(5000);
          expect(second.body.currency).to.eq("EUR");
        });
      });
    });

    it("rejects PATCH confirm without Idempotency-Key", () => {
      cy.createPaymentIntent().then((res) => {
        const intentId = res.body.id;
        cy.apiRequest("PATCH", `/payment_intents/${intentId}/confirm`, {
          body: {},
          failOnStatusCode: false,
        }).then((confirmRes) => {
          expect(confirmRes.status).to.eq(409);
        });
      });
    });
  });
});
