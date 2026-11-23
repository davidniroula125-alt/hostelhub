# HostelHub

Multi-tenant hostel management SaaS with role‑based access control, billing, and a student self‑service portal. Ships as a web app (React + Vite), with desktop (Electron) and mobile (Capacitor) launchers.

## Features

- **Multi‑tenant**: every record is scoped to a hostel; cross‑tenant access is denied at query level
- **RBAC**: `superadmin`, `owner`, `manager`, `accountant`, `warden`, `staff`, `student` with a per‑module permission matrix
- **Admissions & rooms**: single‑transaction admission flow (room/bed allocation, deposit receipt, first invoice, optional portal account)
- **Billing**: monthly invoice generation, line items, late fees, deposits (security vs. service), payments (cash/bank/eSewa/Khalti/card), checkouts with refund settlement
- **Campus ops**: attendance, leaves, visitors, food/meal plans, utility charges + meter readings, complaints, maintenance, inventory
- **People & admin**: staff, payroll, notices, documents, portal‑facing users, audit log, hostel settings
- **Super admin panel**: platform dashboard, hostel lifecycle, subscription plans, subscriptions, cross‑hostel payments, audit
- **Student portal**: dashboard, invoices, leave requests, notices
- **Reports**: financial, occupancy, attendance, expenses + CSV/XLSX export
- **Audit trail** written for every sensitive mutation

## Tech stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18, Vite 5, Tailwind CSS 3, recharts, lucide-react    |
| Backend  | Node.js, Express 4, Mongoose 8, JWT, bcrypt                 |
| Storage  | MongoDB 8 (single‑node replica set for transactions)        |
| Desktop  | Electron (planned)                                          |
| Mobile   | Capacitor (planned)                                         |

## Repository layout

```
server/          Express API (CommonJS)
  src/routes     REST + RBAC middleware per module
  src/controllers
  src/services   billing, number counters, audit, notifications, email
  src/models     Mongoose schemas
  tests/         e2e acceptance suite
client/          React SPA (Vite)
  src/pages      one file per module + portal/ and admin/
  src/components shared UI kit, Layout, PaymentModal
  src/context    auth, theme, toasts
```

## Requirements

- Node.js ≥ 20 (developed on v24)
- MongoDB ≥ 7 (developed on 8.2) **running as a single‑node replica set** — required because admission/invoice flow uses transactions

## Getting started

### 1. Start MongoDB as a replica set

```bash
mongod --replSet rs0 --dbpath <your-data-dir> --port 27017
```

or, if running as a Windows service, add to `mongod.cfg`:

```yaml
replication:
  replSetName: rs0
```

then restart the service and initialise:

```js
rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })
```

### 2. Configure

```bash
cp server/.env.example server/.env   # edit secrets
```

Key variables: `MONGODB_URI` (include `?replicaSet=rs0`), `JWT_SECRET`, optional SMTP, optional eSewa/Khalti merchant keys.

### 3. Install & seed

```bash
npm install             # or: npm run install:all
npm run seed            # subscription plans + super admin (no demo data)
npm run seed:demo       # optional: demo hostels with sample rooms/students/invoices
```

`npm run seed` only creates the subscription plans (`BASIC`/`STANDARD`/`PREMIUM`) and the super admin account — no dummy data.

### 4. Run

```bash
npm run dev             # API on :5000 + client (Vite) on :5173, proxying /api
```

Or separately: `npm run dev:server`, `npm run dev:client`.

### 5. Logins

| Role        | Email                      | Password        |
| ----------- | -------------------------- | --------------- |
| Super admin | `admin@hostelhub.app`      | `SuperAdmin@123` |

No dummy users or hostels are created by default. Register a hostel from the app, or run `npm run seed:demo` locally to get the sample hostels (`owner@sunrise.example.com` / `owner123`, `owner@bhaktapur.example.com` / `owner123`).

## Testing

```bash
npm test         # backend (uses hostelhub_test DB, resets it each run)
npm run test:e2e # 19‑step acceptance suite: auth, tenants, rooms, admissions, billing, food, checkout…
npm run build    # production build of the web client (→ client/dist)
```

## Production notes

- Deploy the API behind HTTPS; set `NODE_ENV=production`, a strong `JWT_SECRET`, and your SMTP details.
- MongoDB Atlas clusters are replica sets by default, so transactions (admissions) work out of the box; set the `replicaSet` option in the connection string.
- The client is a static bundle: `client/dist` is served by Express (same origin), so `VITE_API_URL` is optional for single-service deploys.

## Deploy on Render

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and copy the connection string (include `?replicaSet=` if required).
2. Push this repo to GitHub (`git init && git add -A && git commit -m "init" && git push`).
3. On [Render](https://dashboard.render.com): **New → Blueprint**, select the repo — `render.yaml` creates the web service.
4. Set env var `MONGODB_URI` when prompted (other vars come from the blueprint).
5. After the first deploy, open `https://<service>.onrender.com` (SPA + `/api` on one origin).

Super admin after first boot: `admin@hostelhub.app` / `SuperAdmin@123` (no demo data is seeded).

Build/start used by Render: `npm install && npm run build` → `npm start` (health: `/api/health`).
