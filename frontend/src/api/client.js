/**
 * API client for payment processing backend
 * Handles authentication, request/response formatting, and error handling
 */

import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || 'test_key';

/**
 * Base API client class
 */
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.apiKey = API_KEY;
  }

  /**
   * Makes an HTTP request with proper headers and error handling
   */
  async request(method, endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const { body, idempotencyKey, ...fetchOptions } = options;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...fetchOptions.headers
    };

    // Add idempotency key for POST/PATCH requests
    if ((method === 'POST' || method === 'PATCH') && idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const config = {
      method,
      headers,
      ...fetchOptions
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const responseData = await response.json();

      // Create request info for debugging
      const requestInfo = {
        method,
        url,
        headers,
        body: body ? JSON.stringify(body, null, 2) : undefined,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: JSON.stringify(responseData, null, 2),
        curl: this.generateCurl(method, url, headers, body)
      };

      if (!response.ok) {
        const error = new ApiError(responseData.error || responseData, response.status, requestInfo);
        throw error;
      }

      return {
        data: responseData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        requestInfo
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(
        {
          type: 'network_error',
          code: 'request_failed',
          message: error.message || 'Request failed'
        },
        0,
        {
          method,
          url,
          headers,
          body: body ? JSON.stringify(body, null, 2) : undefined,
          curl: this.generateCurl(method, url, headers, body)
        }
      );
    }
  }

  /**
   * Generates a cURL command for debugging
   */
  generateCurl(method, url, headers, body) {
    let curl = `curl -X ${method} '${url}'`;
    
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });

    if (body) {
      curl += ` \\\n  -d '${JSON.stringify(body)}'`;
    }

    return curl;
  }

  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  async post(endpoint, body, options = {}) {
    return this.request('POST', endpoint, { body, ...options });
  }

  async patch(endpoint, body, options = {}) {
    return this.request('PATCH', endpoint, { body, ...options });
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(errorData, status, requestInfo) {
    super(errorData.message || 'API Error');
    this.name = 'ApiError';
    this.errorData = errorData;
    this.status = status;
    this.requestInfo = requestInfo;
  }

  get type() {
    return this.errorData.type;
  }

  get code() {
    return this.errorData.code;
  }

  get param() {
    return this.errorData.param;
  }
}

/**
 * Payment API methods
 */
export class PaymentApi extends ApiClient {
  /**
   * Creates a new payment intent
   */
  async createPaymentIntent(data) {
    return this.post('/payment_intents', data, {
      idempotencyKey: uuidv4()
    });
  }

  /**
   * Confirms a payment intent
   */
  async confirmPaymentIntent(intentId, data = {}, forceFailure = false) {
    const endpoint = `/payment_intents/${intentId}/confirm${forceFailure ? '?force=failure' : ''}`;
    return this.patch(endpoint, data, {
      idempotencyKey: uuidv4()
    });
  }

  /**
   * Gets payment intent status
   */
  async getPaymentIntent(intentId) {
    return this.get(`/payment_intents/${intentId}`);
  }

  /**
   * Gets processing jobs for a payment intent
   */
  async getProcessingJobs(intentId) {
    return this.get(`/payment_intents/${intentId}/jobs`);
  }

  /**
   * Gets payment result
   */
  async getPaymentResult(intentId) {
    return this.get(`/payments/${intentId}`);
  }

  /**
   * Creates a refund
   */
  async createRefund(data) {
    return this.post('/refunds', data, {
      idempotencyKey: uuidv4()
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.get('/health');
  }
}

// Export singleton instance
export const paymentApi = new PaymentApi();

// Export constants
export const PAYMENT_STATUSES = {
  REQUIRES_CONFIRMATION: 'requires_confirmation',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

export const PAYMENT_METHODS = [
  { id: 'pm_fake_visa', name: 'Visa **** 4242', type: 'card' },
  { id: 'pm_fake_mastercard', name: 'Mastercard **** 5555', type: 'card' },
  { id: 'pm_fake_amex', name: 'Amex **** 0005', type: 'card' },
  { id: 'pm_fake_discover', name: 'Discover **** 6011', type: 'card' }
];

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
];
