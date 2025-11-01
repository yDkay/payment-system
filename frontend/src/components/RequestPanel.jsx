/**
 * Request/Response panel for debugging API calls
 * Shows method, URL, headers, body, and provides cURL copy functionality
 */

import React, { useState } from 'react';

export function RequestPanel({ requestInfo, className = '' }) {
  const [activeTab, setActiveTab] = useState('request');
  const [copied, setCopied] = useState(false);

  if (!requestInfo) {
    return (
      <div className={`card p-4 ${className}`}>
        <p className="text-gray-500 text-center">No request data available</p>
      </div>
    );
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatHeaders = (headers) => {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-success-600';
    if (status >= 400 && status < 500) return 'text-error-600';
    if (status >= 500) return 'text-error-700';
    return 'text-gray-600';
  };

  return (
    <div className={`card ${className}`}>
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-lg font-semibold text-gray-900">Request Details</h3>
          <button
            onClick={() => copyToClipboard(requestInfo.curl)}
            className={`btn-secondary text-sm ${copied ? 'bg-success-100 text-success-700' : ''}`}
          >
            {copied ? 'Copied!' : 'Copy as cURL'}
          </button>
        </div>
        
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'request'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Request
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'response'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Response
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'curl'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            cURL
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'request' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method & URL
              </label>
              <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                <span className="font-bold text-primary-600">{requestInfo.method}</span>{' '}
                <span className="text-gray-800">{requestInfo.url}</span>
              </div>
            </div>

            {requestInfo.headers && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Headers
                </label>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                  {formatHeaders(requestInfo.headers)}
                </pre>
              </div>
            )}

            {requestInfo.body && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body
                </label>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                  {requestInfo.body}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                <span className={`font-bold ${getStatusColor(requestInfo.status)}`}>
                  {requestInfo.status}
                </span>{' '}
                <span className="text-gray-600">{requestInfo.statusText}</span>
              </div>
            </div>

            {requestInfo.responseHeaders && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Headers
                </label>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                  {formatHeaders(requestInfo.responseHeaders)}
                </pre>
              </div>
            )}

            {requestInfo.responseBody && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Body
                </label>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                  {requestInfo.responseBody}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'curl' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              cURL Command
            </label>
            <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-sm overflow-x-auto">
              {requestInfo.curl}
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              Copy this command to reproduce the request in your terminal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
