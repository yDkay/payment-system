/**
 * Payment Processing API Server
 * Implements async payment workflow with proper error handling and idempotency
 */

import express from 'express';
import cors from 'cors';
import { store } from './lib/store.js';
import {
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentResult,
  createRefund,
  ValidationError,
  NotFoundError,
  TooEarlyError
} from './lib/payments.js';
import { getProcessingJobs } from './lib/jobs.js';

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'test_key';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        type: 'auth_error',
        code: 'missing_authorization',
        message: 'Authorization header required'
      }
    });
  }
  
  const token = authHeader.substring(7);
  if (token !== API_KEY) {
    return res.status(401).json({
      error: {
        type: 'auth_error',
        code: 'invalid_key',
        message: 'Invalid API key'
      }
    });
  }
  
  next();
}

// Rate limiting middleware
function rateLimit(req, res, next) {
  const clientId = req.ip || 'unknown';
  
  if (!store.checkRateLimit(clientId)) {
    return res.status(429)
      .set({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Window': '60',
        'X-RateLimit-Remaining': '0'
      })
      .json({
        error: {
          type: 'rate_limit_error',
          code: 'too_many_requests',
          message: 'Rate limit exceeded'
        }
      });
  }
  
  next();
}

// Idempotency middleware
function handleIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(409).json({
      error: {
        type: 'invalid_request_error',
        code: 'missing_idempotency_key',
        message: 'Idempotency-Key header is required'
      }
    });
  }
  
  // Check for existing result
  const existingResult = store.getIdempotencyResult(idempotencyKey);
  if (existingResult) {
    return res
      .status(existingResult.status)
      .set(existingResult.headers || {})
      .json(existingResult.body);
  }
  
  req.idempotencyKey = idempotencyKey;
  next();
}

// Error handling middleware
function handleError(error, req, res, next) {
  console.error('Error:', error.message);
  
  if (error instanceof ValidationError) {
    return res.status(422).json({
      error: error.errors[0] // Return first error for simplicity
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        type: 'invalid_request_error',
        code: 'resource_not_found',
        message: error.message
      }
    });
  }
  
  if (error instanceof TooEarlyError) {
    return res.status(425).json({
      error: 'processing'
    });
  }
  
  // Generic server error
  res.status(500).json({
    error: {
      type: 'api_error',
      code: 'internal_error',
      message: 'An internal error occurred'
    }
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Create Payment Intent
app.post('/payment_intents', requireAuth, rateLimit, handleIdempotency, (req, res, next) => {
  try {
    const result = createPaymentIntent(req.body, req.idempotencyKey);
    res
      .status(result.status)
      .set(result.headers)
      .json(result.body);
  } catch (error) {
    next(error);
  }
});

// 2. Confirm Payment Intent
app.patch('/payment_intents/:id/confirm', requireAuth, rateLimit, handleIdempotency, (req, res, next) => {
  try {
    const forceFailure = req.query.force === 'failure';
    const result = confirmPaymentIntent(req.params.id, req.body, req.idempotencyKey, forceFailure);
    res
      .status(result.status)
      .set(result.headers)
      .json(result.body);
  } catch (error) {
    next(error);
  }
});

// 3. Get Payment Intent Status
app.get('/payment_intents/:id', requireAuth, rateLimit, (req, res, next) => {
  try {
    const intent = store.getPaymentIntent(req.params.id);
    if (!intent) {
      throw new NotFoundError('Payment intent not found');
    }
    
    res.json({
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      customer_id: intent.customer_id,
      payment_method_id: intent.payment_method_id,
      capture_method: intent.capture_method,
      client_secret: intent.client_secret,
      metadata: intent.metadata,
      created_at: intent.created_at,
      updated_at: intent.updated_at,
      ...(intent.failure_reason && { failure_reason: intent.failure_reason })
    });
  } catch (error) {
    next(error);
  }
});

// 4. Get Payment Result
app.get('/payments/:intentId', requireAuth, rateLimit, (req, res, next) => {
  try {
    const payment = getPaymentResult(req.params.intentId);
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

// 5. Get Processing Jobs
app.get('/payment_intents/:id/jobs', requireAuth, rateLimit, (req, res, next) => {
  try {
    const jobs = getProcessingJobs(req.params.id);
    res.json({
      payment_intent_id: req.params.id,
      jobs: jobs
    });
  } catch (error) {
    next(error);
  }
});

// 6. Create Refund
app.post('/refunds', requireAuth, rateLimit, handleIdempotency, (req, res, next) => {
  try {
    const result = createRefund(req.body, req.idempotencyKey);
    res
      .status(result.status)
      .set(result.headers)
      .json(result.body);
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      type: 'invalid_request_error',
      code: 'not_found',
      message: 'Endpoint not found'
    }
  });
});

// Error handler (must be last)
app.use(handleError);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Payment API server running on port ${PORT}`);
  console.log(`📝 API Key: ${API_KEY}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Cleanup old data every hour
  setInterval(() => {
    store.cleanup();
  }, 60 * 60 * 1000);
});

export default app;
