# Smart E-Learning

Corporate training LMS — NestJS + PostgreSQL backend, Next.js frontend.

## Stack
- **Backend**: NestJS, Prisma, PostgreSQL, JWT (access + refresh)
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Monorepo**: pnpm workspaces + Turborepo
- **Database**: PostgreSQL (via Docker Compose)

## Structure
```
apps/
  api/    # NestJS REST API
  web/    # Next.js frontend
packages/
  shared/ # Shared TS types & Zod schemas
```

## Quick start

### Prerequisites
- Node 20+ (Node 24 OK)
- pnpm 9+
- Docker

### Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# 3. Start PostgreSQL
pnpm db:up

# 4. Run migrations + seed
pnpm db:migrate
pnpm db:seed

# 5. Start dev (api + web)
pnpm dev
```

### Default credentials (after seed)
- **SuperAdmin**: `laethmanna4@gmail.com` / `Admin@123`

## Roles
SuperAdmin · Admin · Coordinator · Trainer · Student · Client
