/**
 * Processing Jobs component - shows detailed payment processing steps
 */

import React, { useState, useEffect } from 'react';
import { paymentApi } from '../api/client.js';

const JOB_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export function ProcessingJobs({ intentId, isPolling, onJobsUpdate, paymentStatus }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch jobs data
  const fetchJobs = async () => {
    if (!intentId) return;
    
    try {
      setLoading(true);
      const response = await paymentApi.getProcessingJobs(intentId);
      setJobs(response.data.jobs || []);
      setError(null);
      
      // Notify parent about jobs update
      if (onJobsUpdate) {
        onJobsUpdate(response.data.jobs || []);
      }
    } catch (err) {
      setError(err);
      console.error('Failed to fetch processing jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchJobs();
  }, [intentId]);

  // Poll for updates when processing
  useEffect(() => {
    if (!isPolling || !intentId) return;

    const interval = setInterval(fetchJobs, 1000); // Poll every second for jobs
    return () => clearInterval(interval);
  }, [isPolling, intentId]);

  const getStatusIcon = (status) => {
    switch (status) {
      case JOB_STATUSES.PENDING:
        return '⏳';
      case JOB_STATUSES.PROCESSING:
        return '⚡';
      case JOB_STATUSES.COMPLETED:
        return '✅';
      case JOB_STATUSES.FAILED:
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case JOB_STATUSES.PENDING:
        return 'text-gray-500 bg-gray-100';
      case JOB_STATUSES.PROCESSING:
        return 'text-blue-700 bg-blue-100';
      case JOB_STATUSES.COMPLETED:
        return 'text-green-700 bg-green-100';
      case JOB_STATUSES.FAILED:
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getJobDuration = (job) => {
    if (!job.started_at) return null;
    
    const endTime = job.completed_at ? new Date(job.completed_at) : new Date();
    const startTime = new Date(job.started_at);
    const duration = Math.round((endTime - startTime) / 1000 * 10) / 10; // Round to 1 decimal
    
    return `${duration}s`;
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-primary-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Loading processing jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center text-red-600">
          <p>Failed to load processing jobs</p>
          <button 
            onClick={fetchJobs}
            className="mt-2 btn-secondary text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center text-gray-500">
          <p>No processing jobs found</p>
        </div>
      </div>
    );
  }

  // Sort jobs by order
  const sortedJobs = [...jobs].sort((a, b) => a.order - b.order);

  // Get overall status message
  const getOverallStatusMessage = () => {
    if (isPolling) {
      return (
        <div className="flex items-center text-sm text-blue-600">
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Live Updates
        </div>
      );
    }
    
    if (paymentStatus === 'succeeded') {
      return (
        <div className="flex items-center text-sm text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Processing Completed Successfully
        </div>
      );
    }
    
    if (paymentStatus === 'failed') {
      return (
        <div className="flex items-center text-sm text-red-600">
          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          Processing Failed
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Processing Steps</h3>
        {getOverallStatusMessage()}
      </div>

      <div className="space-y-4">
        {sortedJobs.map((job, index) => (
          <div key={job.id} className="relative">
            {/* Connection line */}
            {index < sortedJobs.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
            )}
            
            <div className="flex items-start space-x-4">
              {/* Status icon */}
              <div className={`
                flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold
                ${getStatusColor(job.status)}
                ${job.status === JOB_STATUSES.PROCESSING ? 'animate-pulse' : ''}
              `}>
                {getStatusIcon(job.status)}
              </div>

              {/* Job details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {job.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {job.started_at && (
                      <span>Started: {formatTime(job.started_at)}</span>
                    )}
                    {job.completed_at && (
                      <span>• Completed: {formatTime(job.completed_at)}</span>
                    )}
                    {getJobDuration(job) && (
                      <span>• Duration: {getJobDuration(job)}</span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  {job.description}
                </p>

                {/* Error message for failed jobs */}
                {job.status === JOB_STATUSES.FAILED && job.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {job.error_message}
                  </div>
                )}

                {/* Processing indicator */}
                {job.status === JOB_STATUSES.PROCESSING && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="ml-2">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Progress: {sortedJobs.filter(job => job.status === JOB_STATUSES.COMPLETED).length} of {sortedJobs.length} completed
          </div>
          <div className="flex space-x-4">
            <span className="text-green-600">
              ✅ {sortedJobs.filter(job => job.status === JOB_STATUSES.COMPLETED).length} Completed
            </span>
            {sortedJobs.some(job => job.status === JOB_STATUSES.PROCESSING) && (
              <span className="text-blue-600">
                ⚡ {sortedJobs.filter(job => job.status === JOB_STATUSES.PROCESSING).length} Processing
              </span>
            )}
            {sortedJobs.some(job => job.status === JOB_STATUSES.FAILED) && (
              <span className="text-red-600">
                ❌ {sortedJobs.filter(job => job.status === JOB_STATUSES.FAILED).length} Failed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
