/**
 * Receipt component - displays a fake receipt for completed payments
 * Opens in a new window/tab to avoid disrupting the main app flow
 */

import React from 'react';

export function Receipt({ payment, intent }) {
  if (!payment || !intent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Receipt Not Found</h1>
          <p className="text-gray-600">Unable to load receipt information.</p>
        </div>
      </div>
    );
  }

  const formatAmount = (amount, currency) => {
    const value = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simple text receipt for download
    const receiptText = `
PAYMENT RECEIPT
===============

Receipt ID: ${payment.payment_id}
Date: ${formatDate(payment.created_at)}
Status: ${payment.status.toUpperCase()}

PAYMENT DETAILS
---------------
Amount: ${formatAmount(payment.captured_amount, intent.currency)}
Currency: ${intent.currency}
Payment Method: ${intent.payment_method_id}
Authorization Code: ${payment.auth_code}

CUSTOMER INFORMATION
--------------------
Customer ID: ${intent.customer_id}
Order ID: ${intent.metadata?.orderId || 'N/A'}

TRANSACTION DETAILS
-------------------
Payment Intent: ${intent.id}
Capture Method: ${intent.capture_method}
Created: ${formatDate(intent.created_at)}
Completed: ${formatDate(payment.created_at)}

Thank you for your payment!
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.payment_id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Receipt</h1>
          <p className="text-gray-600">Thank you for your payment</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Payment System Inc.</h2>
                <p className="text-primary-100">Demo Payment Processor</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-100">Receipt #</p>
                <p className="font-mono text-lg">{payment.payment_id}</p>
              </div>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="px-6 py-6">
            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-success-100 text-success-800">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Payment Successful
              </span>
            </div>

            {/* Payment Amount */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
              <p className="text-4xl font-bold text-gray-900">
                {formatAmount(payment.captured_amount, intent.currency)}
              </p>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID:</span>
                    <span className="font-mono">{payment.payment_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auth Code:</span>
                    <span className="font-mono">{payment.auth_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span>{intent.payment_method_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capture Method:</span>
                    <span className="capitalize">{intent.capture_method}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer ID:</span>
                    <span className="font-mono">{intent.customer_id}</span>
                  </div>
                  {intent.metadata?.orderId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-mono">{intent.metadata.orderId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currency:</span>
                    <span>{intent.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Timeline */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Transaction Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <span className="text-gray-600">Payment Intent Created:</span>
                  <span className="ml-auto">{formatDate(intent.created_at)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-success-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">Payment Completed:</span>
                  <span className="ml-auto">{formatDate(payment.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-6">
              <div className="text-center text-sm text-gray-500 mb-4">
                <p>This is a demo receipt for testing purposes.</p>
                <p>No actual payment was processed.</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handlePrint}
                  className="btn-secondary text-sm"
                >
                  🖨️ Print Receipt
                </button>
                <button
                  onClick={handleDownload}
                  className="btn-secondary text-sm"
                >
                  📄 Download Receipt
                </button>
                <button
                  onClick={() => window.close()}
                  className="btn-primary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Questions about this payment? Contact support with receipt ID: {payment.payment_id}</p>
          <p className="mt-1">Payment System Inc. • Demo Environment • Not for production use</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .bg-primary-600 { background-color: #2563eb !important; }
          .text-white { color: white !important; }
        }
      `}</style>
    </div>
  );
}
