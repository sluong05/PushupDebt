# 💪 Pushup Debt

A productivity app where unfinished tasks become pushup debt that compounds over time. Complete your tasks or pay the price in reps.

## Features

- **Task management** — create one-off, daily, or weekly recurring tasks with due dates
- **Pushup debt** — missed deadlines generate pushup debt (5 pushups × days overdue), compounding at 10% interest per day
- **Camera-verified pushups** — MediaPipe pose detection tracks elbow angle and back position to count valid reps hands-free
- **Gesture control** — raise your hand above your shoulder and hold for 1.5 s to start/stop counting without touching the screen
- **Leaderboard** — ranked by lowest outstanding debt
- **Streak tracking** — consecutive days with all tasks completed and no unresolved debt
- **User accounts** — sign up with email + username, sign in with either; change password and username in Settings

---

## Project Structure

```
pushup-debt/
├── backend/                  # Express API + Prisma + SQLite
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── dev.db            # SQLite database (auto-created)
│   ├── src/
│   │   ├── index.js          # Express server entry point
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js       # Signup / Login / Me / Change password & username
│   │   │   ├── tasks.js      # CRUD + complete task (supports recurrence)
│   │   │   ├── debt.js       # Pushup debt queries
│   │   │   ├── sessions.js   # Log pushups, reduce debt
│   │   │   ├── streak.js     # Streak calculation
│   │   │   └── leaderboard.js
│   │   └── jobs/
│   │       └── dailyDebt.js  # Midnight cron: debt calc + recurring task reset
│   ├── .env                  # Created from .env.example
│   └── package.json
│
├── frontend/                 # Next.js + TailwindCSS
│   ├── pages/
│   │   ├── index.js          # Dashboard
│   │   ├── login.js          # Sign in (email or username)
│   │   ├── signup.js         # Create account (email + username)
│   │   ├── settings.js       # Change username / password
│   │   ├── leaderboard.js
│   │   └── verify-pushups.js # Camera rep counter (mobile-friendly)
│   ├── components/
│   │   ├── Layout.js         # Top nav + wrapper
│   │   ├── TaskList.js       # Task items with recurrence badges
│   │   ├── DebtSummary.js    # Debt display + breakdown
│   │   ├── AddTaskModal.js   # Create task modal (with recurrence picker)
│   │   └── LogPushupsModal.js
│   ├── contexts/
│   │   └── AuthContext.js    # Auth state + JWT storage
│   ├── lib/
│   │   └── api.js            # Axios API client
│   ├── public/
│   │   ├── upPushupPostition.png    # Reference image for camera setup
│   │   └── downPushupPosition.png
│   ├── styles/
│   │   └── globals.css       # Tailwind + custom component classes
│   └── package.json
│
└── package.json              # Root: runs both servers with concurrently
```

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- npm v9+

### 1. Clone / navigate to the project

```bash
cd pushup-debt
```

### 2. Install all dependencies

```bash
npm run install:all
```

### 3. Configure the backend environment

The `.env` file is already created from `.env.example`. Optionally change `JWT_SECRET`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
```

### 4. Run the database migration

```bash
cd backend
npm run db:migrate
```

This creates `backend/prisma/dev.db` and generates the Prisma client.

### 5. Start the app

From the root directory:

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:3000

### 6. Open the app

Visit http://localhost:3000, create an account, and start adding tasks.

---

## Core Mechanics

### Debt Formula

When a task is not completed by its due date:

```
pushups = 5 × days_overdue
```

| Days Overdue | Pushups Owed |
|---|---|
| 1 day | 5 |
| 2 days | 10 |
| 3 days | 15 |

### Interest

Each day unpaid debt remains, 10% interest is applied:

```
new_debt = current_debt × 1.10
```

Debt recalculates automatically:
- **On dashboard visit** — triggers recalculation for your account
- **Daily at 00:01** — cron job runs for all users

### Recurring Tasks

Tasks can be set to **Daily** or **Weekly** at creation. After a recurring task is completed, it automatically resets at midnight for the next period (next day / next week). If not completed, debt accumulates normally — recurring tasks don't get special treatment until they're done.

### Camera-Verified Pushups

The verify-pushups page uses **MediaPipe Pose** (loaded via CDN) to:
- Track elbow angle — rep counts when angle drops below **85°** (down) then returns above **160°** (up)
- Verify back position — the shoulder-to-hip line must be within **40°** of horizontal to prevent cheating (e.g. sitting upright bending elbows)
- Gesture control — raise either wrist above the shoulder and hold for **1.5 s** to start or stop counting hands-free

On mobile, a live stats bar is shown at the bottom of the camera feed with rep count, back status, and a quick Log button.

### Paying Off Debt

Log completed pushups from the dashboard or the camera verification page. Pushups are applied to the oldest debt first. Once a debt entry reaches 0 it's marked resolved.

### Streak

Counts consecutive days where all tasks due that day were completed and no pushup debt remains unresolved.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create account (email, username, password) |
| POST | `/api/auth/login` | No | Login with email or username |
| GET | `/api/auth/me` | Yes | Get current user |
| PATCH | `/api/auth/username` | Yes | Set or update username |
| PATCH | `/api/auth/password` | Yes | Change password (requires current password) |
| GET | `/api/tasks` | Yes | List tasks (`?date=` or `?upToDate=`) |
| POST | `/api/tasks` | Yes | Create task (supports `recurrence: none\|daily\|weekly`) |
| PATCH | `/api/tasks/:id/complete` | Yes | Mark task complete |
| DELETE | `/api/tasks/:id` | Yes | Delete task |
| GET | `/api/debt` | Yes | List unresolved debts |
| GET | `/api/debt/summary` | Yes | Total debt + stats |
| POST | `/api/debt/calculate` | Yes | Trigger recalculation |
| POST | `/api/sessions` | Yes | Log pushups |
| GET | `/api/sessions` | Yes | Pushup history |
| GET | `/api/streak` | Yes | Current streak |
| GET | `/api/leaderboard` | Yes | All users ranked by debt |

---

## Database Commands

```bash
cd backend

# Open Prisma Studio (visual DB browser)
npm run db:studio

# Push schema changes (dev only)
npx prisma db push

# Regenerate Prisma client after schema changes
npm run db:generate
```

---

## Notes

- The database is a local **SQLite** file (`backend/prisma/dev.db`). For a shared or deployed setup, swap the Prisma datasource to PostgreSQL and update `DATABASE_URL`.
- MediaPipe models (~10 MB) are downloaded from jsDelivr CDN on first visit to the verify-pushups page — an internet connection is required for that page.
