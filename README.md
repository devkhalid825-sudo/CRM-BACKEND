# Global Lead CRM - Backend API ⚙️

High-performance, secure Node.js + Express + TypeScript backend for **Global Lead CRM**.

## 🌟 Architecture & Capabilities
- **Security:** AES-256-GCM API key encryption, Argon2 password hashing, rotating refresh tokens in httpOnly cookies, TOTP 2FA.
- **Provider Key Pool & Failover:** Multi-provider fallback (Google Places, Outscraper, Apify, SerpApi, Custom) with automated quota and error recovery.
- **GeoGrid Lead Finder:** Splits any city into 2km search grids with automated checkpointing and pause/resume.
- **Lead Pipeline CRM:** E.164 phone normalization via `libphonenumber-js`, duplicate prevention, Excel export (`.xlsx`).
- **Real-Time Engine:** Socket.IO `/chat` for team collaboration and `/logs` for live administrative auditing.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Fill in your database connection string and security keys.

### 3. Generate Database Client
```bash
npx prisma generate
```

### 4. Start in Development
```bash
npm run dev
```

### 5. Build & Run in Production
```bash
npm run build
npm start
```

---

## ☁️ Running with PM2 on AWS Lightsail
```bash
npm install -g pm2
pm2 start dist/server.js --name "global-crm-api"
pm2 save
pm2 startup
```
