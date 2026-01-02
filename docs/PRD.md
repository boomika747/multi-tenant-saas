# Product Requirements Document (PRD)

## User Personas

### 1. Super Admin
- Role: System administrator
- Responsibilities: Manage all tenants
- Goals: Platform stability
- Pain Points: Security and scalability

### 2. Tenant Admin
- Role: Organization admin
- Responsibilities: Manage users, projects
- Goals: Productivity
- Pain Points: Resource limits

### 3. End User
- Role: Team member
- Responsibilities: Manage tasks
- Goals: Task completion
- Pain Points: Lack of visibility

---

## Functional Requirements

FR-001: The system shall allow tenant registration with a unique subdomain.  
FR-002: The system shall isolate tenant data completely.  
FR-003: The system shall enforce subscription limits.  
FR-004: The system shall support JWT authentication.  
FR-005: The system shall implement role-based access control.  
(Add minimum 15)

---

## Non-Functional Requirements

NFR-001: API response time < 200ms.  
NFR-002: JWT expiry must be 24 hours.  
NFR-003: System must support 100 concurrent users.  
NFR-004: Data must be isolated per tenant.  
NFR-005: UI must be mobile responsive.
