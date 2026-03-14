# CoreInventory - Inventory Management System

A full-stack Inventory Management System (IMS) for hackathon submission.

## 🚀 Features

- **Authentication** - JWT + OTP Password Reset
- **Product Management** - SKU, Categories, UOM, Min Stock
- **Operations** - Receipts, Deliveries, Transfers, Adjustments
- **Real-time Stock** - Automatic updates on operations
- **Multi-warehouse** - Multiple warehouses & locations
- **Dashboard** - KPIs, low stock alerts, recent activity
- **User Isolation** - Each user has separate data

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript
- **Backend**: Express.js, TypeScript  
- **Database**: MySQL 8+
- **Auth**: JWT tokens

## 📋 Prerequisites

- Node.js 18+
- MySQL 8+

## 🔧 Setup for Judges

### 1. Database Setup
```bash
mysql -u root -p
CREATE DATABASE core_inventory;
exit
```

### 2. Backend
```bash
cd backend
npm install
# Create .env file with DB credentials
npm run dev
```
Runs on: http://localhost:4000

### 3. Frontend  
```bash
cd frontend
npm install
npm run dev
```
Runs on: http://localhost:3000

## 📝 Environment Files

**backend/.env:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=core_inventory
JWT_SECRET=any_secret_key
PORT=4000
```

**frontend/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## 🔑 Key Features Implemented

✅ User signup/login with OTP password reset
✅ Product CRUD with categories
✅ Receipts (incoming stock)
✅ Deliveries (outgoing stock)  
✅ Internal transfers
✅ Stock adjustments
✅ Dashboard with KPIs
✅ Low stock alerts
✅ Multi-warehouse support
✅ Complete stock ledger

## 🎯 Demo Flow

1. Sign up as new user
2. Create products (default categories auto-created)
3. Create warehouse & locations
4. Create receipt operation → stock increases
5. Create delivery operation → stock decreases
6. View dashboard & stock ledger

## 👥 Team

- [Your Name] - Full Stack Developer
