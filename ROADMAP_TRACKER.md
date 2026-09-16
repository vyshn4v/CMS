# CMS Headless — Project Implementation Tracker

**Current Status**: **Phase 7 Completed** | **Phase 8 Pending (Next Up)**  
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
| **7** | **Advanced Schema** (Relations, Composable Components, Dynamic Zones) | ✅ **Completed** | Advanced Modeling |
| **8** | **Caching & Audit** (Redis Template Cache, `AuditInterceptor`, Audit Viewer) | ⏳ **PENDING (UP NEXT)** | Performance & Ops |
| **9** | **Polish & Deploy** (E2E Tests, Docker Monolith, Oracle 1GB Free Tier) | ⏳ Pending | Production Launch |

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

---

## ⏳ Pending Phases (8 – 9)

### ⚡ Phase 8: Redis Caching, Audit Logging & Performance (NEXT UP)
*Goal: Sub-millisecond template rendering, mutation auditing, and Oracle 1GB memory tuning.*

- [ ] **Redis Caching Layer**:
  - [ ] Cache compiled Handlebars templates (`tmpl:compiled:{templateId}`) with TTL 24h.
  - [ ] Invalidate template cache on publish/unpublish.
  - [ ] Cache published entry JSONB (`entry:pub:{entryId}`) with TTL 1h.
  - [ ] Invalidate entry cache on publish/unpublish.
- [ ] **Audit Logging**:
  - [ ] `AuditInterceptor` recording actor, action, resource, timestamp, and metadata.
  - [ ] `GET /orgs/:orgId/audit-logs` endpoint with pagination.
  - [ ] Frontend audit timeline log viewer (`/org/:orgId/settings/audit-log`).

---

### 🚢 Phase 9: Testing, Docker & Oracle Deployment
*Goal: Full end-to-end automated testing, containerization, and Oracle Free Tier production deployment.*

- [ ] **E2E Testing**:
  - [ ] Supertest API test suite (auth, orgs, schemas, content, render).
  - [ ] Playwright web test suite (login flow, schema creation, entry publishing, template preview).
- [ ] **Production Optimization**:
  - [ ] NestJS serving static Vite SPA build (`@nestjs/serve-static`) for single-port monolith.
  - [ ] Memory limits tuning (`--max-old-space-size=180`) within 1GB RAM budget.
- [ ] **Containerization**:
  - [ ] Multi-stage production `Dockerfile`.
  - [ ] Complete `docker-compose.prod.yml` (Postgres, Redis, CMS monolith).
- [ ] **Documentation**:
  - [ ] Comprehensive `README.md` with environment setup, deployment steps, and API reference.
