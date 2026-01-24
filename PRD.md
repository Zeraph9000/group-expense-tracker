# PRD — Group Expense Tracker (MVP)

## 1. Overview

**Product name:** Group Expense Tracker (working title)  
**Version:** MVP v1.0  
**Owner:** You  
**Status:** Locked for implementation  

### Tech Stack (Locked)
- **Frontend:** Next.js (Pages Router) + Tailwind CSS
- **Backend:** NestJS (REST API)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** Email & password with **cookie-based sessions**

---

## 2. Problem Statement

Splitting group expenses is socially awkward and mentally taxing. People forget who paid, who owes money, and how to settle fairly. Existing solutions often feel bloated or introduce unnecessary friction.

---

## 3. Goals & Non-Goals

### Goals (MVP)
- Secure multi-user authentication
- Private groups with invite-only access
- Log group expenses with equal splitting
- Clearly compute balances (“who owes who”)
- Allow users to record settlements

### Non-Goals (Explicitly Out of Scope)
- Real payment processing (Stripe, PayID, Venmo)
- Public groups or discovery
- Advanced split types (percentages, shares, custom)
- Notifications or reminders
- Gamification or social scoring
- Bank syncing
- Multi-currency conversion

---

## 4. Core Definitions (Important)

### Balance Definition (Canonical)
> **Balance = how much money a user should receive**

- **Positive balance:** others owe this user money
- **Negative balance:** this user owes money to others
- Balances across a group always sum to **0**

This definition is used consistently across:
- UI
- API responses
- Balance calculations
- Settlements

---

## 5. Target Users

- Small private groups (3–8 people)
- Uni friends, sharehouses, travel groups
- Primary use case: recurring shared expenses

---

## 6. User Stories

### Authentication
- As a user, I can register with email and password
- As a user, I can log in and stay logged in via session cookie
- As a user, I can log out

### Groups
- As a user, I can create a private group
- As a user, I can view groups I belong to
- As a group **OWNER/ADMIN**, I can create invite links
- As a user, I can join a group via an invite link

### Expenses
- As a group member, I can add an expense
- As a group member, I can see all group expenses
- Expenses are split **equally only** (MVP)

### Balances
- As a group member, I can view net balances
- I can clearly see who owes whom

### Settlements
- As a group member, I can record a settlement
- Settlements reduce outstanding balances

---

## 7. Functional Requirements

### 7.1 Authentication
- Passwords must be hashed (bcrypt)
- Login creates a Session record
- Session ID stored in HTTP-only cookie (`sid`)
- Protected routes require a valid session

### 7.2 Groups & Permissions
- Groups are **private only**
- Access controlled via GroupMember records
- Roles:
  - OWNER
  - ADMIN
  - MEMBER
- Only OWNER/ADMIN may:
  - create invite links

### 7.3 Invite Links
- Invite links contain a secure random token
- Token expiry default: **7 days**
- Accepting an invite:
  - requires authentication
  - creates a GroupMember record
  - is idempotent (no duplicate membership)

### 7.4 Expenses (Equal Split Only)
- Amounts stored as integer cents (`amountCents`)
- Backend computes splits
- One `ExpenseSplit` row per participant
- Sum of splits must equal total expense
- Remainder cents distributed deterministically

### 7.5 Balance Calculation (Core Logic)

For a given group:

#### Expenses
- Payer: `+amountCents`
- Each participant: `-split.amountCents`

#### Settlements (Sign Convention — Locked)
For a settlement:
- `fromUser` → **+amountCents**
- `toUser` → **-amountCents**

> Settlements reduce debt and move balances toward zero.

### 7.6 Settlements
- Recorded explicitly (not edits to expenses)
- Must be between members of the same group
- Amount must be positive
- Currency matches group currency (MVP: single currency)

---

## 8. Data Model (Entities)

- User
- Session
- Group
- GroupMember
- GroupInvite
- Expense
- ExpenseSplit
- Settlement

(See ERD for relationships.)

---

## 9. API (MVP Contract)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Groups
- `POST /groups`
- `GET /groups`
- `GET /groups/:groupId`

### Invites
- `POST /groups/:groupId/invites`
- `POST /invites/:token/accept`

### Expenses
- `POST /groups/:groupId/expenses`
- `GET /groups/:groupId/expenses`

### Balances
- `GET /groups/:groupId/balances`

### Settlements
- `POST /groups/:groupId/settlements`
- `GET /groups/:groupId/settlements`

---

## 10. UX Pages (Pages Router)

### Public
- `/register`
- `/login`

### Authenticated
- `/groups`
- `/groups/[groupId]`
- `/invite/[token]`

---

## 11. Non-Functional Requirements

### Security
- HTTP-only cookies
- `SameSite=Lax`
- Secure cookies in production
- CORS restricted to frontend origin
- Auth & GroupMember guards on backend

### Reliability
- DB transactions for:
  - expense + splits creation
  - invite acceptance
- No floating-point arithmetic

### Performance
- Indexed foreign keys
- Balance calculation done server-side

---

## 12. Milestones

1. Prisma schema + migrations
2. Auth (sessions, guards)
3. Groups + membership
4. Invite flow
5. Expenses + splits
6. Balances
7. Settlements
8. UI polish

---

## 13. Success Criteria (MVP)
- User can register → join group → add expense → see balances
- No rounding errors
- No unauthorized group access
- Balances always sum to zero

---

## 14. Locked Decisions Summary
- Balance = money user should receive
- Settlement sign convention fixed
- Private groups only
- Invite links OWNER/ADMIN only
- Equal splits only (MVP)
