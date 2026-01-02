# System Architecture

## High-Level Architecture

(Client) → (Frontend) → (Backend API) → (PostgreSQL)

Diagram: docs/images/system-architecture.png

---

## Database Design

The database follows a multi-tenant shared schema model.

Tables:
- tenants
- users
- projects
- tasks
- audit_logs

Diagram: docs/images/database-erd.png

---

## API Architecture

### Auth APIs
- POST /api/auth/register-tenant
- POST /api/auth/login
- GET /api/auth/me

### Tenant APIs
- GET /api/tenants/:id
- PUT /api/tenants/:id

### User APIs
- POST /api/tenants/:id/users
- GET /api/tenants/:id/users

### Project APIs
- POST /api/projects
- GET /api/projects

### Task APIs
- POST /api/projects/:id/tasks
- GET /api/projects/:id/tasks
