describe("Payment Intents API", () => {
  describe("Validation", () => {
    it("rejects amount of 0", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: 0,
          currency: "USD",
          customer_id: "c1",
          payment_method_id: "pm_fake_visa",
        },
        idempotencyKey: `val-zero-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(422);
        expect(res.body.error).to.have.property("code", "invalid_amount");
        expect(res.body.error).to.have.property("param", "amount");
      });
    });

    it("rejects negative amount", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: -500,
          currency: "USD",
          customer_id: "c1",
          payment_method_id: "pm_fake_visa",
        },
        idempotencyKey: `val-neg-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(422);
        expect(res.body.error.code).to.eq("invalid_amount");
      });
    });

    it("rejects non-number amount", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: "abc",
          currency: "USD",
          customer_id: "c1",
          payment_method_id: "pm_fake_visa",
        },
        idempotencyKey: `val-str-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(422);
        expect(res.body.error.code).to.eq("invalid_amount");
      });
    });

    it("rejects invalid currency", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: 1000,
          currency: "FAKE",
          customer_id: "c1",
          payment_method_id: "pm_fake_visa",
        },
        idempotencyKey: `val-cur-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(422);
        // BUG-002: Only first validation error returned — may be 'invalid_amount' if amount also bad
        expect(res.body.error).to.have.property("type", "validation_error");
      });
    });

    it("rejects invalid payment method", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: 1000,
          currency: "USD",
          customer_id: "c1",
          payment_method_id: "pm_bad",
        },
        idempotencyKey: `val-pm-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(422);
      });
    });

    it("rejects invalid capture_method", () => {
      cy.apiRequest("POST", "/payment_intents", {
        body: {
          amount: 1000,
          currency: "USD",
          customer_id: "c1",
          payment_method_id: "pm_fake_visa",
          capture_method: "invalid",
        },
        idempotencyKey: `val-cap-${Date.now()}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(422);
      });
    });
  });

  describe("Create + Confirm Flow", () => {
    it("creates intent with 201 and correct schema", () => {
      cy.createPaymentIntent({ amount: 2599 }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.id).to.match(/^pi_/);
        expect(res.body.status).to.eq("requires_confirmation");
        expect(res.body.amount).to.eq(2599);
        expect(res.body.currency).to.eq("USD");
        expect(res.body.client_secret).to.include("secret");
        expect(res.body.created_at).to.be.a("string");
        expect(res.headers).to.have.property("location");
      });
    });

    it("confirms intent and returns 202 processing", () => {
      cy.createPaymentIntent().then((createRes) => {
        cy.confirmPaymentIntent(createRes.body.id).then((confirmRes) => {
          expect(confirmRes.status).to.eq(202);
          expect(confirmRes.body.status).to.eq("processing");
          expect(confirmRes.headers).to.have.property("retry-after", "3");
        });
      });
    });

    it("force failure results in failed terminal state", () => {
      cy.createPaymentIntent().then((createRes) => {
        cy.confirmPaymentIntent(createRes.body.id, {}, true).then(() => {
          cy.pollPaymentIntent(createRes.body.id, { timeoutMs: 30000 }).then(
            (intent) => {
              expect(intent.status).to.eq("failed");
              expect(intent.failure_reason).to.exist;
            },
          );
        });
      });
    });

    it("returns 5 jobs with correct fields after confirm", () => {
      cy.createPaymentIntent().then((createRes) => {
        cy.confirmPaymentIntent(createRes.body.id).then(() => {
          //cy.wait(500); // Brief delay for jobs to be created
          cy.apiRequest(
            "GET",
            `/payment_intents/${createRes.body.id}/jobs`,
          ).then((jobsRes) => {
            expect(jobsRes.body.jobs).to.have.length(5);

            const types = jobsRes.body.jobs.map((j) => j.type).sort();
            expect(types).to.deep.eq([
              "anti_fraud",
              "authorization",
              "capture",
              "compliance_check",
              "risk_assessment",
            ]);

            jobsRes.body.jobs.forEach((job) => {
              expect(job).to.have.property("id");
              expect(job).to.have.property("name");
              expect(job).to.have.property("status");
              expect(job).to.have.property("order");
              expect(job.order).to.be.within(1, 5);
            });
          });
        });
      });
    });

    it("TooEarly 425 response has broken error format (BUG-001)", () => {
      cy.createPaymentIntent().then((createRes) => {
        cy.confirmPaymentIntent(createRes.body.id).then(() => {
          // Immediately request payment result while still processing
          cy.apiRequest("GET", `/payments/${createRes.body.id}`, {
            failOnStatusCode: false,
          }).then((res) => {
            expect(res.status).to.eq(425);
            // BUG-001: This is a bare string, not standard error object
            expect(res.body.error).to.eq("processing");
            // If fixed, this should pass instead:
            // expect(res.body.error).to.have.property('type');
            // expect(res.body.error).to.have.property('code');
          });
        });
      });
    });
  });

  describe("GET Payment Intent", () => {
    it("returns 404 for non-existent intent", () => {
      cy.apiRequest("GET", "/payment_intents/pi_nonexistent", {
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
        expect(res.body.error.code).to.eq("resource_not_found");
      });
    });
  });
});
