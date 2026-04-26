# Smart E-Learning

Corporate training LMS — **NestJS + Prisma + PostgreSQL** backend, **Next.js 15** frontend.

Rebuilt from a legacy .NET Core / Blazor Server project. Same business logic, modern stack.

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | NestJS 10 (REST), Prisma 6, PostgreSQL 16 |
| Auth | JWT access (15 min) + refresh tokens (7 d, httpOnly cookie, hashed in DB, rotated on each refresh) |
| Frontend | Next.js 15 (App Router), Tailwind, shadcn-style UI primitives |
| Storage | Local disk under `apps/api/uploads/` (swap-in S3 later) |
| Excel | exceljs (bulk import + attendance report) |
| Monorepo | pnpm workspaces + Turborepo |
| API docs | Swagger at `/docs` |

---

## Repo layout

```
apps/
  api/                    NestJS REST API
    prisma/               schema + migrations + seed
    src/
      auth/               JWT + refresh tokens, guards, decorators
      users/              password ops (change/reset/activate)
      students/           CRUD
      trainers/           CRUD + photo/CV upload
      coordinators/       CRUD
      admins/             CRUD (SuperAdmin only)
      clients/            CRUD
      courses/            CRUD + auto-class generation + attachments
      classes/            update topic/time/location/meetingLink
      enrollments/        single + Excel bulk import (idempotent)
      attendance/         mark/bulk + Excel report export
      exams/              MCQ (auto-graded) + free-text + question CRUD + submissions
      question-templates/ reusable Q banks + apply-to-exam
      surveys/            post-course rating + feedback
      evaluations/        forms + questions + publish + responses + report
      dashboard/          role-aware stats
  web/                    Next.js 15 App Router frontend
    src/
      app/login           login page
      app/(dashboard)     protected layout + Dashboard / Courses / Students
      components/ui       Button, Input, Card, Label
      components/app      Sidebar (role-aware menu)
      hooks/use-auth      Auth context provider
      lib/api             fetch client with auto-refresh
packages/
  shared/                 shared TS types (Role enum, auth schemas)
.claude/
  settings.local.json     auto-allow common dev commands
docker-compose.yml        postgres on 5434
```

---

## Quick start

### Prerequisites
- **Node 20+** (Node 24 confirmed working)
- **pnpm 9+**
- **Docker** (for PostgreSQL)

### Setup
```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start Postgres (port 5434, since 5432/5433 may be taken)
pnpm db:up

# 4. Apply schema + seed SuperAdmin
pnpm db:migrate
pnpm db:seed

# 5. Run both apps in dev
pnpm dev
```

- API:    http://localhost:3001/api
- Docs:   http://localhost:3001/docs
- Web:    http://localhost:3000

### Default SuperAdmin credentials
`laethmanna4@gmail.com` / `Admin@123` — change on first login.

---

## Roles

| Role | What they can do |
|---|---|
| **SUPER_ADMIN** | Everything; only role that can manage Admins |
| **ADMIN** | All operational management |
| **COORDINATOR** | Manage assigned courses, trainers, clients |
| **TRAINER** | Their own courses, classes, attendance, exams |
| **STUDENT** | View enrolled courses, take exams, fill evaluations |
| **CLIENT** | View their organization's courses & students |

Role-based filtering happens at the **service layer** (e.g. `CoursesService` returns only `where: { trainerId }` for a trainer, only enrolled courses for a student, only their org's courses for a client).

---

## Key business rules (preserved from legacy)

1. **Auto-class generation** — when you create a course with start/end dates, the system generates one Class per weekday between them, **skipping Friday and Saturday**, with default time 13:00–14:00. (See `apps/api/src/courses/auto-classes.util.ts`.)
2. **Bulk Excel import** — column-flexible header (`Name`, `Social ID`, `Email`, `Phone`, `Gender`); auto-creates User + Student + Enrollment; **idempotent re-imports** (legacy created duplicates).
3. **Two exam types** — MCQ is auto-graded on submit; free-text waits for trainer's manual grade.
4. **Default password** for bulk-imported students: `User@123`.

---

## Auth flow

1. `POST /api/auth/login` → `{ accessToken, user }` + sets `sel_refresh` cookie
2. Frontend keeps access token in `sessionStorage`, sends `Authorization: Bearer …`
3. On any 401, the API client calls `POST /api/auth/refresh` (cookie-based) and retries
4. `POST /api/auth/logout` revokes refresh in DB + clears cookie
5. Refresh tokens are bcrypt-hashed in DB and rotated on every refresh — old token revoked

---

## Useful commands

```bash
pnpm dev              # api + web in parallel (Turborepo)
pnpm build            # full monorepo build
pnpm typecheck        # tsc --noEmit across all packages
pnpm db:up            # start Postgres
pnpm db:down          # stop Postgres
pnpm db:migrate       # apply Prisma migrations (interactive)
pnpm db:seed          # seed SuperAdmin
pnpm db:studio        # Prisma Studio GUI
```

---

## Milestones (build history)

| | What landed |
|---|---|
| M1 | Monorepo · Prisma schema · Postgres in Docker · SuperAdmin seed |
| M2 | JWT access + refresh · login/refresh/logout/me · Roles & Public guards |
| M3 | User CRUD for all 6 roles · password ops · trainer photo/CV upload |
| M4 | Courses + auto-class generation · close/reopen · course attachments · role-filtered listing |
| M5 | Single enroll + Excel bulk import (idempotent, smart user-reuse, per-row errors) |
| M6 | Attendance mark/bulk-mark + Excel report (rows×classes with totals & %) |
| M7 | Exams (MCQ auto-graded + free-text manual) · questions · submissions · question templates |
| M8 | Surveys (rating + feedback + summary) + Evaluations (forms + publish gate + report) |
| M9 | Dashboard — role-aware stats endpoint |
| M10 | Frontend foundation — login, role-aware sidebar, dashboard/courses/students pages |
| M11 | Swagger docs · README · Claude Code project settings |

---

## Not yet built

- Certificate generation
- Multi-language / RTL (Arabic)
- Email/SMS notifications (SMTP not configured)
- Payments
- Self-paced video courses
- More frontend pages (trainers, clients, exam-taking UI, attendance UI, evaluation UI) — backend supports them; UI is just not built yet
