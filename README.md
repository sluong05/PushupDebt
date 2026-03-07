# 💪 Pushup Debt

A productivity app where unfinished tasks become pushup debt that compounds over time.

## Project Structure

```
pushup-debt/
├── backend/                  # Express API + Prisma + SQLite
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Auto-generated migrations
│   ├── src/
│   │   ├── index.js          # Express server entry point
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js       # Login / Signup / Me
│   │   │   ├── tasks.js      # CRUD + complete task
│   │   │   ├── debt.js       # Pushup debt queries
│   │   │   ├── sessions.js   # Log pushups, reduce debt
│   │   │   ├── streak.js     # Streak calculation
│   │   │   └── leaderboard.js
│   │   └── jobs/
│   │       └── dailyDebt.js  # Cron job + debt calculation logic
│   ├── .env                  # Created from .env.example
│   └── package.json
│
├── frontend/                 # Next.js + TailwindCSS
│   ├── pages/
│   │   ├── index.js          # Dashboard
│   │   ├── login.js
│   │   ├── signup.js
│   │   └── leaderboard.js
│   ├── components/
│   │   ├── Layout.js         # Top bar + wrapper
│   │   ├── TaskList.js       # Task items with complete/delete
│   │   ├── DebtSummary.js    # Debt display + breakdown
│   │   ├── AddTaskModal.js   # Create task modal
│   │   └── LogPushupsModal.js
│   ├── contexts/
│   │   └── AuthContext.js    # Auth state + JWT storage
│   ├── lib/
│   │   └── api.js            # Axios API client
│   ├── styles/
│   │   └── globals.css       # Tailwind + custom component classes
│   └── package.json
│
└── package.json              # Root: runs both servers with concurrently
```

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

Or manually:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure the backend environment

The `.env` file is already created from `.env.example`. You can optionally change the `JWT_SECRET`:

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

This creates `backend/prisma/dev.db` (SQLite file) and generates the Prisma client.

### 5. Start the app

From the root directory:

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:3000

Or start them individually:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### 6. Open the app

Visit http://localhost:3000, create an account, and start adding tasks.

---

## Core Mechanics

### Debt Formula

When a task is not completed by its due date, pushup debt is calculated as:

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

The debt recalculation runs automatically:
- **At startup** when you visit the dashboard (triggers recalculation for your account)
- **Daily at 00:01** via a cron job for all users

### Paying Off Debt

Log completed pushups on the dashboard. Pushups are applied to the oldest debt first. Once a debt entry reaches 0, it's marked resolved.

### Streak

Your streak counts consecutive days where all tasks due that day were completed and no pushup debt remains unresolved.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/tasks` | Yes | List tasks (filter by `?date=YYYY-MM-DD`) |
| POST | `/api/tasks` | Yes | Create task |
| PATCH | `/api/tasks/:id/complete` | Yes | Mark task complete |
| DELETE | `/api/tasks/:id` | Yes | Delete task |
| GET | `/api/debt` | Yes | List unresolved debts |
| GET | `/api/debt/summary` | Yes | Debt stats |
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

# Re-run migrations after schema changes
npm run db:migrate

# Regenerate Prisma client after schema changes
npm run db:generate
```
