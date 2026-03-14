# CoreInventory IMS

A full-stack Inventory Management System built with:
- **Frontend**: Next.js 14 (App Router) — port 3000
- **Backend**: Express.js REST API — port 4000
- **Database**: MySQL 8+ (local)

---

## Prerequisites

- Node.js v18+
- MySQL 8+ running locally

---

## Quick Start

### 1. Configure Database

Copy `.env.example` to `.env` and fill in your MySQL credentials:
```bash
cd backend
copy .env.example .env
# Edit .env with your DB_PASSWORD
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Setup Database

```bash
cd backend
npm run db:setup
```

This creates the database, applies the schema, and seeds demo data.

### 4. Start the Application

Open **two terminals**:

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

## Demo Credentials

| Role    | Email                        | Password  |
|---------|------------------------------|-----------|
| Manager | admin@coreinventory.com      | password  |
| Staff   | staff@coreinventory.com      | password  |

---

## Features

- 🔐 JWT Auth + OTP Password Reset
- 📊 Real-time Dashboard KPIs
- 📦 Product Management (SKU, Category, UOM, Min Stock)
- 🚚 Receipts — Increase stock from vendor
- 🛒 Deliveries — Decrease stock for orders
- 🔄 Internal Transfers — Move between locations
- ⚖️ Adjustments — Fix physical count discrepancies
- 📜 Stock Ledger — Immutable audit trail
- 🏭 Multi-warehouse & Location management
- ⚠️ Low stock alerts

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET  | `/api/dashboard` | KPIs + recent ops |
| GET/POST | `/api/products` | List / Create products |
| POST | `/api/operations/:id/validate` | Atomic stock update |
| GET  | `/api/ledger` | Stock move history |
