/**
 * Main App component - Payment Processing System
 * Orchestrates the complete payment flow with proper state management
 */

import React, { useState, useEffect } from 'react';
import { usePaymentFlow } from './hooks/usePaymentFlow.js';
import { useToast } from './components/Toast.jsx';
import { PaymentIntentForm } from './components/PaymentIntentForm.jsx';
import { PaymentStatus } from './components/PaymentStatus.jsx';
import { RefundForm } from './components/RefundForm.jsx';
import { PAYMENT_STATUSES } from './api/client.js';

function App() {
  const {
    currentIntent,
    currentPayment,
    loading,
    error,
    lastRequest,
    isPolling,
    createIntent,
    confirmIntent,
    getPaymentResult,
    createRefund,
    reset,
    clearError
  } = usePaymentFlow();

  const { addToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [refundResult, setRefundResult] = useState(null);

  // Handle error notifications
  useEffect(() => {
    if (error) {
      addToast(error.message, 'error');
    }
  }, [error, addToast]);

  // Auto-switch tabs based on payment state
  useEffect(() => {
    if (currentIntent) {
      if (currentIntent.status === PAYMENT_STATUSES.REQUIRES_CONFIRMATION) {
        setActiveTab('status');
      }
      // Don't auto-switch to refund tab - let user navigate manually
    }
  }, [currentIntent]);

  const handleCreateIntent = async (intentData) => {
    try {
      await createIntent(intentData);
      addToast('Payment intent created successfully!', 'success');
      setActiveTab('status');
    } catch (err) {
      // Error is handled by the hook and useEffect above
    }
  };

  const handleConfirmIntent = async (forceFailure = false) => {
    if (!currentIntent) return;
    
    try {
      await confirmIntent(currentIntent.id, {}, forceFailure);
      addToast(
        forceFailure 
          ? 'Payment confirmation started (forced failure)' 
          : 'Payment confirmation started', 
        forceFailure ? 'warning' : 'info'
      );
    } catch (err) {
      // Error is handled by the hook and useEffect above
    }
  };

  const handleGetPaymentResult = async () => {
    if (!currentIntent) return;
    
    try {
      await getPaymentResult(currentIntent.id);
      addToast('Payment details loaded successfully!', 'success');
    } catch (err) {
      // Error is handled by the hook and useEffect above
    }
  };

  const handleCreateRefund = async (refundData) => {
    try {
      const result = await createRefund(refundData);
      setRefundResult(result);
      addToast('Refund created successfully!', 'success');
    } catch (err) {
      // Error is handled by the hook and useEffect above
    }
  };

  const handleReset = () => {
    reset();
    setRefundResult(null);
    setActiveTab('create');
    clearError();
    addToast('Payment flow reset', 'info');
  };

  const tabs = [
    { id: 'create', label: 'Create Intent', icon: '💳' },
    { id: 'status', label: 'Payment Status', icon: '📊', disabled: !currentIntent },
    { id: 'refund', label: 'Refund', icon: '↩️', disabled: !currentPayment }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                💳 Payment Processing System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentIntent && (
                <div className="text-sm text-gray-600">
                  Intent: <span className="font-mono">{currentIntent.id}</span>
                </div>
              )}
              <button
                onClick={handleReset}
                className="btn-secondary text-sm"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {activeTab === 'create' && (
              <PaymentIntentForm
                onSubmit={handleCreateIntent}
                loading={loading}
                error={error}
              />
            )}

            {activeTab === 'status' && (
              <PaymentStatus
                intent={currentIntent}
                payment={currentPayment}
                isPolling={isPolling}
                loading={loading}
                onConfirm={() => handleConfirmIntent(false)}
                onForceFailure={() => handleConfirmIntent(true)}
                onGetResult={handleGetPaymentResult}
              />
            )}

            {activeTab === 'refund' && (
              <>
                <RefundForm
                  payment={currentPayment}
                  intent={currentIntent}
                  onSubmit={handleCreateRefund}
                  loading={loading}
                  error={error}
                />
                
                {refundResult && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      ✅ Refund Created
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Refund ID:</span>
                        <span className="ml-2 font-mono">{refundResult.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <span className="ml-2 font-semibold">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: currentIntent?.currency || 'USD'
                          }).format(refundResult.amount / 100)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Reason:</span>
                        <span className="ml-2">{refundResult.reason}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 badge-success">{refundResult.status}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
