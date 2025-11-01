/**
 * Payment processing jobs system
 * Handles individual processing steps with status tracking
 */

import { store } from './store.js';

// Job types and their configurations
export const JOB_TYPES = {
  ANTI_FRAUD: {
    id: 'anti_fraud',
    name: 'Anti-Fraud Check',
    description: 'Analyzing transaction for fraud patterns',
    duration: { min: 5000, max: 8000 }, // 5-8 seconds
    order: 1
  },
  AUTHORIZATION: {
    id: 'authorization',
    name: 'Payment Authorization',
    description: 'Authorizing payment with card issuer',
    duration: { min: 5000, max: 8000 },
    order: 2
  },
  RISK_ASSESSMENT: {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    description: 'Evaluating transaction risk score',
    duration: { min: 5000, max: 8000 },
    order: 3
  },
  COMPLIANCE_CHECK: {
    id: 'compliance_check',
    name: 'Compliance Verification',
    description: 'Checking regulatory compliance',
    duration: { min: 5000, max: 8000 },
    order: 4
  },
  CAPTURE: {
    id: 'capture',
    name: 'Payment Capture',
    description: 'Capturing authorized payment',
    duration: { min: 5000, max: 8000 },
    order: 5
  }
};

// Job statuses
export const JOB_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Creates processing jobs for a payment intent
 */
export function createProcessingJobs(intentId, forceFailure = false) {
  const jobs = Object.values(JOB_TYPES).map(jobType => ({
    id: `${intentId}_${jobType.id}`,
    payment_intent_id: intentId,
    type: jobType.id,
    name: jobType.name,
    description: jobType.description,
    status: JOB_STATUSES.PENDING,
    order: jobType.order,
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString()
  }));

  // Store jobs
  const jobsKey = `jobs_${intentId}`;
  store.paymentJobs = store.paymentJobs || new Map();
  store.paymentJobs.set(jobsKey, jobs);

  // Start processing jobs in parallel with random timing
  processJobsInParallel(intentId, forceFailure);

  return jobs;
}

/**
 * Gets processing jobs for a payment intent
 */
export function getProcessingJobs(intentId) {
  const jobsKey = `jobs_${intentId}`;
  store.paymentJobs = store.paymentJobs || new Map();
  return store.paymentJobs.get(jobsKey) || [];
}

/**
 * Updates a specific job status
 */
function updateJobStatus(intentId, jobType, status, additionalData = {}) {
  const jobsKey = `jobs_${intentId}`;
  const jobs = store.paymentJobs.get(jobsKey) || [];
  
  const jobIndex = jobs.findIndex(job => job.type === jobType);
  if (jobIndex !== -1) {
    jobs[jobIndex] = {
      ...jobs[jobIndex],
      status,
      ...additionalData,
      updated_at: new Date().toISOString()
    };
    
    store.paymentJobs.set(jobsKey, jobs);
    console.log(`🔄 Job ${jobType} for ${intentId}: ${status}`);
  }
  
  return jobs;
}

/**
 * Processes jobs in parallel with random timing
 */
function processJobsInParallel(intentId, forceFailure = false) {
  const jobTypes = Object.values(JOB_TYPES);
  
  // Determine which job will fail (if any)
  const shouldFail = forceFailure || Math.random() < 0.1; // 10% failure rate
  const failureJobType = shouldFail ? jobTypes[Math.floor(Math.random() * jobTypes.length)] : null;
  
  // Start all jobs in parallel with random delays
  const jobPromises = jobTypes.map(jobType => {
    return processIndividualJob(intentId, jobType, failureJobType);
  });
  
  // Wait for all jobs to complete (or fail)
  Promise.all(jobPromises).then(results => {
    const allSucceeded = results.every(result => result === true);
    
    if (allSucceeded) {
      console.log(`✅ All processing jobs completed successfully for ${intentId}`);
    } else {
      console.log(`❌ Some processing jobs failed for ${intentId}`);
    }
  });
}

/**
 * Processes an individual job with random timing
 */
async function processIndividualJob(intentId, jobType, failureJobType) {
  // Add random start delay (0-2 seconds) to make jobs start at different times
  const startDelay = Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, startDelay));
  
  // Start job
  updateJobStatus(intentId, jobType.id, JOB_STATUSES.PROCESSING, {
    started_at: new Date().toISOString()
  });
  
  // Calculate processing time (5-8 seconds)
  const duration = Math.random() * (jobType.duration.max - jobType.duration.min) + jobType.duration.min;
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, duration));
  
  // Check if this job should fail
  if (failureJobType && jobType.id === failureJobType.id) {
    updateJobStatus(intentId, jobType.id, JOB_STATUSES.FAILED, {
      completed_at: new Date().toISOString(),
      error_message: getJobFailureMessage(jobType.id)
    });
    
    console.log(`❌ Job ${jobType.name} failed for ${intentId}`);
    return false; // Job failed
  }
  
  // Complete job successfully
  updateJobStatus(intentId, jobType.id, JOB_STATUSES.COMPLETED, {
    completed_at: new Date().toISOString()
  });
  
  console.log(`✅ Job ${jobType.name} completed for ${intentId}`);
  return true; // Job completed successfully
}

/**
 * Gets failure message for different job types
 */
function getJobFailureMessage(jobType) {
  const messages = {
    anti_fraud: 'Transaction flagged as potentially fraudulent',
    authorization: 'Payment authorization declined by issuer',
    risk_assessment: 'Transaction risk score too high',
    compliance_check: 'Compliance verification failed',
    capture: 'Payment capture failed'
  };
  
  return messages[jobType] || 'Job processing failed';
}

/**
 * Checks if all jobs are completed
 */
export function areAllJobsCompleted(intentId) {
  const jobs = getProcessingJobs(intentId);
  if (jobs.length === 0) return false;
  
  return jobs.every(job => 
    job.status === JOB_STATUSES.COMPLETED || job.status === JOB_STATUSES.FAILED
  );
}

/**
 * Checks if processing was successful (all jobs completed without failures)
 */
export function wasProcessingSuccessful(intentId) {
  const jobs = getProcessingJobs(intentId);
  if (jobs.length === 0) return false;
  
  return jobs.every(job => job.status === JOB_STATUSES.COMPLETED);
}
