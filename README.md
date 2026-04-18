# NewsOps Studio - Real-Time News Aggregator DevOps Project

NewsOps Studio is a full-stack **real-time news aggregator web application** built to demonstrate an end-to-end DevOps workflow similar in scope to the reference report. It includes:

- React + Vite frontend
- Node.js + Express backend
- PostgreSQL + Prisma ORM
- JWT authentication with role-based access control
- Prometheus metrics and Grafana dashboards
- Docker, Docker Compose, Jenkins pipeline, Kubernetes manifests

## Roles

- **ADMIN** - manage users, sources, articles, audit logs
- **EDITOR** - create and update articles and sources
- **ANALYST** - view dashboard and articles
- **READER** - browse public articles and manage bookmarks

## Main Features

- JWT login and protected routes
- Role-based dashboards
- News source management
- Article CRUD with filters and publishing state
- Comments and bookmarks
- Audit logging
- Prometheus `/metrics` endpoint
- Dockerized local stack
- Kubernetes manifests for deployment
- Jenkins pipeline for CI/CD

## Folder Structure

```text
NewsOps-Studio/
├── frontend/
├── backend/
├── devops/
├── Jenkinsfile
├── docker-compose.yml
└── README.md
```

## Quick Start in VS Code

### Option 1: Run with Docker Compose (recommended)

1. Install Docker Desktop.
2. Open this folder in VS Code.
3. Create env files:

Backend env is already provided as `.env.example`. Copy it:

```bash
cd backend
cp .env.example .env
```

4. From project root run:

```bash
docker compose up --build
```

5. Seed the database:

```bash
docker compose exec backend node prisma/seed.js
```

6. Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## Demo Credentials

- Admin: `admin@newsops.com / Admin@123`
- Editor: `editor@newsops.com / Editor@123`
- Analyst: `analyst@newsops.com / Analyst@123`
- Reader: `reader@newsops.com / Reader@123`

## Run Without Docker

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Jenkins CI/CD Stages

1. Checkout
2. Install Dependencies
3. Security Audit
4. Build Docker Images
5. Push to Docker Hub
6. Deploy to Kubernetes
7. Health Check

## Notes

- The app uses PostgreSQL by default.
- Docker Compose maps backend to **5001** on the host to avoid common port conflicts.
- Frontend proxies `/api` traffic to the backend service.
