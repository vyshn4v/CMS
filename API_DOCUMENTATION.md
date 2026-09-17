# CMS Headless — API Documentation

Welcome to the **Headless CMS API Reference**. This documentation covers all RESTful endpoints, authentication workflows, data models, error handling conventions, and integration examples for consuming and managing content.

---

## 📌 Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Base URL & Environments](#base-url--environments)
3. [Authentication & Authorization](#authentication--authorization)
4. [Standard Request & Response Formats](#standard-request--response-formats)
5. [RBAC Permission Matrix](#rbac-permission-matrix)
6. [API Endpoints Reference](#api-endpoints-reference)
   - [1. Authentication (`/api/v1/auth`)](#1-authentication)
   - [2. Organizations (`/api/v1/orgs`)](#2-organizations)
   - [3. Roles & Permissions (`/api/v1/permissions`, `/api/v1/orgs/:orgId/roles`)](#3-roles--permissions)
   - [4. Schema Builder — Content Types (`/api/v1/orgs/:orgId/schemas`)](#4-schema-builder--content-types)
   - [5. Component Library (`/api/v1/orgs/:orgId/components`)](#5-component-library)
   - [6. Content Entries (`/api/v1/orgs/:orgId/content/:slug`)](#6-content-entries)
   - [7. Template Engine (`/api/v1/orgs/:orgId/templates`)](#7-template-engine)
   - [8. Public Render API (`/api/v1/render`)](#8-public-render-api)
   - [9. API Key Management (`/api/v1/orgs/:orgId/api-keys`)](#9-api-key-management)
   - [10. Audit Logs (`/api/v1/orgs/:orgId/audit-logs`)](#10-audit-logs)
7. [Handlebars Helper Reference](#handlebars-helper-reference)
8. [Error Codes & Troubleshooting](#error-codes--troubleshooting)

---

## Overview & Architecture

The Headless CMS exposes a RESTful JSON API built on NestJS. Key architectural characteristics include:
- **Org-Scoped Isolation**: All schemas, content entries, templates, API keys, and custom roles belong to a specific Organization (`orgId`).
- **JSONB Content Storage**: Dynamic schemas and structured entries are persisted in PostgreSQL JSONB columns without dynamic database migrations.
- **Draft & Publish Lifecycle**: Content entries and templates maintain distinct draft and published states (`publishedData` / `bodyPublished`).
- **Redis Caching**: Published templates (24h TTL), published entries (1h TTL), and compiled Handlebars delegates are cached for low-latency delivery.
- **Delivery Rendering**: External consumers invoke `POST /api/v1/render` using organization-scoped API Keys (`sk_live_...`) to render multi-field templates on demand.

---

## Base URL & Environments

| Environment | Base URL | Description |
|:------------|:---------|:------------|
| **Local Development** | `http://localhost:5000/api/v1` | Local NestJS backend server |
| **Production** | `https://your-domain.com/api/v1` | Single-port monolith or reverse proxy |

All endpoints are versioned with the `/api/v1` prefix.

---

## Authentication & Authorization

The CMS supports two primary authentication modes:

### 1. User Authentication (JWT Cookie / Bearer Token)
Used by the CMS Web Dashboard and administrative tools:
- **Cookie Auth**: `jwt` HttpOnly cookie set on Google OAuth login.
- **Header Auth**: `Authorization: Bearer <jwt_token>` (optional alternative).
- **Organization Context**: Specified via the path (`/orgs/:orgId/...`) or via header `X-Org-Id: <org_uuid>`.

### 2. Machine-to-Machine Authentication (API Keys)
Used by backend services, mobile apps, microservices, and static site generators:
- **Header Auth**: `Authorization: Bearer sk_live_<hex_token>`
- Automatically scoped to the organization that owns the key.
- Primary use case: **Public Render API** (`POST /api/v1/render`).

---

## Standard Request & Response Formats

### Standard Request Headers
```http
Content-Type: application/json
Authorization: Bearer <token_or_api_key>
X-Org-Id: <organization_uuid>  # Optional when orgId is in URL
```

### Standard Success Response Envelope
All successful API responses return HTTP 200/201 wrapped in a standard envelope:
```json
{
  "status": 200,
  "data": {
    "id": "c1f6b860-23ef-4899-b1d5-bc9eb8907fcb",
    "name": "Landing Page",
    "slug": "landing-page"
  }
}
```

### Standard Error Response Envelope
When an error occurs, the server responds with a structured JSON error object:
```json
{
  "statusCode": 403,
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing required permission: schema.update"
  },
  "timestamp": "2026-09-16T15:20:00.000Z",
  "path": "/api/v1/orgs/68a127f8-3e4b-4ec2-9e8a-8bebaaa6f6fe/schemas/c1f6b860-23ef-4899-b1d5-bc9eb8907fcb"
}
```

---

## RBAC Permission Matrix

Granular permissions protect all mutating and sensitive operations. System roles (Super Admin, Editor, Viewer) come seeded:

| Permission | Description | Seeded in Editor | Seeded in Viewer |
|:---|:---|:---:|:---:|
| `org.read` | View organization settings & members | ✅ | ✅ |
| `org.update` | Update organization profile & slug | ❌ | ❌ |
| `org.invite` | Invite new members | ❌ | ❌ |
| `org.remove_member` | Remove members from organization | ❌ | ❌ |
| `role.read` | View roles and assigned permissions | ✅ | ✅ |
| `role.manage` | Assign roles to members | ❌ | ❌ |
| `role.create` / `update` / `delete` | Manage custom roles | ❌ | ❌ |
| `schema.read` | View schemas and components | ✅ | ✅ |
| `schema.create` | Create new Content Types or components | ✅ | ❌ |
| `schema.update` | Edit schema fields, validations, or rules | ✅ | ❌ |
| `schema.delete` | Delete Content Types or components | ❌ | ❌ |
| `content.read` | Read content entries | ✅ | ✅ |
| `content.create` | Draft new content entries | ✅ | ❌ |
| `content.update` | Edit existing draft entries | ✅ | ❌ |
| `content.delete` | Permanently delete entries | ❌ | ❌ |
| `content.publish` | Publish or unpublish content entries | ✅ | ❌ |
| `template.read` | Read templates | ✅ | ✅ |
| `template.create` | Create templates | ✅ | ❌ |
| `template.update` | Edit draft templates | ✅ | ❌ |
| `template.publish` | Publish or unpublish templates | ✅ | ❌ |
| `template.delete` | Delete templates | ❌ | ❌ |
| `apikey.read` | List organization API keys | ✅ | ❌ |
| `apikey.create` | Generate delivery API keys | ❌ | ❌ |
| `apikey.revoke` | Revoke API keys | ❌ | ❌ |
| `audit.read` | View activity audit logs | ❌ | ❌ |

---

## API Endpoints Reference

### 1. Authentication

#### Initiate Google OAuth
```http
GET /api/v1/auth/google
```
Redirects client to Google's consent screen.

#### OAuth Callback
```http
GET /api/v1/auth/google/callback
```
Handles Google redirection, verifies the email against `ALLOWED_EMAILS` (if configured), sets the `jwt` HttpOnly cookie, and redirects to the frontend dashboard.

#### Get Current User Profile & Permissions
```http
GET /api/v1/auth/me
```
Returns authenticated user details, organizations, role, and granted permissions.

**Example Request**:
```bash
curl -X GET "http://localhost:5000/api/v1/auth/me" \
  -H "Cookie: jwt=<your_jwt_token>"
```

**Example Response**:
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "68a127f8-3e4b-4ec2-9e8a-8bebaaa6f6fe",
      "email": "developer@example.com",
      "name": "Jane Developer",
      "avatarUrl": "https://lh3.googleusercontent.com/a/..."
    },
    "organizations": [
      {
        "id": "c9201bd7-6c2e-4b67-9c94-ff8da3f78e47",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "role": "Super Admin",
        "permissions": ["*"]
      }
    ]
  }
}
```

#### Logout
```http
POST /api/v1/auth/logout
```
Clears the `jwt` authentication cookie.

---

### 2. Organizations

#### List User Organizations
```http
GET /api/v1/orgs
```
Returns all organizations the authenticated user belongs to.

#### Create Organization
```http
POST /api/v1/orgs
```
Creates a new organization. The creator is automatically assigned the `Super Admin` system role.

**Request Body**:
```json
{
  "name": "Marketing Studio",
  "slug": "marketing-studio"
}
```

#### Get Organization by ID
```http
GET /api/v1/orgs/:orgId
```
**Permission**: `org.read`

#### Update Organization
```http
PATCH /api/v1/orgs/:orgId
```
**Permission**: `org.update`

**Request Body**:
```json
{
  "name": "Marketing Studio Global",
  "slug": "marketing-studio-global"
}
```

#### List Organization Members
```http
GET /api/v1/orgs/:orgId/members
```
**Permission**: `org.read`

#### Invite Member
```http
POST /api/v1/orgs/:orgId/members/invite
```
**Permission**: `org.invite`

**Request Body**:
```json
{
  "email": "colleague@example.com",
  "roleId": "d05fe7b3-cf01-4475-b82b-8a1dc31fe6b2"
}
```

#### Update Member Role
```http
PATCH /api/v1/orgs/:orgId/members/:memberId/role
```
**Permission**: `role.manage`

**Request Body**:
```json
{
  "roleId": "d05fe7b3-cf01-4475-b82b-8a1dc31fe6b2"
}
```

#### Remove Member
```http
DELETE /api/v1/orgs/:orgId/members/:memberId
```
**Permission**: `org.remove_member`

---

### 3. Roles & Permissions

#### List System Permissions
```http
GET /api/v1/permissions
```
Returns all available granular permissions grouped by domain.

#### List Organization Roles
```http
GET /api/v1/orgs/:orgId/roles
```
**Permission**: `role.read`

#### Create Custom Role
```http
POST /api/v1/orgs/:orgId/roles
```
**Permission**: `role.create`

**Request Body**:
```json
{
  "name": "Content Author",
  "description": "Can create and update content entries, but cannot publish or manage schemas.",
  "permissions": [
    "content.read",
    "content.create",
    "content.update",
    "template.read"
  ]
}
```

#### Update Custom Role
```http
PATCH /api/v1/orgs/:orgId/roles/:id
```
**Permission**: `role.update`

#### Delete Custom Role
```http
DELETE /api/v1/orgs/:orgId/roles/:id
```
**Permission**: `role.delete`

---

### 4. Schema Builder — Content Types

Content Types define structured models (`COLLECTION` or `SINGLE`) using a dynamic JSONB schema.

#### List Content Types
```http
GET /api/v1/orgs/:orgId/schemas
```
**Permission**: `schema.read`

#### Create Content Type
```http
POST /api/v1/orgs/:orgId/schemas
```
**Permission**: `schema.create`

**Request Body**:
```json
{
  "name": "Blog Article",
  "slug": "blog-articles",
  "description": "Editorial articles with rich text and metadata.",
  "kind": "COLLECTION",
  "schema": {
    "fields": [
      {
        "name": "title",
        "label": "Article Title",
        "type": "text",
        "required": true,
        "validations": {
          "minLength": 3,
          "maxLength": 120
        }
      },
      {
        "name": "body",
        "label": "Content Body",
        "type": "richtext",
        "required": true
      },
      {
        "name": "author",
        "label": "Author",
        "type": "relation",
        "relation": {
          "targetSchema": "authors",
          "cardinality": "many-to-one",
          "displayField": "name"
        }
      },
      {
        "name": "sections",
        "label": "Dynamic Sections",
        "type": "dynamiczone",
        "dynamiczone": {
          "allowedComponents": ["hero-banner", "faq-accordion"]
        }
      }
    ]
  }
}
```

#### Get Content Type by ID or Slug
```http
GET /api/v1/orgs/:orgId/schemas/:id
GET /api/v1/orgs/:orgId/schemas/slug/:slug
```
**Permission**: `schema.read`

#### Update Content Type
```http
PATCH /api/v1/orgs/:orgId/schemas/:id
```
**Permission**: `schema.update`

#### Delete Content Type
```http
DELETE /api/v1/orgs/:orgId/schemas/:id
```
**Permission**: `schema.delete`

---

### 5. Component Library

Components are reusable groups of fields embedded within Content Types or Dynamic Zones.

#### List Components
```http
GET /api/v1/orgs/:orgId/components
```
**Permission**: `schema.read`

#### Create Component
```http
POST /api/v1/orgs/:orgId/components
```
**Permission**: `schema.create`

**Request Body**:
```json
{
  "name": "Hero Banner",
  "slug": "hero-banner",
  "category": "layout",
  "schema": {
    "fields": [
      { "name": "heading", "label": "Heading", "type": "text", "required": true },
      { "name": "subheading", "label": "Subheading", "type": "text" },
      { "name": "ctaUrl", "label": "CTA Link", "type": "text" }
    ]
  }
}
```

#### Update Component
```http
PATCH /api/v1/orgs/:orgId/components/:id
```
**Permission**: `schema.update`

#### Delete Component
```http
DELETE /api/v1/orgs/:orgId/components/:id
```
**Permission**: `schema.delete`

---

### 6. Content Entries

Content entry endpoints manage records under a specific model. You may pass either the **slug** (e.g. `blog-articles`) or the **schemaId** (UUID) in the `:slug` path parameter.

#### List Content Entries
```http
GET /api/v1/orgs/:orgId/content/:slug?page=1&limit=20&status=PUBLISHED&search=welcome
```
**Permission**: `content.read`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (`DRAFT` | `PUBLISHED`)
- `search` (keyword search across entry text fields)

#### Create Content Entry
```http
POST /api/v1/orgs/:orgId/content/:slug
```
**Permission**: `content.create`

**Request Body**:
```json
{
  "data": {
    "title": "Getting Started with Headless CMS",
    "body": "<h2>Welcome!</h2><p>Here is how our content engine works...</p>",
    "author": "3e944746-fd7c-48be-850d-27b9c9f6a195"
  },
  "publish": false
}
```
*Set `publish: true` to create and publish atomically.*

#### Get Single Content Entry
```http
GET /api/v1/orgs/:orgId/content/:slug/:id
```
**Permission**: `content.read`  
*Automatically resolves related records into `_populated` for immediate client consumption.*

#### Update Content Entry Draft
```http
PATCH /api/v1/orgs/:orgId/content/:slug/:id
```
**Permission**: `content.update`

**Request Body**:
```json
{
  "data": {
    "title": "Getting Started with Headless CMS (v2)"
  }
}
```

#### Publish Content Entry
```http
POST /api/v1/orgs/:orgId/content/:slug/:id/publish
```
**Permission**: `content.publish`  
Snapshots `data` into `publishedData`, flips `status` to `PUBLISHED`, and invalidates entry cache.

#### Unpublish Content Entry
```http
POST /api/v1/orgs/:orgId/content/:slug/:id/unpublish
```
**Permission**: `content.publish`  
Clears `publishedData` snapshot, sets `status` to `DRAFT`.

#### Delete Content Entry
```http
DELETE /api/v1/orgs/:orgId/content/:slug/:id
```
**Permission**: `content.delete`

---

### 7. Template Engine

Templates bind to a Target Model (`contentTypeId`) and declare Handlebars formulas for each field declared in the Model's schema.

#### List Templates
```http
GET /api/v1/orgs/:orgId/templates?contentTypeId=<uuid>&type=HTML_PAGE&status=PUBLISHED
```
**Permission**: `template.read`

#### Create Template
```http
POST /api/v1/orgs/:orgId/templates
```
**Permission**: `template.create`

**Request Body**:
```json
{
  "name": "Standard Article Template",
  "type": "HTML_PAGE",
  "contentTypeId": "c1f6b860-23ef-4899-b1d5-bc9eb8907fcb",
  "fieldsDraft": {
    "title": "{{title}}",
    "body": "<article><h1>{{title}}</h1><div>{{{body}}}</div><p>By {{author.name}}</p></article>"
  }
}
```

#### Preview Unsaved Draft Template
```http
POST /api/v1/orgs/:orgId/templates/preview-raw
```
**Permission**: `template.read`

**Request Body**:
```json
{
  "type": "HTML_PAGE",
  "fieldsDraft": {
    "greeting": "Hello {{name}}, welcome to {{company}}!"
  },
  "variables": {
    "name": "Jane",
    "company": "Acme Inc"
  }
}
```

#### Update Template
```http
PATCH /api/v1/orgs/:orgId/templates/:id
```
**Permission**: `template.update`

#### Publish Template
```http
POST /api/v1/orgs/:orgId/templates/:id/publish
```
**Permission**: `template.publish`

#### Unpublish Template
```http
POST /api/v1/orgs/:orgId/templates/:id/unpublish
```
**Permission**: `template.update`

#### Delete Template
```http
DELETE /api/v1/orgs/:orgId/templates/:id
```
**Permission**: `template.delete`

---

### 8. Public Render API

The Public Render API is the core external integration point for backend applications, microservices, mobile apps, and Jamstack frontends.

```http
POST /api/v1/render
```
**Authentication**: API Key (`Authorization: Bearer sk_live_...`)  
**Rate Limit**: 100 requests / minute per key

#### Request Body Parameters
| Parameter | Type | Required | Description |
|:---|:---|:---:|:---|
| `schemaId` | string (UUID) | Conditionally | The immutable UUID of the target Content Type (Model). Preferred over template ID. |
| `templateId` | string (UUID) | Conditionally | Direct template UUID if calling a specific template explicitly. |
| `contentId` | string (UUID) | Optional | Published content entry ID to inject content fields automatically. |
| `data` | object | Optional | Runtime dynamic input payload passed by the caller. Merged with content entry data. |
| `variables` | object | Optional | Auxiliary template variables. |

#### Example cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/render" \
  -H "Authorization: Bearer sk_live_<your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "schemaId": "c1f6b860-23ef-4899-b1d5-bc9eb8907fcb",
    "data": {
      "customerName": "Alice Smith",
      "invoiceNumber": "INV-2026-001",
      "amount": 499.00,
      "dueDate": "2026-10-01"
    }
  }'
```

#### Example Output Response
```json
{
  "status": 200,
  "data": {
    "type": "EMAIL",
    "output": {
      "subject": "Invoice INV-2026-001 Due Soon",
      "body": "<html><body><h2>Invoice for Alice Smith</h2><p>Amount: $499.00</p></body></html>"
    }
  }
}
```

---

### 9. API Key Management

#### List API Keys
```http
GET /api/v1/orgs/:orgId/api-keys
```
**Permission**: `apikey.read`  
Returns key prefixes, name, created date, and last used timestamp.

#### Generate API Key
```http
POST /api/v1/orgs/:orgId/api-keys
```
**Permission**: `apikey.create`

**Request Body**:
```json
{
  "name": "Production Delivery Key"
}
```

**Response**:
```json
{
  "status": 201,
  "data": {
    "id": "0d2c94bb-d45c-44ec-9c41-26ec0a38f4d9",
    "name": "Production Delivery Key",
    "prefix": "sk_live_4f9d",
    "key": "sk_live_<your_generated_key>",
    "createdAt": "2026-09-16T15:00:00.000Z"
  }
}
```
> [!IMPORTANT]
> The full plaintext `key` is returned **only once** in this response. Store it securely.

#### Revoke API Key
```http
DELETE /api/v1/orgs/:orgId/api-keys/:id
```
**Permission**: `apikey.revoke`  
Permanently revokes the key. Subsequent calls using this key will immediately return HTTP 401.

---

### 10. Audit Logs

Tracks all mutating actions (`POST`, `PATCH`, `PUT`, `DELETE`) across the organization.

#### Query Audit Trail
```http
GET /api/v1/orgs/:orgId/audit-logs?page=1&limit=25&action=PUBLISH&resourceType=CONTENT_ENTRY
```
**Permission**: `audit.read`

**Query Parameters**:
- `page`, `limit` (pagination)
- `action` (`CREATE`, `UPDATE`, `DELETE`, `PUBLISH`, `UNPUBLISH`, `INVITE`)
- `resourceType` (`SCHEMA`, `COMPONENT`, `CONTENT_ENTRY`, `TEMPLATE`, `API_KEY`, `MEMBER`, `ROLE`)
- `userId` (filter by actor)
- `search` (keyword match against metadata or IP)
- `startDate`, `endDate` (ISO date range)

---

## Handlebars Helper Reference

The Handlebars template engine registers custom helpers for data formatting:

| Helper | Syntax | Example | Output |
|:---|:---|:---|:---|
| **formatDate** | `{{formatDate date "YYYY-MM-DD"}}` | `{{formatDate createdAt "MMMM D, YYYY"}}` | `September 16, 2026` |
| **uppercase** | `{{uppercase string}}` | `{{uppercase status}}` | `PUBLISHED` |
| **lowercase** | `{{lowercase string}}` | `{{lowercase role}}` | `editor` |
| **truncate** | `{{truncate text 50}}` | `{{truncate summary 20}}` | `Short intro text...` |
| **ifEquals** | `{{#ifEquals a b}}...{{/ifEquals}}` | `{{#ifEquals kind "VIP"}}★{{/ifEquals}}` | Conditional output |
| **json** | `{{json object}}` | `{{json user}}` | `{"name":"Alex"}` |

---

## Error Codes & Troubleshooting

| HTTP Status | Code | Meaning | Remediation |
|:---|:---|:---|:---|
| **400** | `BAD_REQUEST` | Validation failed or invalid payload syntax | Inspect `error.details` for field-level validation errors. |
| **401** | `UNAUTHORIZED` | Missing or expired JWT session or invalid API Key | Log in again or generate a fresh API key. |
| **403** | `FORBIDDEN` | Missing required RBAC permission | Request the required permission from an Organization Super Admin. |
| **404** | `NOT_FOUND` | Resource (schema, template, entry, org) does not exist | Verify the ID or slug and organization context. |
| **409** | `CONFLICT` | Slug or unique constraint collision | Choose a unique slug or name. |
| **429** | `TOO_MANY_REQUESTS` | Rate limit exceeded | Back off and retry; default render limit is 100 req/min. |
| **500** | `INTERNAL_SERVER_ERROR` | Unexpected server condition | Check backend logs via `docker logs cms-monolith`. |
