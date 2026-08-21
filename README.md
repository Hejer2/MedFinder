# MedFinder — Production Healthcare Marketplace & Teleconsultation Platform

[![Continuous Integration](https://github.com/your-org/medfinder/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/medfinder/actions/workflows/ci.yml)
[![Security & Vulnerability Scan](https://github.com/your-org/medfinder/actions/workflows/security.yml/badge.svg)](https://github.com/your-org/medfinder/actions/workflows/security.yml)
[![Continuous Delivery](https://github.com/your-org/medfinder/actions/workflows/cd.yml/badge.svg)](https://github.com/your-org/medfinder/actions/workflows/cd.yml)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-ea2845.svg)](https://nestjs.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61dafb.svg)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage%20Alpine-2496ed.svg)](https://www.docker.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%20%2B%20PostGIS-336791.svg)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-3178c6.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

MedFinder is a full-stack digital healthcare marketplace designed to connect patients, licensed doctors, and certified pharmacies. The platform features doctor directory search, interactive weekly availability management, turn-by-turn GIS route navigation, medicine inventory ordering with prescription upload validation, Stripe payment integration, and clinical records management.

---

## 🏛️ System Architecture

\\\mermaid
graph TD
    Client[Browser / Mobile App] -->|HTTPS / Static Assets| Nginx[Nginx Reverse Proxy]
    Nginx -->|SPA Fallback| ReactApp[React 19 Vite App]
    Nginx -->|API Proxy :3000| NestApp[NestJS REST API Gateway]
    
    subgraph Security Layer
        NestApp -->|Auth Guards & JWT| AuthGuard[Passport JWT / RBAC]
        NestApp -->|Brute-Force Protection| RateLimit[Express Rate Limiter]
        NestApp -->|Magic Bytes & MIME Filter| FileCheck[Multer Upload Filter]
        NestApp -->|Ownership / BOLA Protection| OwnershipGuard[Service Authorization]
    end

    subgraph Data & Services
        OwnershipGuard -->|Prisma Client ORM| DB[(PostgreSQL 15 / PostGIS)]
        OwnershipGuard -->|Nodemailer / SMTP| Mail[Transactional Email Service]
        OwnershipGuard -->|Webhooks / SDK| Stripe[Stripe Payment Gateway]
        NestApp -->|Liveness & Readiness| HealthCheck[GET /health Probe]
    end
\\\

---

## ⚙️ DevOps & CI/CD Pipeline Flow

\\\mermaid
flowchart LR
    Dev[Developer] -->|git push / PR| GH[GitHub Repository]
    
    subgraph CI [GitHub Actions CI Pipeline]
        GH --> CI_Unit[Backend Unit Tests]
        GH --> CI_E2E[Backend E2E Security Tests]
        GH --> CI_Front[Frontend Tests & Build]
        GH --> CI_Sec[Dependency Security Audit]
        GH --> CI_Docker[Docker Multi-Stage Build Validation]
    end

    subgraph CD [Continuous Delivery - On Merge to Main]
        CI --> CD_GHCR[Build & Tag Images in GHCR]
        CD_GHCR --> CD_Deploy[Trigger Cloud Deployment / Webhook]
        CD_Deploy --> Cloud[Render / Cloud Container Runtime]
        Cloud --> Health[Automated /health Verification]
    end
\\\

---

## ✨ Key Platform Features

* **Doctor Directory & Slot Booking:** Specialty taxonomy filtering, geocoded clinics, dynamic ratings, and atomic concurrency protection preventing double-bookings.
* **Interactive Weekly Agenda:** Visual weekly calendar with 1-click slot generation and patient reschedule negotiation.
* **Interactive GIS Map Navigation:** Integrated Leaflet map with live GPS tracking, nearby clinic discovery, and OSRM turn-by-turn driving and walking directions.
* **Pharmacy Catalog & Prescription Orders:** Medicine inventory management with atomic stock decrementing, basket checkout, automatic delivery fee calculation, and prescription document uploads.
* **Role-Based Access Control:** Distinct workflows and permission models for **Patients**, **Doctors**, **Pharmacies**, and **Administrators**.
* **Clinical Records Management:** Doctor-patient therapeutic relationship authorization to view and update medical history notes.
* **Mobile Ready:** Built with Capacitor 8 supporting native camera and geolocation access on Android.

---

## 🛡️ Security Architecture

MedFinder implements defense-in-depth security principles:

1. **Broken Object-Level Authorization (BOLA/IDOR) Hardening:**
   * Every read, write, update, and cancellation request on appointments, orders, clinical files, and profiles enforces backend ownership checks.
2. **Clinical Relationship Authorization:**
   * Doctors can only access a patient's medical records if an active or completed consultation exists between them.
3. **Magic Byte & File Upload Hardening:**
   * File uploads (prescriptions and avatars) are validated against binary magic byte headers (JPEG, PNG, PDF, WEBP).
   * Filenames are sanitized and randomized using UUIDs to prevent path traversal and execution.
4. **Authentication & Abuse Prevention:**
   * Strict rate limiting (15 requests per 15-minute window per IP) on all authentication and password-reset routes.
   * Passwords hashed with bcrypt (salt cost 12).
   * Short-lived access tokens (15m) paired with httpOnly secure refresh cookies (7d).
5. **Authoritative Financial Calculations & Stripe Webhooks:**
   * Payment amounts are computed server-side directly from database records.
   * Stripe webhooks verify signatures via stripe.webhooks.constructEvent and execute state transitions idempotently.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | NestJS 11, TypeScript, Express, Prisma ORM 6, Passport JWT, Helmet, Express Rate Limit, Swagger OpenAPI 3.0 |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 3.4, TanStack Query v5, React Router 7, Leaflet & React-Leaflet, Framer Motion |
| **Mobile** | Capacitor 8 (Android, Camera, Geolocation) |
| **Database** | PostgreSQL 15 with PostGIS (Production) / SQLite (Development) |
| **DevOps & Cloud** | Docker Multi-Stage, Docker Compose, Nginx Alpine, GitHub Actions (CI & CD), GHCR, Render Blueprint |

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js:** v20.x or higher
* **npm:** v10.x or higher
* **Docker & Docker Compose** (Optional, for containerized execution)

### 1. Clone & Configure
\\\ash
git clone https://github.com/your-org/medfinder.git
cd medfinder

# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
\\\

### 2. Backend Setup
\\\ash
cd backend
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts   # Populate initial Tunisia healthcare demo data
npm run start:dev
\\\
* **Backend REST API:** http://localhost:3000
* **Health Endpoint:** http://localhost:3000/health
* **Swagger Documentation:** http://localhost:3000/api/docs

### 3. Frontend Setup
\\\ash
cd ../frontend
npm install
npm run dev
\\\
* **Frontend Application:** http://localhost:5173

---

## 🐳 Docker Production Setup

To launch the complete application with PostgreSQL, NestJS backend, and Nginx frontend in isolated containers:

\\\ash
docker compose up -d --build
\\\

### Container Stack & Healthchecks:
| Service | Image / Base | Internal Port | Host Port | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| **database** | postgis/postgis:15-3.4 | 5432 | 5432 | pg_isready |
| **backend** | node:20-alpine (Multi-stage, Non-root) | 3000 | 3000 | wget http://localhost:3000/health |
| **frontend** | nginx:1.27-alpine (Gzip, SPA headers) | 80 | 80 | wget http://localhost:80/ |

---

## 🧪 Automated Testing Suites

MedFinder maintains comprehensive unit and end-to-end test suites:

\\\ash
# 1. Run Backend Unit Tests
cd backend
npm run test

# 2. Run Backend E2E Security Tests (41 Tests: Concurrency, BOLA/IDOR, Webhooks, /health)
npm run test:e2e

# 3. Run Frontend Unit Tests (Vitest)
cd ../frontend
npm run test

# 4. Validate Production Builds
npm run build      # Frontend build (Rollup code-split chunks)
cd ../backend
npm run build      # Backend NestJS compile
\\\

---

## 🔐 Environment Variables & Secrets Reference

| Variable | Description | Default / Example | Required In |
| :--- | :--- | :--- | :--- |
| **NODE_ENV** | Application environment | production / development | Backend |
| **PORT** | API server port | 3000 | Backend |
| **DATABASE_URL** | PostgreSQL or SQLite connection string | postgresql://medfinder:secret@localhost:5432/medfinder | Backend |
| **JWT_SECRET** | Secret key for signing JWT access tokens (32+ chars) | your_production_jwt_secret | Backend |
| **REFRESH_SECRET** | Secret key for signing refresh tokens (32+ chars) | your_production_refresh_secret | Backend |
| **FRONTEND_URL** | Allowed CORS origin | http://localhost / https://medfinder.onrender.com | Backend |
| **STRIPE_SECRET_KEY** | Stripe Secret API Key | sk_live_... / sk_test_... | Backend |
| **STRIPE_WEBHOOK_SECRET** | Secret for Stripe webhook signature verification | whsec_... | Backend |
| **VITE_API_URL** | Frontend API URL (Empty string defaults to smart proxy) | https://api.medfinder.com | Frontend |
| **RENDER_DEPLOY_HOOK** | Optional webhook URL to trigger cloud deployment | https://api.render.com/deploy/... | GitHub Secrets |

---

## ☁️ Cloud Deployment (Render Blueprint)

MedFinder includes a declarative [render.yaml](render.yaml) Infrastructure-as-Code blueprint:

1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Blueprint** and select this repository.
3. Render automatically provisions:
   * **Managed PostgreSQL 15 Database**
   * **Backend Web Service** (Docker runtime, auto-linked to PostgreSQL)
   * **Frontend Static Site** (Docker Nginx runtime)
4. Add your \RENDER_DEPLOY_HOOK\ to GitHub Repository Secrets to enable automatic Continuous Delivery on every merge to \main\.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
