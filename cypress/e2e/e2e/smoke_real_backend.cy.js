describe("E2E Smoke Tests (Real Backend)", () => {
  // Increase timeout for real async processing
  const POLL_TIMEOUT = 45000;
  const POLL_INTERVAL = 2000;

  it("E2E-TC-01: Happy path — handles both succeeded and failed outcomes", () => {
    // Step 1: Create intent via API
    cy.createPaymentIntent({ amount: 1500 }).then((createRes) => {
      expect(createRes.status).to.eq(201);
      const intentId = createRes.body.id;

      // Step 2: Confirm intent
      cy.confirmPaymentIntent(intentId).then((confirmRes) => {
        expect(confirmRes.status).to.eq(202);

        // Step 3: Poll until terminal
        cy.pollPaymentIntent(intentId, {
          timeoutMs: POLL_TIMEOUT,
          intervalMs: POLL_INTERVAL,
        }).then((intent) => {
          // Step 4: Handle both outcomes
          if (intent.status === "succeeded") {
            cy.log("Payment succeeded");
            cy.apiRequest("GET", `/payments/${intentId}`).then((payRes) => {
              expect(payRes.status).to.eq(200);
              expect(payRes.body).to.have.property("payment_id");
              expect(payRes.body.payment_intent_id).to.eq(intentId);
              expect(payRes.body.captured_amount).to.eq(1500);
              expect(payRes.body).to.have.property("auth_code");
              expect(payRes.body).to.have.property("receipt_url");
            });
          } else {
            cy.log("Payment failed (expected with 10% random failure rate)");
            expect(intent.status).to.eq("failed");
            expect(intent).to.have.property("failure_reason");
          }
        });
      });
    });
  });

  it("E2E-TC-02: Forced failure — deterministic failed outcome", () => {
    cy.createPaymentIntent({ amount: 2000 }).then((createRes) => {
      const intentId = createRes.body.id;

      cy.confirmPaymentIntent(intentId, {}, true).then(() => {
        cy.pollPaymentIntent(intentId, {
          timeoutMs: POLL_TIMEOUT,
          intervalMs: POLL_INTERVAL,
        }).then((intent) => {
          expect(intent.status).to.eq("failed");
          expect(intent.failure_reason).to.exist;
          cy.log(`Failure reason: ${intent.failure_reason}`);
        });
      });
    });
  });

  it("E2E-TC-03: Refund E2E — conditional on success", () => {
    cy.createPaymentIntent({ amount: 3000 }).then((createRes) => {
      const intentId = createRes.body.id;

      cy.confirmPaymentIntent(intentId).then(() => {
        cy.pollPaymentIntent(intentId, {
          timeoutMs: POLL_TIMEOUT,
          intervalMs: POLL_INTERVAL,
        }).then((intent) => {
          if (intent.status === "succeeded") {
            cy.apiRequest("GET", `/payments/${intentId}`).then((payRes) => {
              const paymentId = payRes.body.payment_id;

              cy.apiRequest("POST", "/refunds", {
                body: { payment_id: paymentId, amount: 1000 },
                idempotencyKey: `e2e-refund-${Date.now()}`,
              }).then((refundRes) => {
                expect(refundRes.status).to.eq(201);
                expect(refundRes.body.amount).to.eq(1000);
                expect(refundRes.body.status).to.eq("succeeded");
                cy.log(`Refund created: ${refundRes.body.id}`);
              });
            });
          } else {
            cy.log(
              "SKIPPED: Payment failed, cannot test refund. This is expected ~10% of the time.",
            );
          }
        });
      });
    });
  });

  it("E2E-TC-04: Jobs E2E — all 5 reach terminal status", () => {
    cy.createPaymentIntent({ amount: 2500 }).then((createRes) => {
      const intentId = createRes.body.id;

      cy.confirmPaymentIntent(intentId).then(() => {
        cy.pollJobs(intentId, {
          timeoutMs: POLL_TIMEOUT,
          intervalMs: POLL_INTERVAL,
        }).then((jobs) => {
          expect(jobs).to.have.length(5);

          const types = jobs.map((j) => j.type).sort();
          expect(types).to.deep.eq([
            "anti_fraud",
            "authorization",
            "capture",
            "compliance_check",
            "risk_assessment",
          ]);

          jobs.forEach((job) => {
            expect(["completed", "failed"]).to.include(job.status);
            expect(job).to.have.property("completed_at");
          });

          cy.log(
            `Jobs: ${jobs.map((j) => `${j.type}=${j.status}`).join(", ")}`,
          );
        });
      });
    });
  });
});
