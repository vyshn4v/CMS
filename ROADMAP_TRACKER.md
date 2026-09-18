# CMS Headless — Project Implementation Tracker

**Current Status**: **Phase 10 Completed** | **Phase 11 Pending (Next Up: Scheduler Hub UI)**  
**Active Branch**: `dev`  
**Services Running**: Backend API (`:5000`), Vite Web App (`:5173`), Docker Postgres (`:5434`), Docker Redis (`:6379`)

---

## 🗺️ High-Level Roadmap Overview

| Phase | Description | Status | Scope |
|:-----:|:------------|:------:|:------|
| **1** | **Foundation & Auth** (Nx, NestJS, Vite, Prisma, Google OAuth, Allowlist) | ✅ Completed | Core Scaffolding |
| **2** | **Multi-tenant & RBAC** (Orgs, Custom Roles, `PermissionGuard`, Org Switcher) | ✅ Completed | Security & Tenancy |
| **3** | **Schema Builder** (JSONB Fields, Dynamic Zod Compiler, Drag & Drop Studio) | ✅ Completed | Data Modeling |
| **4** | **Content Entries** (Dynamic Form Renderer, CRUD, Draft/Publish Workflow) | ✅ Completed | Content Authoring |
| **5** | **Template Engine** (Handlebars, Dual-Mode TipTap/Monaco, Live Preview) | ✅ Completed | Template Authoring |
| **6** | **Render API & API Keys** (`POST /render`, Key Generation/Hashing, Guard) | ✅ Completed | Public Integrations |
| **7** | **Advanced Schema** (Relations, Composable Components, Dynamic Zones) | ✅ Completed | Advanced Modeling |
| **8** | **Caching & Audit** (Redis Template Cache, `AuditInterceptor`, Audit Viewer) | ✅ Completed | Performance & Ops |
| **9** | **Polish & Deploy** (E2E Tests, Docker Monolith, Oracle 1GB Free Tier) | ⏳ Pending | Production Launch |
| **10** | **Email Scheduler Engine** (Prisma Schema, BullMQ, Dynamic Queues, SMTP) | ✅ **Completed** | Backend Queue Engine |
| **11** | **Scheduler Hub UI** (Dedicated `/scheduler` Route, 3 Tabs, Reinit Banner) | ⏳ **PENDING (UP NEXT)** | Frontend Hub & Operations |

---

## ✅ Completed Phases (1 – 7)

### Phase 1: Foundation & Auth
- [x] Nx Monorepo setup (`apps/api`, `apps/web`, `libs/shared-types`).
- [x] NestJS + Express core scaffolding, error filters, response transform interceptor.
- [x] Prisma ORM configuration with PostgreSQL schemas and seeds.
- [x] Google OAuth flow + JWT HttpOnly cookie authentication + `ALLOWED_EMAILS` gate.
- [x] Vite + React + Tailwind CSS + Shadcn shell and typography (`@fontsource/inter`, `@fontsource/jetbrains-mono`).

### Phase 2: Multi-Tenant Organizations & RBAC
- [x] Multi-tenant organization CRUD (`GET /orgs`, `POST /orgs`, `PATCH /orgs/:id`).
- [x] Organization member invitations and role assignments (`org.invite`, `org.remove_member`).
- [x] Granular permission matrix (`Permissions` enum) and custom role builder.
- [x] `PermissionGuard` and `@RequirePermissions` decorator for route protection.
- [x] Frontend Org switcher, Members page, and Roles & Permissions manager.

### Phase 3: Schema Builder (Basic Fields)
- [x] Content type model (`COLLECTION` / `SINGLE`) with JSONB schema definition.
- [x] Visual field builder supporting `text`, `richtext`, `number`, `boolean`, `date`, `datetime`, `json`, `email`, `enum`, `media`.
- [x] Dynamic Zod validation schema generator (`zod-builder.ts`).
- [x] Drag-and-drop / ordered field management in React studio.

### Phase 4: Content Entries Studio
- [x] Content entry CRUD with JSONB data store (`apps/api/src/modules/content/`).
- [x] Dynamic form generator rendering inputs dynamically from field definitions.
- [x] Draft / Published workflow (`data` vs `publishedData`, `status` flag).
- [x] Content entries table with pagination, search, status filtering, and edit forms.
- [x] Atomic save-and-publish action and unpublish mutation.

### Phase 5: Template Engine & Dual-Mode Editor
- [x] Handlebars templating service (`handlebars.service.ts`) with custom helpers (`formatDate`, `uppercase`, `truncate`, `ifEquals`, `json`).
- [x] Template model supporting types (`EMAIL`, `HTML_PAGE`, `JSON`).
- [x] Dual-mode editor with TipTap (WYSIWYG) and Monaco (Code) toggle.
- [x] Draft / Publish template workflow (`bodyDraft` -> `bodyPublished`).
- [x] Live template preview modal with sample JSON context rendering.

### Phase 6: Render API & API Keys
- [x] API Key backend module (`apps/api/src/modules/api-key/`):
  - [x] Cryptographic key generation (`sk_live_...`), SHA-256 hashing, prefix-only storage.
  - [x] Endpoints for key listing (`GET /api-keys`), creation (`POST /api-keys`), and revocation (`DELETE /api-keys/:id`).
  - [x] `ApiKeyGuard` enforcing Bearer token verification and auto-attaching organization context.
- [x] Public Render API (`POST /api/v1/render`):
  - [x] Authenticated via `ApiKeyGuard`.
  - [x] Resolves target templates via immutable `schemaId` or explicit `templateId`.
  - [x] Merges published entry content (`contentId`) with caller `data` and `variables`.
  - [x] Supports `EMAIL`, `HTML_PAGE`, and `JSON` output payloads with Handlebars helpers.
- [x] Frontend API Keys Management (`apps/web/src/pages/settings/ApiKeysPage.tsx`):
  - [x] Keys table with prefix, created date, and last used timestamp.
  - [x] Key creation modal and secure one-time secret display dialog with 1-click clipboard copy.
  - [x] Revocation confirmation dialog with immediate access termination.

### Phase 7: Advanced Schema — Relations, Components, Dynamic Zones
- [x] Reusable Components Backend (`apps/api/src/modules/schema/components.controller.ts`):
  - [x] Component CRUD endpoints (`GET /components`, `POST /components`, `GET /components/:id`, `PATCH /components/:id`, `DELETE /components/:id`).
  - [x] Component model in PostgreSQL via Prisma with JSONB field schema.
- [x] Relation Resolution Pipeline:
  - [x] `relation-resolver.ts` populating target entries for `one-to-one`, `one-to-many`, `many-to-one`, `many-to-many`.
  - [x] Automatically attaches `_populated` relations map on entry retrieval.
- [x] Visual Field Builder Extension (`AddFieldModal.tsx`):
  - [x] Configuration for `relation` fields (target schema, relation cardinality, display field).
  - [x] Configuration for `component` fields (target component selector, repeatable toggle).
  - [x] Configuration for `dynamiczone` fields (allowed component multi-select).
- [x] Frontend Component Studio (`apps/web/src/pages/components/`):
  - [x] Component Library list page (`ComponentsListPage.tsx`) with category filtering and search.
  - [x] Component Builder page (`ComponentBuilderPage.tsx`) for authoring modular schemas.
  - [x] Sidebar navigation entry in `AppLayout.tsx`.
- [x] Advanced Form Controls:
  - [x] `RelationPicker.tsx` searchable relation selection with live badge chips.
  - [x] `ComponentForm.tsx` embedded schema form supporting single and repeatable arrays with add/remove.
  - [x] `DynamicZoneEditor.tsx` dynamic block composer with component picker, block reordering, and item delete.

### Architectural Upgrade: Model-Driven Output Contract & Dynamic Input Engine
- [x] **Model as Target Output Schema**:
  - [x] Schema models (`ContentType`) define the custom output keys/structure expected by external consumers (e.g. `sub` + `body`, or `title` + `message` + `deep_link`).
  - [x] Input payloads are completely dynamic, unstructured JSON variables passed at runtime without rigid pre-enforced schemas.
- [x] **Multi-Field Template Engine**:
  - [x] Prisma `Template` schema enhanced with `fieldsDraft` and `fieldsPublished` JSONB maps storing field-by-field Handlebars templates.
  - [x] `TemplateService` and `RenderService` updated to compile and render every configured field in the Model with incoming dynamic variables.
  - [x] Output envelope produces `{ type, data: { [field]: renderedValue }, output: { ... }, model: { ... }, template: { ... } }` maintaining 100% backward compatibility.
- [x] **Frontend Template Studio & Preview Revamp**:
  - [x] Removed redundant template "Type" selector from Template Editor — output format is strictly governed by the associated Model.
  - [x] Removed content entries dependency from template inputs — templates operate 100% on dynamic runtime JSON payloads.
  - [x] Added automated variable extraction (`extractVariablesFromFields`) auto-detecting `{{var}}` placeholders from template formulas.
  - [x] Implemented dedicated high-fidelity render previews based on the defined **Model Type**:
    - **EMAIL**: Realistic Email Client frame with Subject, From/To headers, Preheader, and HTML body.
    - **PUSH_NOTIFICATION**: Mobile Lock-screen card with App header, Title, Message, and Action deep link.
    - **SMS**: Mobile messenger bubble with delivery receipt.
    - **HTML_PAGE**: Web document canvas with browser address bar.
    - **CUSTOM**: Field-by-field cards with syntax highlighting and raw JSON payload tab.
  - [x] Added `Model Output Format` selector in Schema Builder (`SchemaBuilderPage.tsx`).

### Phase 8: Redis Caching, Audit Logging & Performance
- [x] **Redis Caching Layer**:
  - [x] Cache compiled Handlebars templates (`tmpl:compiled:{templateId}`) with TTL 24h.
  - [x] Invalidate template cache on publish/unpublish.
  - [x] Cache published entry JSONB (`entry:pub:{entryId}`) with TTL 1h.
  - [x] Invalidate entry cache on publish/unpublish.
- [x] **Audit Logging**:
  - [x] `AuditInterceptor` recording actor, action, resource, timestamp, and metadata.
  - [x] `GET /orgs/:orgId/audit-logs` endpoint with pagination and filtering.
  - [x] Frontend audit timeline log viewer (`/settings/audit-logs`).

### Phase 10: Email Scheduler & Dynamic Queue Engine
- [x] **Database & Dependencies**:
  - [x] Added Prisma models: `EmailQueue`, `EmailScheduler`, `ScheduledEmail`.
  - [x] Added Enums: `QueueStatus` (`ACTIVE`, `PENDING_INITIALIZATION`, `PAUSED`, `ERROR`), `ScheduledEmailStatus` (`SCHEDULED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`).
  - [x] Installed dependencies in `apps/api`: `bullmq`, `nodemailer`, `@types/nodemailer`.
  - [x] Defined shared DTOs & interfaces in `libs/shared-types`.
- [x] **Dynamic Queue & Worker Engine**:
  - [x] Implemented `QueueManagerService` managing runtime BullMQ `Queue` and `Worker` pools with dynamic concurrency.
  - [x] Implemented on-demand queue reinitialization method (`POST /api/v1/orgs/:orgId/queues/reinitialize`) to spin up new workers dynamically without server restarts.
  - [x] Implemented `EmailSenderService` (Nodemailer) with strict `.env` SMTP verification (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) throwing error if missing.
  - [x] Implemented `EmailWorkerProcessor` handling delayed jobs, template/model data rendering, and status updates with 3 retries and exponential backoff.
- [x] **REST API Endpoints**:
  - [x] `QueueModule` & `QueueController` (`GET /queues`, `POST /queues`, `POST /queues/reinitialize`, `DELETE /queues/:id`).
  - [x] `SchedulerModule` & `SchedulerController` (`GET /schedulers`, `POST /schedulers`, `GET /schedulers/:id`, `PATCH /schedulers/:id`, `DELETE /schedulers/:id`).
  - [x] Trigger/Dispatch endpoint: `POST /orgs/:orgId/schedulers/:id/dispatch` (supporting user JWT) and `POST /api/v1/schedulers/dispatch` (org `ApiKeyGuard`).
  - [x] `ScheduledEmailController` (Job monitor listing, `POST /scheduled-emails/:id/cancel`, `POST /scheduled-emails/:id/retry`).

---

## ⏳ Pending Phases (11 & 9)

### 🖥️ Phase 11: Dedicated Scheduler Hub UI & Integrations (NEXT UP)
*Goal: Dedicated visual management hub for configuring schedulers, scheduling delayed emails, and managing dynamic BullMQ queues.*

- [ ] **Routing & Layout**:
  - [ ] Top-level route `/scheduler` in `apps/web/src/App.tsx`.
  - [ ] Global sidebar navigation link with `CalendarClock` icon in `AppLayout.tsx`.
- [ ] **3-Tab Scheduler Hub (`/scheduler`)**:
  - [ ] **Schedulers Tab**:
    - [ ] Configured schedulers table (Name, Bound Template, Model, Queue, Status, Quick Actions).
    - [ ] `CreateSchedulerModal` with template selection, model binding, and default queue selector.
    - [ ] `DispatchModal` for triggering emails (`to`, `cc`, `data` JSON/form, date/time picker for `scheduledFor`).
  - [ ] **Scheduled Emails Tab**:
    - [ ] Live dispatch monitor table with status pills (`SCHEDULED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`).
    - [ ] Search by recipient, filter by status and date range.
    - [ ] Job details drawer with payload viewer, rendered HTML preview, and error message tooltip.
    - [ ] Cancel pending job action & Retry failed job action.
  - [ ] **Dynamic Queues Tab**:
    - [ ] Dynamic queues table with concurrency and worker status indicators.
    - [ ] `CreateQueueModal` creating queues in `PENDING_INITIALIZATION` state.
    - [ ] Dynamic **"Reinitialize Queues"** alert banner displayed when uninitialized queues are detected.

---

### 🚢 Phase 9: Testing, Docker & Oracle Deployment
*Goal: Full end-to-end automated testing, containerization, and Oracle Free Tier production deployment.*

- [ ] **E2E Testing**:
  - [ ] Supertest API test suite (auth, orgs, schemas, content, render, schedulers).
  - [ ] Playwright web test suite (login flow, schema creation, entry publishing, template preview, scheduler).
- [ ] **Production Optimization**:
  - [ ] NestJS serving static Vite SPA build (`@nestjs/serve-static`) for single-port monolith.
  - [ ] Memory limits tuning (`--max-old-space-size=180`) within 1GB RAM budget.
- [ ] **Containerization**:
  - [ ] Multi-stage production `Dockerfile`.
  - [ ] Complete `docker-compose.prod.yml` (Postgres, Redis, CMS monolith).
- [ ] **Documentation**:
  - [ ] Comprehensive `README.md` with environment setup, deployment steps, and API reference.
