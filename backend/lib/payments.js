/**
 * Payment processing logic and state machine
 * Handles async payment confirmation and state transitions
 */

import { v4 as uuidv4 } from 'uuid';
import { store } from './store.js';
import { 
  createProcessingJobs, 
  areAllJobsCompleted, 
  wasProcessingSuccessful 
} from './jobs.js';

// Payment Intent statuses
export const PAYMENT_STATUSES = {
  REQUIRES_CONFIRMATION: 'requires_confirmation',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

// Payment method validation
const VALID_PAYMENT_METHODS = [
  'pm_fake_visa',
  'pm_fake_mastercard',
  'pm_fake_amex',
  'pm_fake_discover'
];

// Currency validation (ISO 4217)
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

/**
 * Creates a new payment intent
 */
export function createPaymentIntent(data, idempotencyKey) {
  // Validate required fields
  const validation = validatePaymentIntentData(data);
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }

  const intent = {
    id: `pi_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
    status: PAYMENT_STATUSES.REQUIRES_CONFIRMATION,
    amount: data.amount,
    currency: data.currency,
    customer_id: data.customer_id,
    payment_method_id: data.payment_method_id,
    capture_method: data.capture_method || 'automatic',
    client_secret: `pi_${uuidv4().replace(/-/g, '').substring(0, 16)}_secret_sample`,
    metadata: data.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Store the intent
  store.createPaymentIntent(intent);
  
  // Store idempotency result
  const result = {
    status: 201,
    headers: { Location: `/payment_intents/${intent.id}` },
    body: intent
  };
  store.setIdempotencyResult(idempotencyKey, result);

  return result;
}

/**
 * Confirms a payment intent and starts async processing
 */
export function confirmPaymentIntent(intentId, data = {}, idempotencyKey, forceFailure = false) {
  const intent = store.getPaymentIntent(intentId);
  if (!intent) {
    throw new NotFoundError('Payment intent not found');
  }

  if (intent.status !== PAYMENT_STATUSES.REQUIRES_CONFIRMATION) {
    throw new ValidationError([{
      type: 'invalid_request_error',
      code: 'payment_intent_unexpected_state',
      message: `Payment intent is in '${intent.status}' state, expected 'requires_confirmation'`,
      param: 'status'
    }]);
  }

  // Update payment method if provided
  if (data.payment_method_id) {
    if (!VALID_PAYMENT_METHODS.includes(data.payment_method_id)) {
      throw new ValidationError([{
        type: 'card_error',
        code: 'invalid_payment_method',
        message: 'Invalid payment method',
        param: 'payment_method_id'
      }]);
    }
    intent.payment_method_id = data.payment_method_id;
  }

  // Update to processing status
  const updatedIntent = store.updatePaymentIntent(intentId, {
    status: PAYMENT_STATUSES.PROCESSING,
    updated_at: new Date().toISOString()
  });

  // Start async processing
  startAsyncProcessing(intentId, forceFailure);

  const result = {
    status: 202,
    headers: { 
      Location: `/payment_intents/${intentId}`,
      'Retry-After': '3'
    },
    body: {
      id: intentId,
      status: PAYMENT_STATUSES.PROCESSING
    }
  };

  store.setIdempotencyResult(idempotencyKey, result);
  return result;
}

/**
 * Starts async payment processing with detailed jobs
 */
function startAsyncProcessing(intentId, forceFailure = false) {
  // Create and start processing jobs
  createProcessingJobs(intentId, forceFailure);
  
  // Monitor job completion
  const checkJobsCompletion = setInterval(() => {
    const intent = store.getPaymentIntent(intentId);
    if (!intent || intent.status !== PAYMENT_STATUSES.PROCESSING) {
      clearInterval(checkJobsCompletion);
      return;
    }

    if (areAllJobsCompleted(intentId)) {
      clearInterval(checkJobsCompletion);
      
      const processingSuccessful = wasProcessingSuccessful(intentId);
      
      if (processingSuccessful) {
        // Success: update intent and create payment record
        store.updatePaymentIntent(intentId, {
          status: PAYMENT_STATUSES.SUCCEEDED,
          updated_at: new Date().toISOString()
        });

        const payment = {
          payment_id: `pay_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
          payment_intent_id: intentId,
          status: 'succeeded',
          captured_amount: intent.amount,
          auth_code: generateAuthCode(),
          receipt_url: `https://example.com/receipt/pay_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
          created_at: new Date().toISOString()
        };

        store.createPayment(payment);
        console.log(`✅ Payment ${intentId} succeeded -> ${payment.payment_id}`);
      } else {
        // Failure: update intent status
        store.updatePaymentIntent(intentId, {
          status: PAYMENT_STATUSES.FAILED,
          updated_at: new Date().toISOString(),
          failure_reason: forceFailure ? 'forced_failure' : 'processing_failed'
        });
        console.log(`❌ Payment ${intentId} failed during processing`);
      }
    }
  }, 500); // Check every 500ms
}

/**
 * Gets payment result for a completed intent
 */
export function getPaymentResult(intentId) {
  const intent = store.getPaymentIntent(intentId);
  if (!intent) {
    throw new NotFoundError('Payment intent not found');
  }

  if (intent.status === PAYMENT_STATUSES.PROCESSING) {
    throw new TooEarlyError('Payment is still processing');
  }

  if (intent.status !== PAYMENT_STATUSES.SUCCEEDED) {
    throw new NotFoundError('No payment found for this intent');
  }

  const payment = store.getPaymentByIntentId(intentId);
  if (!payment) {
    throw new NotFoundError('Payment record not found');
  }

  return payment;
}

/**
 * Creates a refund for a payment
 */
export function createRefund(data, idempotencyKey) {
  const validation = validateRefundData(data);
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }

  const payment = store.getPayment(data.payment_id);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status !== 'succeeded') {
    throw new ValidationError([{
      type: 'invalid_request_error',
      code: 'payment_not_succeeded',
      message: 'Payment must be succeeded to refund',
      param: 'payment_id'
    }]);
  }

  const refund = {
    id: `re_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
    payment_id: data.payment_id,
    amount: data.amount,
    reason: data.reason || 'requested_by_customer',
    status: 'succeeded',
    created_at: new Date().toISOString()
  };

  store.createRefund(refund);

  const result = {
    status: 201,
    headers: { Location: `/refunds/${refund.id}` },
    body: refund
  };

  store.setIdempotencyResult(idempotencyKey, result);
  return result;
}

// Validation functions
function validatePaymentIntentData(data) {
  const errors = [];

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push({
      type: 'validation_error',
      code: 'invalid_amount',
      message: 'Amount must be a positive number',
      param: 'amount'
    });
  }

  if (!data.currency || !VALID_CURRENCIES.includes(data.currency)) {
    errors.push({
      type: 'validation_error',
      code: 'invalid_currency',
      message: 'Currency must be ISO 4217',
      param: 'currency'
    });
  }

  if (!data.customer_id || typeof data.customer_id !== 'string') {
    errors.push({
      type: 'validation_error',
      code: 'missing_customer',
      message: 'Customer ID is required',
      param: 'customer_id'
    });
  }

  if (!data.payment_method_id || !VALID_PAYMENT_METHODS.includes(data.payment_method_id)) {
    errors.push({
      type: 'validation_error',
      code: 'invalid_payment_method',
      message: 'Invalid payment method',
      param: 'payment_method_id'
    });
  }

  if (data.capture_method && !['automatic', 'manual'].includes(data.capture_method)) {
    errors.push({
      type: 'validation_error',
      code: 'invalid_capture_method',
      message: 'Capture method must be automatic or manual',
      param: 'capture_method'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateRefundData(data) {
  const errors = [];

  if (!data.payment_id || typeof data.payment_id !== 'string') {
    errors.push({
      type: 'validation_error',
      code: 'missing_payment_id',
      message: 'Payment ID is required',
      param: 'payment_id'
    });
  }

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push({
      type: 'validation_error',
      code: 'invalid_amount',
      message: 'Amount must be a positive number',
      param: 'amount'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper functions
function generateAuthCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Custom error classes
export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class TooEarlyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TooEarlyError';
  }
}
