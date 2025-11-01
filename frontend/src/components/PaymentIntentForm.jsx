/**
 * Form for creating payment intents
 * Includes validation, currency formatting, and accessibility features
 */

import React, { useState } from 'react';
import { PAYMENT_METHODS, CURRENCIES } from '../api/client.js';

export function PaymentIntentForm({ onSubmit, loading, error }) {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    customer_id: 'cus_demo_customer',
    payment_method_id: 'pm_fake_visa',
    capture_method: 'automatic',
    metadata: {
      orderId: `ORD-${Date.now()}`
    }
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleMetadataChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }));
  };

  const validateForm = () => {
    const errors = {};

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Amount must be a positive number';
    } else if (amount < 0.50) {
      errors.amount = 'Amount must be at least $0.50';
    } else if (amount > 999999.99) {
      errors.amount = 'Amount must be less than $1,000,000';
    }

    // Customer ID validation
    if (!formData.customer_id.trim()) {
      errors.customer_id = 'Customer ID is required';
    }

    // Order ID validation
    if (!formData.metadata.orderId.trim()) {
      errors.orderId = 'Order ID is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Convert amount to cents
    const amountInCents = Math.round(parseFloat(formData.amount) * 100);

    const submitData = {
      ...formData,
      amount: amountInCents
    };

    onSubmit(submitData);
  };

  const formatAmount = (value) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const getCurrencySymbol = (currencyCode) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '$';
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Payment Intent</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">
                {getCurrencySymbol(formData.currency)}
              </span>
              <input
                type="text"
                id="amount"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', formatAmount(e.target.value))}
                className={`input pl-8 ${validationErrors.amount ? 'border-error-500 focus:ring-error-500' : ''}`}
                placeholder="25.99"
                aria-describedby={validationErrors.amount ? 'amount-error' : undefined}
              />
            </div>
            {validationErrors.amount && (
              <p id="amount-error" className="mt-1 text-sm text-error-600">
                {validationErrors.amount}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency *
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="select"
            >
              {CURRENCIES.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer ID */}
        <div>
          <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-2">
            Customer ID *
          </label>
          <input
            type="text"
            id="customer_id"
            value={formData.customer_id}
            onChange={(e) => handleInputChange('customer_id', e.target.value)}
            className={`input ${validationErrors.customer_id ? 'border-error-500 focus:ring-error-500' : ''}`}
            placeholder="cus_123456789"
            aria-describedby={validationErrors.customer_id ? 'customer-error' : undefined}
          />
          {validationErrors.customer_id && (
            <p id="customer-error" className="mt-1 text-sm text-error-600">
              {validationErrors.customer_id}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method *
          </label>
          <select
            id="payment_method"
            value={formData.payment_method_id}
            onChange={(e) => handleInputChange('payment_method_id', e.target.value)}
            className="select"
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>

        {/* Capture Method */}
        <div>
          <label htmlFor="capture_method" className="block text-sm font-medium text-gray-700 mb-2">
            Capture Method
          </label>
          <select
            id="capture_method"
            value={formData.capture_method}
            onChange={(e) => handleInputChange('capture_method', e.target.value)}
            className="select"
          >
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Automatic capture will charge the payment method immediately upon confirmation
          </p>
        </div>

        {/* Metadata */}
        <div>
          <label htmlFor="order_id" className="block text-sm font-medium text-gray-700 mb-2">
            Order ID *
          </label>
          <input
            type="text"
            id="order_id"
            value={formData.metadata.orderId}
            onChange={(e) => handleMetadataChange('orderId', e.target.value)}
            className={`input ${validationErrors.orderId ? 'border-error-500 focus:ring-error-500' : ''}`}
            placeholder="ORD-1001"
            aria-describedby={validationErrors.orderId ? 'order-error' : undefined}
          />
          {validationErrors.orderId && (
            <p id="order-error" className="mt-1 text-sm text-error-600">
              {validationErrors.orderId}
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-error-500">⚠</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">
                  {error.errorData?.type || 'Error'}
                </h3>
                <p className="mt-1 text-sm text-error-700">
                  {error.message}
                </p>
                {error.errorData?.param && (
                  <p className="mt-1 text-xs text-error-600">
                    Parameter: {error.errorData.param}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={loading ? 'btn-disabled' : 'btn-primary'}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              'Create Payment Intent'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
