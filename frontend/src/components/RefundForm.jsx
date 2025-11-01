/**
 * Refund form component for creating refunds on successful payments
 */

import React, { useState } from 'react';

const REFUND_REASONS = [
  { value: 'duplicate', label: 'Duplicate charge' },
  { value: 'fraudulent', label: 'Fraudulent transaction' },
  { value: 'requested_by_customer', label: 'Requested by customer' },
  { value: 'product_not_received', label: 'Product not received' },
  { value: 'product_unacceptable', label: 'Product unacceptable' },
  { value: 'other', label: 'Other' }
];

export function RefundForm({ payment, intent, onSubmit, loading, error }) {
  const [formData, setFormData] = useState({
    amount: '',
    reason: 'requested_by_customer'
  });

  const [validationErrors, setValidationErrors] = useState({});

  if (!payment || !intent) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Refund</h3>
        <p className="text-gray-500">No payment available for refund</p>
      </div>
    );
  }

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

  const validateForm = () => {
    const errors = {};

    // Amount validation
    const amount = parseFloat(formData.amount);
    const maxRefundAmount = payment.captured_amount / 100;
    
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Amount must be a positive number';
    } else if (amount > maxRefundAmount) {
      errors.amount = `Amount cannot exceed ${formatAmount(payment.captured_amount, intent.currency)}`;
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
      payment_id: payment.payment_id,
      amount: amountInCents,
      reason: formData.reason
    };

    onSubmit(submitData);
  };

  const formatAmount = (amount, currency) => {
    const value = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatAmountInput = (value) => {
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

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥'
    };
    return symbols[currency] || '$';
  };

  const setFullRefund = () => {
    const fullAmount = (payment.captured_amount / 100).toFixed(2);
    handleInputChange('amount', fullAmount);
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Create Refund</h3>
      
      {/* Payment Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Payment ID:</span>
            <span className="ml-2 font-mono">{payment.payment_id}</span>
          </div>
          <div>
            <span className="text-gray-600">Captured Amount:</span>
            <span className="ml-2 font-semibold">
              {formatAmount(payment.captured_amount, intent.currency)}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Refund Amount */}
        <div>
          <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700 mb-2">
            Refund Amount *
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-2 text-gray-500">
                {getCurrencySymbol(intent.currency)}
              </span>
              <input
                type="text"
                id="refund_amount"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', formatAmountInput(e.target.value))}
                className={`input pl-8 ${validationErrors.amount ? 'border-error-500 focus:ring-error-500' : ''}`}
                placeholder="25.99"
                aria-describedby={validationErrors.amount ? 'amount-error' : undefined}
              />
            </div>
            <button
              type="button"
              onClick={setFullRefund}
              className="btn-secondary whitespace-nowrap"
            >
              Full Refund
            </button>
          </div>
          {validationErrors.amount && (
            <p id="amount-error" className="mt-1 text-sm text-error-600">
              {validationErrors.amount}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Maximum refund: {formatAmount(payment.captured_amount, intent.currency)}
          </p>
        </div>

        {/* Refund Reason */}
        <div>
          <label htmlFor="refund_reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Refund
          </label>
          <select
            id="refund_reason"
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            className="select"
          >
            {REFUND_REASONS.map(reason => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
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
            className={loading ? 'btn-disabled' : 'btn-error'}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Refund...
              </span>
            ) : (
              'Create Refund'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
