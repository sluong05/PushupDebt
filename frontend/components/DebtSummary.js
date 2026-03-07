export default function DebtSummary({ debts, totalOwed, todayAtRisk = [], onLogPushups }) {
  const potentialAdditional = todayAtRisk.length * 5;
  const potentialTotal = totalOwed + potentialAdditional;

  if (totalOwed === 0 && todayAtRisk.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-5xl mb-4">🎉</p>
        <p className="text-xl font-bold text-green-400">No Debt!</p>
        <p className="text-zinc-500 text-sm mt-2">You're all caught up. Keep it up!</p>
      </div>
    );
  }

  if (totalOwed === 0 && todayAtRisk.length > 0) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-lg font-bold text-green-400">No Debt Right Now</p>
          <p className="text-zinc-500 text-sm mt-1">Finish today's tasks to keep it that way.</p>
        </div>
        <PotentialDebtCard todayAtRisk={todayAtRisk} potentialAdditional={potentialAdditional} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total owed */}
      <div className="card bg-gradient-to-br from-red-900/30 to-zinc-900 border-red-800/40">
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-1">Total Pushups Owed</p>
          <p className="text-6xl font-bold text-red-400 tabular-nums">{totalOwed}</p>
          <p className="text-sm text-zinc-500 mt-2">
            {debts.length} overdue {debts.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>

        {/* Potential total preview */}
        {potentialAdditional > 0 && (
          <div className="mt-4 border-t border-red-900/40 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">If today's tasks go unfinished</span>
              <span className="text-orange-400 font-bold tabular-nums">+{potentialAdditional}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-zinc-500">Total at risk</span>
              <span className="text-orange-300 font-bold tabular-nums">{potentialTotal}</span>
            </div>
          </div>
        )}

        <button onClick={onLogPushups} className="btn-primary w-full mt-5 text-base py-3">
          💪 Log Pushups
        </button>
      </div>

      {/* Potential debt from today's unfinished tasks */}
      {potentialAdditional > 0 && (
        <PotentialDebtCard todayAtRisk={todayAtRisk} potentialAdditional={potentialAdditional} />
      )}

      {/* Individual existing debts */}
      {debts.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Current Breakdown
          </h3>
          <div className="space-y-3">
            {debts.map((debt) => (
              <div key={debt.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{debt.task.title}</p>
                  <p className="text-xs text-zinc-500">
                    {debt.daysOverdue} {debt.daysOverdue === 1 ? 'day' : 'days'} overdue
                    {debt.interestApplied && (
                      <span className="text-orange-500/80 ml-1">· +10% interest</span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm font-bold text-red-400 tabular-nums">
                    {Math.ceil(debt.pushupsOwed)}
                  </span>
                  <span className="text-xs text-zinc-600 ml-1">reps</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PotentialDebtCard({ todayAtRisk, potentialAdditional }) {
  return (
    <div className="card border-orange-900/40 bg-orange-950/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-orange-400/80 uppercase tracking-wide">
          At Risk Today
        </h3>
        <span className="text-xs text-zinc-600">if left unfinished</span>
      </div>

      <div className="space-y-2">
        {todayAtRisk.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-400 truncate">{task.title}</p>
            <span className="text-sm font-semibold text-orange-500/80 tabular-nums flex-shrink-0">
              +5
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-orange-900/30 mt-3 pt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {todayAtRisk.length} task{todayAtRisk.length !== 1 ? 's' : ''} · 5 pushups each
        </span>
        <span className="text-sm font-bold text-orange-400 tabular-nums">
          +{potentialAdditional} pushups
        </span>
      </div>
    </div>
  );
}
