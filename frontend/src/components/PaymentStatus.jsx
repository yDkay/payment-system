/**
 * Payment status display component with live polling and status badges
 */

import React from 'react';
import { PAYMENT_STATUSES } from '../api/client.js';
import { ProcessingJobs } from './ProcessingJobs.jsx';

export function PaymentStatus({ 
  intent, 
  payment, 
  isPolling, 
  onConfirm, 
  onForceFailure,
  onGetResult,
  loading 
}) {
  if (!intent) {
    return null;
  }

  const openReceipt = (payment, intent) => {
    // Create receipt data
    const receiptData = {
      payment,
      intent
    };

    // Open new window with receipt
    const receiptWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
    
    if (receiptWindow) {
      // Create the receipt HTML
      receiptWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Receipt - ${payment.payment_id}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div id="receipt-root"></div>
            <script type="module">
              import React from 'https://esm.sh/react@18';
              import ReactDOM from 'https://esm.sh/react-dom@18/client';
              
              const receiptData = ${JSON.stringify(receiptData)};
              
              function Receipt({ payment, intent }) {
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
                  const receiptText = \`
PAYMENT RECEIPT
===============

Receipt ID: \${payment.payment_id}
Date: \${formatDate(payment.created_at)}
Status: \${payment.status.toUpperCase()}

PAYMENT DETAILS
---------------
Amount: \${formatAmount(payment.captured_amount, intent.currency)}
Currency: \${intent.currency}
Payment Method: \${intent.payment_method_id}
Authorization Code: \${payment.auth_code}

CUSTOMER INFORMATION
--------------------
Customer ID: \${intent.customer_id}
Order ID: \${intent.metadata?.orderId || 'N/A'}

TRANSACTION DETAILS
-------------------
Payment Intent: \${intent.id}
Capture Method: \${intent.capture_method}
Created: \${formatDate(intent.created_at)}
Completed: \${formatDate(payment.created_at)}

Thank you for your payment!
                  \`;

                  const blob = new Blob([receiptText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = \`receipt-\${payment.payment_id}.txt\`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                };

                return React.createElement('div', { className: 'min-h-screen bg-gray-50 py-8' },
                  React.createElement('div', { className: 'max-w-2xl mx-auto px-4' },
                    React.createElement('div', { className: 'text-center mb-8' },
                      React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Payment Receipt'),
                      React.createElement('p', { className: 'text-gray-600' }, 'Thank you for your payment')
                    ),
                    React.createElement('div', { className: 'bg-white shadow-lg rounded-lg overflow-hidden' },
                      React.createElement('div', { className: 'bg-blue-600 text-white px-6 py-4' },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                          React.createElement('div', null,
                            React.createElement('h2', { className: 'text-xl font-semibold' }, 'Payment System Inc.'),
                            React.createElement('p', { className: 'text-blue-100' }, 'Demo Payment Processor')
                          ),
                          React.createElement('div', { className: 'text-right' },
                            React.createElement('p', { className: 'text-sm text-blue-100' }, 'Receipt #'),
                            React.createElement('p', { className: 'font-mono text-lg' }, payment.payment_id)
                          )
                        )
                      ),
                      React.createElement('div', { className: 'px-6 py-6' },
                        React.createElement('div', { className: 'flex justify-center mb-6' },
                          React.createElement('span', { className: 'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800' },
                            '✓ Payment Successful'
                          )
                        ),
                        React.createElement('div', { className: 'text-center mb-8' },
                          React.createElement('p', { className: 'text-sm text-gray-600 mb-1' }, 'Amount Paid'),
                          React.createElement('p', { className: 'text-4xl font-bold text-gray-900' }, formatAmount(payment.captured_amount, intent.currency))
                        ),
                        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8' },
                          React.createElement('div', null,
                            React.createElement('h3', { className: 'text-sm font-medium text-gray-700 mb-3' }, 'Payment Information'),
                            React.createElement('div', { className: 'space-y-2 text-sm' },
                              React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', { className: 'text-gray-600' }, 'Payment ID:'),
                                React.createElement('span', { className: 'font-mono' }, payment.payment_id)
                              ),
                              React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', { className: 'text-gray-600' }, 'Auth Code:'),
                                React.createElement('span', { className: 'font-mono' }, payment.auth_code)
                              ),
                              React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', { className: 'text-gray-600' }, 'Payment Method:'),
                                React.createElement('span', null, intent.payment_method_id)
                              )
                            )
                          ),
                          React.createElement('div', null,
                            React.createElement('h3', { className: 'text-sm font-medium text-gray-700 mb-3' }, 'Customer Information'),
                            React.createElement('div', { className: 'space-y-2 text-sm' },
                              React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', { className: 'text-gray-600' }, 'Customer ID:'),
                                React.createElement('span', { className: 'font-mono' }, intent.customer_id)
                              ),
                              intent.metadata?.orderId && React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', { className: 'text-gray-600' }, 'Order ID:'),
                                React.createElement('span', { className: 'font-mono' }, intent.metadata.orderId)
                              ),
                              React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', { className: 'text-gray-600' }, 'Currency:'),
                                React.createElement('span', null, intent.currency)
                              )
                            )
                          )
                        ),
                        React.createElement('div', { className: 'mb-8' },
                          React.createElement('h3', { className: 'text-sm font-medium text-gray-700 mb-3' }, 'Transaction Timeline'),
                          React.createElement('div', { className: 'space-y-3' },
                            React.createElement('div', { className: 'flex items-center text-sm' },
                              React.createElement('div', { className: 'w-2 h-2 bg-gray-400 rounded-full mr-3' }),
                              React.createElement('span', { className: 'text-gray-600' }, 'Payment Intent Created:'),
                              React.createElement('span', { className: 'ml-auto' }, formatDate(intent.created_at))
                            ),
                            React.createElement('div', { className: 'flex items-center text-sm' },
                              React.createElement('div', { className: 'w-2 h-2 bg-green-500 rounded-full mr-3' }),
                              React.createElement('span', { className: 'text-gray-600' }, 'Payment Completed:'),
                              React.createElement('span', { className: 'ml-auto' }, formatDate(payment.created_at))
                            )
                          )
                        ),
                        React.createElement('div', { className: 'border-t border-gray-200 pt-6' },
                          React.createElement('div', { className: 'text-center text-sm text-gray-500 mb-4' },
                            React.createElement('p', null, 'This is a demo receipt for testing purposes.'),
                            React.createElement('p', null, 'No actual payment was processed.')
                          ),
                          React.createElement('div', { className: 'flex justify-center space-x-4' },
                            React.createElement('button', { 
                              onClick: handlePrint,
                              className: 'px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm'
                            }, '🖨️ Print Receipt'),
                            React.createElement('button', { 
                              onClick: handleDownload,
                              className: 'px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm'
                            }, '📄 Download Receipt'),
                            React.createElement('button', { 
                              onClick: () => window.close(),
                              className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm'
                            }, 'Close')
                          )
                        )
                      )
                    ),
                    React.createElement('div', { className: 'mt-8 text-center text-xs text-gray-500' },
                      React.createElement('p', null, \`Questions about this payment? Contact support with receipt ID: \${payment.payment_id}\`),
                      React.createElement('p', { className: 'mt-1' }, 'Payment System Inc. • Demo Environment • Not for production use')
                    )
                  )
                );
              }

              const root = ReactDOM.createRoot(document.getElementById('receipt-root'));
              root.render(React.createElement(Receipt, receiptData));
            </script>
          </body>
        </html>
      `);
      receiptWindow.document.close();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      [PAYMENT_STATUSES.REQUIRES_CONFIRMATION]: {
        className: 'badge-warning',
        text: 'Requires Confirmation',
        icon: '⏳'
      },
      [PAYMENT_STATUSES.PROCESSING]: {
        className: 'badge-info',
        text: 'Processing',
        icon: '⚡'
      },
      [PAYMENT_STATUSES.SUCCEEDED]: {
        className: 'badge-success',
        text: 'Succeeded',
        icon: '✅'
      },
      [PAYMENT_STATUSES.FAILED]: {
        className: 'badge-error',
        text: 'Failed',
        icon: '❌'
      },
      [PAYMENT_STATUSES.CANCELED]: {
        className: 'badge bg-gray-100 text-gray-600',
        text: 'Canceled',
        icon: '⚪'
      }
    };

    const badge = badges[status] || badges[PAYMENT_STATUSES.REQUIRES_CONFIRMATION];
    
    return (
      <span className={`${badge.className} flex items-center gap-1`}>
        <span>{badge.icon}</span>
        {badge.text}
        {status === PAYMENT_STATUSES.PROCESSING && isPolling && (
          <svg className="animate-spin h-3 w-3 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </span>
    );
  };

  const formatAmount = (amount, currency) => {
    const value = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Payment Status</h2>
        {getStatusBadge(intent.status)}
      </div>

      {/* Payment Intent Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Intent ID</label>
          <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
            {intent.id}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatAmount(intent.amount, intent.currency)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Customer ID</label>
          <p className="mt-1 text-sm text-gray-900 font-mono">
            {intent.customer_id}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Method</label>
          <p className="mt-1 text-sm text-gray-900">
            {intent.payment_method_id}
          </p>
        </div>

        {intent.metadata?.orderId && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Order ID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">
              {intent.metadata.orderId}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Created</label>
          <p className="mt-1 text-sm text-gray-900">
            {formatDate(intent.created_at)}
          </p>
        </div>
      </div>

      {/* Processing Jobs - Show during processing and after completion */}
      {(intent.status === PAYMENT_STATUSES.PROCESSING || 
        intent.status === PAYMENT_STATUSES.SUCCEEDED || 
        intent.status === PAYMENT_STATUSES.FAILED) && (
        <div className="mb-6">
          <ProcessingJobs 
            intentId={intent.id}
            isPolling={intent.status === PAYMENT_STATUSES.PROCESSING && isPolling}
            paymentStatus={intent.status}
          />
        </div>
      )}

      {/* Failure Reason */}
      {intent.status === PAYMENT_STATUSES.FAILED && intent.failure_reason && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
          <h4 className="text-sm font-medium text-error-800 mb-1">Failure Reason</h4>
          <p className="text-sm text-error-700">{intent.failure_reason}</p>
        </div>
      )}

      {/* Payment Result */}
      {payment && (
        <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg">
          <h4 className="text-sm font-medium text-success-800 mb-3">Payment Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-success-700">Payment ID</label>
              <p className="text-sm text-success-900 font-mono">{payment.payment_id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-success-700">Captured Amount</label>
              <p className="text-sm text-success-900 font-semibold">
                {formatAmount(payment.captured_amount, intent.currency)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-success-700">Auth Code</label>
              <p className="text-sm text-success-900 font-mono">{payment.auth_code}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-success-700">Receipt</label>
              <button
                onClick={() => openReceipt(payment, intent)}
                className="text-sm text-primary-600 hover:text-primary-800 underline"
              >
                View Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {intent.status === PAYMENT_STATUSES.REQUIRES_CONFIRMATION && (
          <>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={loading ? 'btn-disabled' : 'btn-primary'}
            >
              {loading ? 'Confirming...' : 'Confirm Payment'}
            </button>
            <button
              onClick={onForceFailure}
              disabled={loading}
              className={loading ? 'btn-disabled' : 'btn-error'}
            >
              {loading ? 'Processing...' : 'Force Failure (Test)'}
            </button>
          </>
        )}

        {intent.status === PAYMENT_STATUSES.PROCESSING && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing payment... {isPolling ? '(Auto-refreshing)' : ''}
          </div>
        )}

        {intent.status === PAYMENT_STATUSES.SUCCEEDED && !payment && (
          <button
            onClick={onGetResult}
            disabled={loading}
            className={loading ? 'btn-disabled' : 'btn-secondary'}
          >
            {loading ? 'Loading...' : 'Get Payment Details'}
          </button>
        )}

        {intent.status === PAYMENT_STATUSES.SUCCEEDED && isPolling && (
          <div className="text-sm text-success-600 flex items-center">
            <span className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></span>
            Payment completed successfully
          </div>
        )}
      </div>

      {/* Polling Status */}
      {isPolling && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-sm text-blue-800">
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Automatically checking for updates...
          </div>
        </div>
      )}
    </div>
  );
}
