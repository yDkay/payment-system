/**
 * Custom hook for managing payment flow state and operations
 */

import React, { useState, useCallback, useRef } from 'react';
import { paymentApi, ApiError, PAYMENT_STATUSES } from '../api/client.js';

export function usePaymentFlow() {
  const [currentIntent, setCurrentIntent] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const pollingRef = useRef(null);

  /**
   * Creates a new payment intent
   */
  const createIntent = useCallback(async (intentData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await paymentApi.createPaymentIntent(intentData);
      setCurrentIntent(response.data);
      setCurrentPayment(null);
      setLastRequest(response.requestInfo);
      return response.data;
    } catch (err) {
      setError(err);
      setLastRequest(err.requestInfo);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Confirms a payment intent
   */
  const confirmIntent = useCallback(async (intentId, confirmData = {}, forceFailure = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await paymentApi.confirmPaymentIntent(intentId, confirmData, forceFailure);
      setCurrentIntent(prev => prev ? { ...prev, status: response.data.status } : null);
      setLastRequest(response.requestInfo);
      
      // Start polling for status updates
      startPolling(intentId);
      
      return response.data;
    } catch (err) {
      setError(err);
      setLastRequest(err.requestInfo);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Gets current payment intent status
   */
  const getIntentStatus = useCallback(async (intentId) => {
    try {
      const response = await paymentApi.getPaymentIntent(intentId);
      setCurrentIntent(response.data);
      setLastRequest(response.requestInfo);
      return response.data;
    } catch (err) {
      setError(err);
      setLastRequest(err.requestInfo);
      throw err;
    }
  }, []);

  /**
   * Gets payment result
   */
  const getPaymentResult = useCallback(async (intentId) => {
    try {
      const response = await paymentApi.getPaymentResult(intentId);
      setCurrentPayment(response.data);
      setLastRequest(response.requestInfo);
      return response.data;
    } catch (err) {
      if (err.status === 425) {
        // Still processing, not an error
        setLastRequest(err.requestInfo);
        return null;
      }
      setError(err);
      setLastRequest(err.requestInfo);
      throw err;
    }
  }, []);

  /**
   * Creates a refund
   */
  const createRefund = useCallback(async (refundData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await paymentApi.createRefund(refundData);
      setLastRequest(response.requestInfo);
      return response.data;
    } catch (err) {
      setError(err);
      setLastRequest(err.requestInfo);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Starts polling for payment status updates
   */
  const startPolling = useCallback((intentId) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    let retryDelay = 3000; // Start with 3 seconds (from Retry-After header)
    let maxRetries = 30; // Maximum 30 retries (1.5 minutes)
    let retryCount = 0;

    const poll = async () => {
      try {
        const intent = await getIntentStatus(intentId);
        
        if (intent.status === PAYMENT_STATUSES.SUCCEEDED) {
          // Try to get payment result
          try {
            await getPaymentResult(intentId);
          } catch (err) {
            // Payment result might not be ready yet, continue polling
            console.log('Payment result not ready yet');
          }
          stopPolling();
        } else if (intent.status === PAYMENT_STATUSES.FAILED) {
          stopPolling();
        } else if (intent.status === PAYMENT_STATUSES.PROCESSING) {
          retryCount++;
          if (retryCount >= maxRetries) {
            stopPolling();
            setError(new Error('Polling timeout: Payment took too long to process'));
          } else {
            // Exponential backoff with jitter
            retryDelay = Math.min(retryDelay * 1.2 + Math.random() * 1000, 10000);
          }
        } else {
          stopPolling();
        }
      } catch (err) {
        retryCount++;
        if (retryCount >= maxRetries) {
          stopPolling();
          setError(err);
        }
      }
    };

    // Start polling
    pollingRef.current = setInterval(poll, retryDelay);
    
    // Also poll immediately
    poll();
  }, [getIntentStatus, getPaymentResult]);

  /**
   * Stops polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Resets the payment flow state
   */
  const reset = useCallback(() => {
    setCurrentIntent(null);
    setCurrentPayment(null);
    setError(null);
    setLastRequest(null);
    stopPolling();
  }, [stopPolling]);

  /**
   * Clears the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // State
    currentIntent,
    currentPayment,
    loading,
    error,
    lastRequest,
    isPolling: pollingRef.current !== null,
    
    // Actions
    createIntent,
    confirmIntent,
    getIntentStatus,
    getPaymentResult,
    createRefund,
    startPolling,
    stopPolling,
    reset,
    clearError
  };
}
