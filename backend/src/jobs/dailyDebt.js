const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

/**
 * Calculate pushup debt for a specific user (or all users if userId is null).
 *
 * Rules:
 * - Incomplete tasks past their dueDate generate debt: pushups = 5 * days_overdue
 * - Existing unresolved debt compounds: new_debt = current_debt * 1.10
 * - Days overdue is recalculated each run
 */
async function calculateAndUpdateDebt(userId = null) {
  const now = new Date();

  const whereClause = {
    completed: false,
    dueDate: { lt: now },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const overdueTasks = await prisma.task.findMany({
    where: whereClause,
    include: { pushupDebt: true },
  });

  for (const task of overdueTasks) {
    const dueDate = new Date(task.dueDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOverdue = Math.max(1, Math.ceil((now - dueDate) / msPerDay));
    const basePushups = 5 * daysOverdue;

    if (!task.pushupDebt) {
      // First time this task is overdue — create new debt entry
      await prisma.pushupDebt.create({
        data: {
          taskId: task.id,
          pushupsOwed: basePushups,
          daysOverdue,
          interestApplied: false,
          resolved: false,
        },
      });
    } else if (!task.pushupDebt.resolved) {
      // Debt already exists and is unpaid — apply 10% interest
      const currentOwed = task.pushupDebt.pushupsOwed;
      const newOwed = currentOwed * 1.10;

      await prisma.pushupDebt.update({
        where: { id: task.pushupDebt.id },
        data: {
          pushupsOwed: newOwed,
          daysOverdue,
          interestApplied: true,
        },
      });
    }
  }

  console.log(`[DebtJob] Processed ${overdueTasks.length} overdue tasks${userId ? ` for user ${userId}` : ''}`);
}

/**
 * Start the daily debt cron job — runs at midnight every day
 */
function startDebtCronJob() {
  // Run at 00:01 every day
  cron.schedule('1 0 * * *', async () => {
    console.log('[DebtJob] Running daily debt calculation...');
    try {
      await calculateAndUpdateDebt();
      console.log('[DebtJob] Done.');
    } catch (err) {
      console.error('[DebtJob] Error during debt calculation:', err);
    }
  });

  console.log('[DebtJob] Daily debt cron job scheduled (runs at 00:01 daily)');
}

module.exports = { calculateAndUpdateDebt, startDebtCronJob };
