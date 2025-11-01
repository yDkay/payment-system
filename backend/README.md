# Payment Processing Backend API

Node.js Express API implementing async payment processing with idempotency and proper error handling.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start
```

Server runs on http://localhost:3001 (configurable via PORT env var)

## 🔧 Configuration

Environment variables (create `.env` file):

```bash
PORT=3001                # Server port
API_KEY=test_key         # Bearer token for authentication
ASYNC_DELAY=2000         # Base processing delay in milliseconds
```

## 📡 API Reference

### Authentication
All endpoints require `Authorization: Bearer {API_KEY}` header.

### Idempotency
POST/PATCH endpoints require `Idempotency-Key: {uuid}` header to prevent duplicates.

### Endpoints

#### Health Check
```
GET /health
```
Returns server status and timestamp.

#### Create Payment Intent
```
POST /payment_intents
Headers: Authorization, Idempotency-Key
Body: {
  "amount": 2599,                    # Amount in cents
  "currency": "USD",                 # ISO 4217 currency code
  "customer_id": "cus_123",          # Customer identifier
  "payment_method_id": "pm_fake_visa", # Payment method
  "capture_method": "automatic",     # "automatic" or "manual"
  "metadata": { "orderId": "ORD-1001" }
}
```

**Response (201):**
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
  "metadata": { "orderId": "ORD-1001" }
}
```

#### Confirm Payment Intent
```
PATCH /payment_intents/:id/confirm[?force=failure]
Headers: Authorization, Idempotency-Key
Body: {
  "payment_method_id": "pm_fake_visa"  # Optional override
}
```

**Response (202):**
```json
{
  "id": "pi_abc123",
  "status": "processing"
}
```

#### Get Payment Intent Status
```
GET /payment_intents/:id
Headers: Authorization
```

**Response (200):**
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
  "updated_at": "2023-01-01T12:00:05.000Z"
}
```

#### Get Payment Result
```
GET /payments/:intentId
Headers: Authorization
```

**Response (200):**
```json
{
  "payment_id": "pay_xyz789",
  "payment_intent_id": "pi_abc123",
  "status": "succeeded",
  "captured_amount": 2599,
  "auth_code": "A1B2C3",
  "receipt_url": "https://example.com/receipt/pay_xyz789"
}
```

**Response (425 - Too Early):**
```json
{
  "error": "processing"
}
```

#### Create Refund
```
POST /refunds
Headers: Authorization, Idempotency-Key
Body: {
  "payment_id": "pay_xyz789",
  "amount": 1000,                    # Amount in cents
  "reason": "requested_by_customer"
}
```

**Response (201):**
```json
{
  "id": "re_def456",
  "payment_id": "pay_xyz789",
  "amount": 1000,
  "reason": "requested_by_customer",
  "status": "succeeded",
  "created_at": "2023-01-01T12:05:00.000Z"
}
```

### Error Responses

All errors follow consistent format:

```json
{
  "error": {
    "type": "validation_error",
    "code": "invalid_currency",
    "message": "Currency must be ISO 4217",
    "param": "currency"
  }
}
```

**Error Types:**
- `validation_error` - Invalid input data (422)
- `card_error` - Payment method issues (422)
- `auth_error` - Authentication problems (401)
- `invalid_request_error` - Bad request format (400, 404, 409)
- `rate_limit_error` - Too many requests (429)
- `api_error` - Server errors (500)

## 🏗 Architecture

### Data Storage (`lib/store.js`)
- In-memory Maps for fast lookups
- Idempotency key tracking with TTL
- Simple rate limiting per client IP
- Cleanup of expired data

### Payment Logic (`lib/payments.js`)
- State machine for payment status transitions
- Async processing simulation with configurable delays
- Validation for all input parameters
- Custom error classes for different scenarios

### Server (`server.js`)
- Express middleware for auth, rate limiting, CORS
- Idempotency handling with automatic deduplication
- Comprehensive error handling and logging
- Request/response logging for debugging

## 🔄 Payment State Machine

```
requires_confirmation → processing → succeeded
                                  ↘ failed
```

**Status Descriptions:**
- `requires_confirmation` - Intent created, awaiting confirmation
- `processing` - Payment being processed asynchronously (2-5 seconds)
- `succeeded` - Payment completed successfully
- `failed` - Payment failed (10% random chance or forced)
- `canceled` - Payment canceled (not implemented in demo)


