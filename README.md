# Payment Processing System

An async payment processing platform built with Node.js and React. This system provides a comprehensive payment workflow with real-time processing monitoring, receipt generation, and robust error handling.

## Features

- **Multi-Stage Processing Pipeline**: Five parallel processing jobs with real-time status monitoring
- **Asynchronous Architecture**: Non-blocking payment processing with live progress tracking
- **Idempotency Controls**: Built-in duplicate prevention with unique request identifiers
- **Real-time Status Updates**: Live polling with intelligent retry mechanisms
- **Professional Interface**: Modern, accessible web application built with React and Tailwind CSS
- **Receipt Management**: Automated receipt generation with print and download capabilities
- **Comprehensive Error Handling**: Detailed error reporting and user feedback systems
- **Responsive Design**: Cross-platform compatibility for desktop and mobile devices

## Payment Workflow

The system implements a comprehensive payment processing workflow:

1. **Payment Intent Creation** - Initialize payment transactions with customer and transaction details
2. **Payment Confirmation** - Trigger asynchronous processing pipeline
3. **Multi-Stage Processing** - Execute five parallel processing jobs:
   - **Anti-Fraud Analysis** - Transaction pattern analysis and risk detection
   - **Payment Authorization** - Card issuer authorization and validation
   - **Risk Assessment** - Comprehensive transaction risk evaluation
   - **Compliance Verification** - Regulatory and policy compliance checks
   - **Payment Capture** - Secure payment capture and settlement
4. **Result Processing** - Consolidate processing results and update transaction status
5. **Receipt Generation** - Automated receipt creation with professional formatting
6. **Refund Processing** - Full and partial refund capabilities for completed transactions

## Technology Stack

### Backend Architecture
- **Node.js with Express Framework** - RESTful API server with ES6 module support
- **In-Memory Data Store** - High-performance Map-based storage for rapid prototyping
- **UUID Generation** - Cryptographically secure unique identifier creation
- **CORS Support** - Cross-origin resource sharing for web application integration

### Frontend Architecture
- **React 18** - Modern component-based user interface framework
- **Vite Build System** - Fast development server and optimized production builds
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Custom React Hooks** - Reusable state management and API integration logic

## Installation and Setup

### System Requirements
- Node.js 18.0 or higher
- npm 8.0 or higher

### Installation Process

1. **Repository Setup**
   ```bash
   git clone <repository-url>
   cd payment-system
   npm run install:all
   ```

2. **Backend Service**
   ```bash
   npm run dev:api
   ```
   The API server will be available at http://localhost:3001

3. **Frontend Application**
   ```bash
   npm run dev:web
   ```
   The web application will be available at http://localhost:3000

4. **Access the Application**
   Open your web browser and navigate to http://localhost:3000

## Configuration

### Backend Configuration

Create a `.env` file in the backend directory:

```bash
# backend/.env
PORT=3001
API_KEY=test_key
ASYNC_DELAY=2000
```

### Frontend Configuration

Create a `.env` file in the frontend directory:

```bash
# frontend/.env
VITE_API_URL=http://localhost:3001
VITE_API_KEY=test_key
```

## API Documentation

### Authentication
All API endpoints require Bearer token authentication using the `Authorization` header.

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payment_intents` | Create new payment intent |
| `PATCH` | `/payment_intents/:id/confirm` | Confirm and process payment |
| `GET` | `/payment_intents/:id` | Retrieve payment intent status |
| `GET` | `/payment_intents/:id/jobs` | Retrieve processing job statuses |
| `GET` | `/payments/:intentId` | Retrieve completed payment details |
| `POST` | `/refunds` | Create payment refund |
| `GET` | `/health` | System health check |

### API Usage Examples

#### 1. Create Payment Intent
```bash
curl -X POST 'http://localhost:3001/payment_intents' \
  -H 'Authorization: Bearer test_key' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 2599,
    "currency": "USD",
    "customer_id": "cus_123",
    "payment_method_id": "pm_fake_visa",
    "capture_method": "automatic",
    "metadata": { "orderId": "ORD-1001" }
  }'
```

**Response (201 Created):**
```json
{
  "id": "pi_abc123",
  "status": "requires_confirmation",
  "amount": 2599,
  "currency": "USD",
  "customer_id": "cus_123",
  "payment_method_id": "pm_fake_visa",
  "capture_method": "automatic",
  "client_secret": "pi_abc123_secret_sample",
  "metadata": { "orderId": "ORD-1001" },
  "created_at": "2023-01-01T12:00:00.000Z"
}
```

#### 2. Confirm Payment Processing
```bash
curl -X PATCH 'http://localhost:3001/payment_intents/pi_abc123/confirm' \
  -H 'Authorization: Bearer test_key' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440001' \
  -H 'Content-Type: application/json' \
  -d '{
    "payment_method_id": "pm_fake_visa"
  }'
```

**Response (202 Accepted):**
```json
{
  "id": "pi_abc123",
  "status": "processing"
}
```

#### 3. Get Payment Intent Status
```bash
curl -H 'Authorization: Bearer test_key' \
     'http://localhost:3001/payment_intents/pi_abc123'
```

**Response (200 OK):**
```json
{
  "id": "pi_abc123",
  "status": "succeeded",
  "amount": 2599,
  "currency": "USD",
  "customer_id": "cus_123",
  "payment_method_id": "pm_fake_visa",
  "capture_method": "automatic",
  "client_secret": "pi_abc123_secret_sample",
  "metadata": { "orderId": "ORD-1001" },
  "created_at": "2023-01-01T12:00:00.000Z",
  "confirmed_at": "2023-01-01T12:00:01.000Z",
  "succeeded_at": "2023-01-01T12:00:35.000Z"
}
```

#### 4. Get Processing Jobs Status
```bash
curl -H 'Authorization: Bearer test_key' \
     'http://localhost:3001/payment_intents/pi_abc123/jobs'
```

**Response (200 OK):**
```json
{
  "payment_intent_id": "pi_abc123",
  "jobs": [
    {
      "id": "pi_abc123_anti_fraud",
      "payment_intent_id": "pi_abc123",
      "type": "anti_fraud",
      "name": "Anti-Fraud Check",
      "description": "Analyzing transaction for fraud patterns",
      "status": "completed",
      "order": 1,
      "started_at": "2023-01-01T12:00:02.000Z",
      "completed_at": "2023-01-01T12:00:08.200Z",
      "created_at": "2023-01-01T12:00:01.000Z"
    },
    {
      "id": "pi_abc123_authorization",
      "payment_intent_id": "pi_abc123",
      "type": "authorization",
      "name": "Payment Authorization",
      "description": "Authorizing payment with card issuer",
      "status": "completed",
      "order": 2,
      "started_at": "2023-01-01T12:00:03.500Z",
      "completed_at": "2023-01-01T12:00:10.800Z",
      "created_at": "2023-01-01T12:00:01.000Z"
    },
    {
      "id": "pi_abc123_risk_assessment",
      "payment_intent_id": "pi_abc123",
      "type": "risk_assessment",
      "name": "Risk Assessment",
      "description": "Evaluating transaction risk score",
      "status": "completed",
      "order": 3,
      "started_at": "2023-01-01T12:00:01.200Z",
      "completed_at": "2023-01-01T12:00:07.900Z",
      "created_at": "2023-01-01T12:00:01.000Z"
    },
    {
      "id": "pi_abc123_compliance_check",
      "payment_intent_id": "pi_abc123",
      "type": "compliance_check",
      "name": "Compliance Verification",
      "description": "Checking regulatory compliance",
      "status": "completed",
      "order": 4,
      "started_at": "2023-01-01T12:00:04.100Z",
      "completed_at": "2023-01-01T12:00:11.300Z",
      "created_at": "2023-01-01T12:00:01.000Z"
    },
    {
      "id": "pi_abc123_capture",
      "payment_intent_id": "pi_abc123",
      "type": "capture",
      "name": "Payment Capture",
      "description": "Capturing authorized payment",
      "status": "completed",
      "order": 5,
      "started_at": "2023-01-01T12:00:02.800Z",
      "completed_at": "2023-01-01T12:00:09.600Z",
      "created_at": "2023-01-01T12:00:01.000Z"
    }
  ]
}
```

#### 5. Get Final Payment Result
```bash
curl -H 'Authorization: Bearer test_key' \
     'http://localhost:3001/payments/pi_abc123'
```

**Response (200 OK):**
```json
{
  "payment_id": "pay_xyz789",
  "payment_intent_id": "pi_abc123",
  "status": "succeeded",
  "captured_amount": 2599,
  "currency": "USD",
  "auth_code": "A1B2C3",
  "receipt_url": "https://example.com/receipt/pay_xyz789",
  "created_at": "2023-01-01T12:00:35.000Z"
}
```

#### 6. Create Refund
```bash
curl -X POST 'http://localhost:3001/refunds' \
  -H 'Authorization: Bearer test_key' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440002' \
  -H 'Content-Type: application/json' \
  -d '{
    "payment_id": "pay_xyz789",
    "amount": 1000,
    "reason": "customer_request",
    "metadata": { "refund_reason": "Product returned" }
  }'
```

**Response (201 Created):**
```json
{
  "refund_id": "ref_def456",
  "payment_id": "pay_xyz789",
  "amount": 1000,
  "currency": "USD",
  "reason": "customer_request",
  "status": "succeeded",
  "metadata": { "refund_reason": "Product returned" },
  "created_at": "2023-01-01T12:30:00.000Z"
}
```

#### 7. Health Check
```bash
curl -H 'Authorization: Bearer test_key' \
     'http://localhost:3001/health'
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Error Responses

All endpoints return consistent error format:

```json
{
  "error": {
    "type": "validation_error",
    "code": "invalid_currency", 
    "message": "Currency must be ISO 4217 format",
    "param": "currency"
  }
}
```
## System Architecture

### Idempotency Management
- All state-changing requests require unique `Idempotency-Key` headers
- Duplicate requests return cached responses to prevent double processing
- Idempotency keys automatically expire after 24 hours

### Asynchronous Processing Pipeline
- Payment state transitions: `requires_confirmation` → `processing` → `succeeded`/`failed`
- Five parallel processing jobs execute with randomized timing (5-8 seconds each)
- Processing stages: Anti-Fraud Analysis, Payment Authorization, Risk Assessment, Compliance Verification, Payment Capture
- Jobs execute independently with staggered start times for realistic processing simulation

## Application Usage

### Payment Processing Workflow
1. **Payment Intent Creation** - Initialize payment transactions with customer and transaction details
2. **Payment Confirmation** - Trigger the asynchronous processing pipeline
3. **Real-time Monitoring** - Track progress across all five processing stages
4. **Result Review** - Access complete processing history and transaction details
5. **Receipt Generation** - Create and download transaction receipts
6. **Refund Processing** - Execute full or partial refunds for completed transactions

### Supported Payment Methods
- Visa (`pm_fake_visa`)
- Mastercard (`pm_fake_mastercard`)
- American Express (`pm_fake_amex`)
- Discover (`pm_fake_discover`)

### Supported Currencies
- USD (United States Dollar)
- EUR (Euro)
- GBP (British Pound)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- JPY (Japanese Yen)

## Project Structure

```
payment-system/
├── backend/                 # Node.js API server
│   ├── lib/
│   │   ├── store.js        # In-memory data store
│   │   ├── payments.js     # Payment logic & state machine
│   │   └── jobs.js         # Processing jobs system
│   ├── server.js           # Express app & routes
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js   # API client & error handling
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── App.jsx         # Main application
│   │   └── main.jsx        # React entry point
│   ├── index.html
│   └── package.json
└── package.json           # Workspace configuration
```


## License

This project is licensed under the MIT License. See the LICENSE file for complete terms and conditions.
