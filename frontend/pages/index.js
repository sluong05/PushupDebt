import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import TaskList from '../components/TaskList';
import DebtSummary from '../components/DebtSummary';
import AddTaskModal from '../components/AddTaskModal';
import LogPushupsModal from '../components/LogPushupsModal';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, getDebt, getStreak, recalculateDebt } from '../lib/api';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [debts, setDebts] = useState([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showLogPushups, setShowLogPushups] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [tasksRes, debtRes, streakRes] = await Promise.all([
        getTasks({ upToDate: today }),   // overdue incomplete + completed today
        getDebt(),
        getStreak(),
      ]);
      setTasks(tasksRes.data.tasks);
      setDebts(debtRes.data.debts);
      setTotalOwed(debtRes.data.totalOwed);
      setStreak(streakRes.data.streak);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  // On mount, trigger debt recalculation then load data
  useEffect(() => {
    if (!user) return;
    recalculateDebt().catch(() => {}).finally(() => loadData());
  }, [user]);

  async function handleTaskAdded() {
    // Recalculate in case the new task was already overdue, then refresh all data
    await recalculateDebt().catch(() => {});
    loadData();
  }

  function handleLogged() {
    loadData();
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter((t) => !t.completed && new Date(t.dueDate) < today).length;
  // Tasks due today that haven't been completed yet — these will become debt tonight
  const todayAtRisk = tasks.filter((t) => {
    if (t.completed) return false;
    const due = new Date(t.dueDate);
    return due >= today && due <= todayEnd;
  });

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Layout streak={streak}>
      {/* Page header */}
      <div className="mb-8">
        <p className="text-zinc-500 text-sm mb-1">{todayLabel()}</p>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — Tasks */}
          <div className="lg:col-span-3">
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-zinc-100">Tasks</h2>
                    {overdueCount > 0 && (
                      <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-medium">
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {completedCount}/{tasks.length} completed
                  </p>
                </div>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="btn-primary text-sm py-2 px-3 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Task
                </button>
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div className="mb-5">
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <TaskList tasks={tasks} onTaskUpdated={loadData} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="card py-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">{tasks.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Active Tasks</p>
              </div>
              <div className="card py-4 text-center">
                <p className="text-2xl font-bold text-green-400">{completedCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Completed</p>
              </div>
              <div className="card py-4 text-center">
                <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-400' : 'text-zinc-400'}`}>
                  {pendingCount}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Pending</p>
              </div>
            </div>
          </div>

          {/* Right column — Debt */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-100">Pushup Debt</h2>
              {totalOwed > 0 && (
                <button
                  onClick={() => setShowLogPushups(true)}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium"
                >
                  Log pushups →
                </button>
              )}
            </div>

            <DebtSummary
              debts={debts}
              totalOwed={totalOwed}
              todayAtRisk={todayAtRisk}
              onLogPushups={() => setShowLogPushups(true)}
            />

            {/* Formula info */}
            <div className="card mt-4 bg-zinc-900/50">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                How It Works
              </h3>
              <div className="space-y-2 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono">5 × days</span>
                  <span>pushups per overdue day</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono">×1.10</span>
                  <span>daily interest on unpaid debt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono">🔥</span>
                  <span>streak resets if debt remains</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddTask && (
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onTaskAdded={handleTaskAdded}
        />
      )}

      {showLogPushups && (
        <LogPushupsModal
          totalOwed={totalOwed}
          onClose={() => setShowLogPushups(false)}
          onLogged={handleLogged}
        />
      )}
    </Layout>
  );
}
