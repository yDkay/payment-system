/**
 * In-memory data store for payment intents, payments, and refunds
 * Uses Maps for fast lookups and maintains idempotency keys
 */

export class PaymentStore {
  constructor() {
    // Core data stores
    this.paymentIntents = new Map();
    this.payments = new Map();
    this.refunds = new Map();
    
    // Idempotency tracking
    this.idempotencyKeys = new Map();
    
    // Rate limiting (simple in-memory counter)
    this.rateLimits = new Map();
  }

  // Payment Intent operations
  createPaymentIntent(intent) {
    this.paymentIntents.set(intent.id, intent);
    return intent;
  }

  getPaymentIntent(id) {
    return this.paymentIntents.get(id);
  }

  updatePaymentIntent(id, updates) {
    const intent = this.paymentIntents.get(id);
    if (!intent) return null;
    
    const updated = { ...intent, ...updates };
    this.paymentIntents.set(id, updated);
    return updated;
  }

  // Payment operations
  createPayment(payment) {
    this.payments.set(payment.payment_id, payment);
    return payment;
  }

  getPayment(paymentId) {
    return this.payments.get(paymentId);
  }

  getPaymentByIntentId(intentId) {
    for (const payment of this.payments.values()) {
      if (payment.payment_intent_id === intentId) {
        return payment;
      }
    }
    return null;
  }

  // Refund operations
  createRefund(refund) {
    this.refunds.set(refund.id, refund);
    return refund;
  }

  getRefund(id) {
    return this.refunds.get(id);
  }

  // Idempotency operations
  setIdempotencyResult(key, result) {
    this.idempotencyKeys.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  getIdempotencyResult(key) {
    const entry = this.idempotencyKeys.get(key);
    if (!entry) return null;
    
    // Expire idempotency keys after 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
      this.idempotencyKeys.delete(key);
      return null;
    }
    
    return entry.result;
  }

  // Rate limiting
  checkRateLimit(clientId, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.rateLimits.has(clientId)) {
      this.rateLimits.set(clientId, []);
    }
    
    const requests = this.rateLimits.get(clientId);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.rateLimits.set(clientId, validRequests);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }

  // Cleanup old data (optional maintenance)
  cleanup() {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    
    // Clean up old idempotency keys
    for (const [key, entry] of this.idempotencyKeys.entries()) {
      if (entry.timestamp < dayAgo) {
        this.idempotencyKeys.delete(key);
      }
    }
  }
}

// Singleton instance
export const store = new PaymentStore();
