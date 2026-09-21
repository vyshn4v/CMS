# Client-Level REST API Reference: Render & Email Scheduler

This document specifies the public HTTP REST APIs exposed for external client applications, microservices, and background jobs. These endpoints allow automated systems to render dynamic templates and dispatch transactional emails without interactive user sessions.

---

## 📌 Global Specifications

### Base URLs

| Environment | Base URL |
|:------------|:---------|
| **Local / Docker** | `http://localhost:5000/api/v1` |
| **Production** | `https://your-domain.com/api/v1` |

### Authentication

All client-level endpoints require an **Organization API Key** (`sk_live_...`).

| Header | Format | Required |
|:-------|:-------|:--------:|
| `Authorization` | `Bearer sk_live_<your_api_key>` | Yes* |
| `x-api-key` | `sk_live_<your_api_key>` | Yes* |

*\*Provide either `Authorization` or `x-api-key`.*

- The organization context (`orgId`) is extracted automatically from the key.
- Keys are verified against SHA-256 hashes stored in PostgreSQL.
- Rate limiting is enforced at **100 requests / 60 seconds** per API key.

---

## 1. Render API

Compiles and renders Handlebars templates, multi-field schemas, and content entries into finalized documents (HTML emails, web pages, JSON payloads, SMS messages, or push notifications).

### `POST /api/v1/render`

- **Method**: `POST`
- **Path**: `/api/v1/render`
- **Content-Type**: `application/json`
- **Authentication**: Organization API Key

#### Headers

```http
POST /api/v1/render HTTP/1.1
Host: localhost:5000
Authorization: Bearer sk_live_<your_api_key>
Content-Type: application/json
```

#### Request Body Schema

| Parameter | Type | Required | Description |
|:----------|:-----|:--------:|:------------|
| `schemaId` | `string` (UUID) | Optional* | Target ContentType (Model) UUID. Automatically resolves and renders the latest published template for this model. |
| `templateId` | `string` (UUID) | Optional* | Explicit Template UUID. |
| `contentId` | `string` (UUID) | Optional* | Published ContentEntry UUID. Stored JSONB values populate the template context. |
| `data` | `object` | Optional | Key-value dictionary matching schema fields. Required when rendering with `schemaId` or `templateId` without `contentId`. |
| `variables` | `object` | Optional | Additional Handlebars context variables (e.g., globals, year, caller metadata). |

*\*At least one of `schemaId`, `templateId`, or `contentId` must be provided.*

---

#### Request Examples

##### Example A: Render by Schema Model with Dynamic Data (Recommended)
```json
{
  "schemaId": "8f3b6c20-7214-49c5-9273-0ec38392112a",
  "data": {
    "customerName": "John Doe",
    "invoiceNumber": "INV-2026-904",
    "amount": 149.50,
    "dueDate": "2026-10-15"
  },
  "variables": {
    "supportEmail": "support@example.com"
  }
}
```

##### Example B: Render by Specific Template UUID
```json
{
  "templateId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "data": {
    "name": "Jane Smith",
    "activationLink": "https://example.com/verify?token=xyz"
  }
}
```

##### Example C: Render Stored Content Entry
```json
{
  "contentId": "d1e4c7b8-1a2b-3c4d-5e6f-7a8b9c0d1e2f"
}
```

---

#### cURL Request

```bash
curl -X POST http://localhost:5000/api/v1/render \
  -H "Authorization: Bearer sk_live_9b4e7810a9c8b7f2" \
  -H "Content-Type: application/json" \
  -d '{
    "schemaId": "8f3b6c20-7214-49c5-9273-0ec38392112a",
    "data": {
      "customerName": "John Doe",
      "invoiceNumber": "INV-2026-904",
      "amount": 149.50
    }
  }'
```

---

#### Response Schema

##### `200 OK` (Email Model Output)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "type": "EMAIL",
    "output": {
      "subject": "Invoice INV-2026-904 for John Doe",
      "body": "<h1>Invoice INV-2026-904</h1><p>Dear John Doe, your balance of $149.50 is ready.</p>",
      "preheader": "Your latest invoice is now available."
    }
  },
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

##### `200 OK` (Push Notification Model Output)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "type": "PUSH_NOTIFICATION",
    "output": {
      "title": "Payment Confirmed",
      "message": "Hi John Doe, we received your payment of $149.50.",
      "deep_link": "app://invoices/INV-2026-904"
    }
  },
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

##### `200 OK` (HTML Page Output)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "type": "HTML_PAGE",
    "output": {
      "html": "<!DOCTYPE html><html><body><h1>Welcome John Doe</h1></body></html>"
    }
  },
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

---

## 2. Scheduler Dispatch API

Triggers or schedules asynchronous email deliveries through dynamic BullMQ Redis queue workers. Supports immediate delivery and future scheduled dates with automatic retries and execution logging.

### `POST /api/v1/schedulers/dispatch`

- **Method**: `POST`
- **Path**: `/api/v1/schedulers/dispatch`
- **Content-Type**: `application/json`
- **Authentication**: Organization API Key
- **Success Status**: `202 Accepted`

#### Headers

```http
POST /api/v1/schedulers/dispatch HTTP/1.1
Host: localhost:5000
Authorization: Bearer sk_live_<your_api_key>
Content-Type: application/json
```

#### Request Body Schema

| Parameter | Type | Required | Description |
|:----------|:-----|:--------:|:------------|
| `schedulerId` | `string` (UUID) | **Yes** | Target EmailScheduler pipeline UUID. |
| `to` | `string` | Optional | Recipient email address. Defaults to scheduler configuration or system `.env` administrator. |
| `cc` | `string` | Optional | Carbon copy recipient email address. |
| `bcc` | `string` | Optional | Blind carbon copy recipient email address. |
| `from` | `string` | Optional | Sender address override (e.g. `Billing Team <billing@acme.com>`). Must match authenticated SMTP domain. |
| `scheduledFor` | `string` (ISO 8601) | Optional | Future execution timestamp (UTC). If omitted or in the past, dispatches immediately. |
| `queueId` | `string` (UUID) | Optional | Custom queue override ID. |
| `data` | `object` | Optional | Dynamic data payload injected into the scheduler's bound template context. |

---

#### Request Examples

##### Example A: Immediate Email Dispatch
```json
{
  "schedulerId": "4a7b9c10-5e6f-4a3b-8c2d-1e0f9a8b7c6d",
  "to": "customer@example.com",
  "data": {
    "customerName": "Alice Smith",
    "orderNumber": "ORD-5541",
    "trackingUrl": "https://example.com/track/5541"
  }
}
```

##### Example B: Delayed / Future Scheduled Email
```json
{
  "schedulerId": "4a7b9c10-5e6f-4a3b-8c2d-1e0f9a8b7c6d",
  "to": "customer@example.com",
  "scheduledFor": "2026-10-01T08:00:00.000Z",
  "data": {
    "customerName": "Alice Smith",
    "renewalDate": "2026-10-05"
  }
}
```

##### Example C: Custom Sender & CC Routing
```json
{
  "schedulerId": "4a7b9c10-5e6f-4a3b-8c2d-1e0f9a8b7c6d",
  "from": "Acme Billing <billing@example.com>",
  "to": "client@example.com",
  "cc": "account-manager@example.com",
  "bcc": "audit@example.com",
  "data": {
    "invoiceId": "INV-771"
  }
}
```

---

#### cURL Request

```bash
curl -X POST http://localhost:5000/api/v1/schedulers/dispatch \
  -H "Authorization: Bearer sk_live_9b4e7810a9c8b7f2" \
  -H "Content-Type: application/json" \
  -d '{
    "schedulerId": "4a7b9c10-5e6f-4a3b-8c2d-1e0f9a8b7c6d",
    "to": "alice@example.com",
    "scheduledFor": "2026-10-01T08:00:00.000Z",
    "data": {
      "customerName": "Alice Smith",
      "amount": 250.00
    }
  }'
```

---

#### Response Schema

##### `202 Accepted`
```json
{
  "success": true,
  "statusCode": 202,
  "data": {
    "scheduledEmailId": "7c8e9f01-2a3b-4c5d-6e7f-8a9b0c1d2e3f",
    "status": "SCHEDULED",
    "scheduledFor": "2026-10-01T08:00:00.000Z",
    "recipient": "alice@example.com"
  },
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

- **Lifecycle**: The job begins with status `SCHEDULED`, advances to `PROCESSING` when picked up by a BullMQ worker, and transitions to `COMPLETED` upon SMTP handshake.
- **Failures & Retries**: If the SMTP server is unreachable, BullMQ retries 3 times with exponential backoff (5s, 10s, 20s). If all retries fail, status becomes `FAILED`.
- **Audit**: All scheduled emails and their delivery status can be inspected via `GET /api/v1/orgs/:orgId/scheduled-emails`.

---

## 3. Standard HTTP Status Codes & Errors

All error responses adhere to the standard CMS JSON envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Property \"schedulerId\" is required in request payload"
  },
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

| HTTP Status | Error Code | Description |
|:-----------:|:-----------|:------------|
| **400 Bad Request** | `VALIDATION_ERROR` | Missing required payload parameters or invalid JSON structure. |
| **400 Bad Request** | `TEMPLATE_NOT_PUBLISHED` | Target template exists but has no published draft. |
| **401 Unauthorized** | `MISSING_API_KEY` | `Authorization` or `x-api-key` header is missing. |
| **401 Unauthorized** | `INVALID_API_KEY` | Provided API key is inactive, revoked, or does not exist. |
| **404 Not Found** | `TEMPLATE_NOT_FOUND` | Template or model does not exist in the caller organization. |
| **404 Not Found** | `SCHEDULER_NOT_FOUND` | `schedulerId` does not match any scheduler in the organization. |
| **404 Not Found** | `CONTENT_NOT_FOUND` | `contentId` does not match any entry in the organization. |
| **429 Too Many Requests** | `THROTTLE_LIMIT_EXCEEDED` | Rate limit of 100 requests per 60 seconds was exceeded. |
| **500 Internal Server Error** | `INTERNAL_SERVER_ERROR` | Unhandled rendering or queue infrastructure error. |
