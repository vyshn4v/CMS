# Headless CMS & Universal Template Engine

A production-grade, developer-first Headless Content Management System and Universal Template Engine built with **NestJS**, **React (Vite + Tailwind CSS)**, **PostgreSQL (Prisma ORM)**, **Redis**, and **Handlebars**.

Designed to run efficiently as a single-port monolith deployable on constrained environments such as an **Oracle Cloud Free Tier VM (1GB RAM / 1 vCPU)**.

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    Client["External Apps / Consumers\n(Web, Mobile, Backend Services)"] -->|"Bearer sk_live_...\nPOST /api/v1/render"| RenderAPI["Public Render API\n(ApiKeyGuard)"]
    AdminUser["CMS Authors & Admins\n(Browser)"] -->|"Google OAuth / JWT Cookie"| Dashboard["CMS Studio (React SPA)\n(Vite + Shadcn UI)"]

    subgraph "CMS Monolith Container (:5000)"
        Dashboard -.->|"Served statically in prod"| StaticServer["NestJS ServeStaticModule"]
        RenderAPI --> CacheLayer["Redis Caching Layer\n(ioredis)"]
        Dashboard --> APIEngine["NestJS API Modules\n(Auth, RBAC, Schemas, Templates, Content, Audit)"]
        APIEngine --> CacheLayer
        APIEngine --> HandlebarsEngine["Handlebars Engine\n(LRU Delegate Cache & Helpers)"]
        APIEngine --> DBGateway["Prisma ORM Gateway"]
        RenderAPI --> HandlebarsEngine
    end

    CacheLayer <-->|"Sub-ms reads & invalidations"| Redis[("Redis 7 (LRU 50MB)")]
    DBGateway <-->|"PostgreSQL 16\n(JSONB Data Store)"| Postgres[("PostgreSQL 16")]
```

---

## ✨ Key Features

- **Universal Schema Builder**:
  - Declarative content modeling with JSONB storage.
  - Supports `text`, `richtext`, `number`, `boolean`, `date`, `datetime`, `json`, `email`, `enum`, `media`, `relation`, `component`, and `dynamiczone`.
  - Dynamic runtime validation generated dynamically with **Zod**.
  - Composable, repeatable components and dynamic block zones.

- **Universal HTML Template Engine**:
  - **Model as Target Output Schema**: The schema defines the structured output format expected by external consumers.
  - **Dynamic Input Context**: Callers pass arbitrary variable payloads at runtime without pre-enforcing artificial schemas.
  - Dual-mode editor: visual editor and code editor with Handlebars variable autocompletion.
  - Comprehensive custom helpers: `formatDate`, `uppercase`, `lowercase`, `truncate`, `ifEquals`, `ifNotEquals`, `json`.
  - Live preview with automatic variable extraction and interactive JSON output inspector.

- **Public Delivery & Render API (`POST /api/v1/render`)**:
  - Authenticated via cryptographically secure delivery API keys (`sk_live_...`).
  - Resolves target templates by immutable `schemaId` (Model) or explicit `templateId`.
  - Combines published content entries (`contentId`) with caller-supplied `data` and `variables`.

- **Multi-Tenant Workspaces & RBAC**:
  - Google OAuth 2.0 authentication with HttpOnly JWT session cookies and email gating (`ALLOWED_EMAILS`).
  - Workspace management with member invitations and custom roles.
  - Granular permission matrix enforcing permissions on all endpoints.

- **Enterprise Caching & Performance**:
  - Global Redis caching layer with graceful degradation (never drops API requests if Redis is offline).
  - Published template cache (`tmpl:pub:{id}`) with 24h TTL.
  - Published content entry cache (`entry:pub:{id}`) with 1h TTL.
  - User permissions cache (`user:perms:{userId}:{orgId}`) for sub-millisecond route authorization.
  - In-memory LRU cache (500 items) for compiled Handlebars delegates.

- **Immutable Audit Logging**:
  - Non-blocking global `AuditInterceptor` recording mutating operations (`POST`, `PATCH`, `PUT`, `DELETE`).
  - Filterable audit trail viewer (`/settings/audit-logs`) with actor chips, action badges, and metadata JSON inspector.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20+
- **Docker Desktop** / Docker Engine (for local PostgreSQL & Redis)

### 2. Clone & Install
```bash
git clone https://github.com/your-username/cms.git
cd cms
npm install
```

### 3. Configure Environment
Copy the sample environment file:
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL, Redis, and Google OAuth credentials.

### 4. Start Infrastructure Containers
```bash
docker compose up -d
```
This boots:
- PostgreSQL 16 on port `5434`
- Redis 7 on port `6379`

### 5. Run Database Migrations & Seeds
```bash
npm run prisma:migrate
npm run prisma:seed
```

### 6. Start Development Servers
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000/api/v1`
- **Frontend Studio**: `http://localhost:5173`

---

## 🧪 Testing

Run all unit tests across the workspace:
```bash
npm run test
```

Run E2E security and render tests:
```bash
npm run test:e2e -w @cms/api
```

---

## 📦 Production Deployment (Single-Port Monolith)

The system is optimized to build into a lightweight Alpine container that serves both the API and the React SPA on a single port (`5000`) under a strict 1GB RAM budget.

### Automated CI/CD & Remote Server Deployment
For automated continuous deployment using **GitHub Actions**, **SSH**, and **PM2** directly to your remote Linux VM (Ubuntu/Oracle Cloud), see the full guide:
👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Run with Production Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Resource Allocation (1GB Oracle Cloud Budget)
| Component | Memory Limit | Purpose |
|:----------|:-------------|:--------|
| **PostgreSQL 16** | 256 MB | Relational schema and JSONB content store |
| **Redis 7** | 64 MB | In-memory cache with LRU eviction (`maxmemory 50mb`) |
| **CMS Monolith** | 256 MB | NestJS API + Vite React static assets (`--max-old-space-size=180`) |
| **OS / Buffer** | ~400 MB | Linux kernel, OS buffers, and networking |

---

## 🌐 Public Render API Reference

### `POST /api/v1/render`
Renders a published template with dynamic context.

#### Headers
```http
Authorization: Bearer sk_live_your_api_key_here
Content-Type: application/json
```

#### Request Payload
```json
{
  "templateId": "uuid-of-template",
  "data": {
    "title": "Monthly Performance Report",
    "score": 98,
    "user": {
      "name": "Sarah Connor",
      "department": "Engineering"
    }
  },
  "variables": {
    "generatedAt": "2026-09-16"
  }
}
```
*Note: You can also pass `"schemaId": "uuid-of-model"` instead of `"templateId"` to automatically render the active published template for that model.*

#### Success Response (`200 OK`)
```json
{
  "status": 200,
  "data": {
    "output": {
      "subject": "Monthly Performance Report for Sarah Connor",
      "body": "<h1>Monthly Performance Report</h1><p>Score: 98/100</p>"
    },
    "template": {
      "id": "uuid-of-template",
      "name": "Performance Report Notification"
    },
    "model": {
      "id": "uuid-of-model",
      "name": "Notification Payload",
      "slug": "notification-payload"
    }
  }
}
```

#### Error Response (`401 Unauthorized`)
```json
{
  "status": 401,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid, inactive, or expired API Key"
  }
}
```

---

## 🛠️ Tech Stack

- **Monorepo**: Nx Monorepo
- **Backend**: NestJS 10, TypeScript, Express, Helmet, Passport
- **Database**: PostgreSQL 16, Prisma ORM
- **Cache**: Redis 7, `ioredis`
- **Template Engine**: Handlebars, Day.js
- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide React, React Router 6, TanStack Query
- **Editors**: TipTap (WYSIWYG), Monaco Editor (Code)
- **Deployment**: Docker, Docker Compose, Alpine Linux

---

## 📄 License
MIT License.
