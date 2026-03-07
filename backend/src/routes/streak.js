const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Calculate the user's current streak.
 * A streak day = a day where all tasks due that day were completed
 * AND no pushup debt was created (or all debt was resolved same day).
 *
 * We look back day by day from yesterday and count consecutive clean days.
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check up to 365 days back
    for (let i = 1; i <= 365; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Get all tasks that were due on this day
      const tasksDueThisDay = await prisma.task.findMany({
        where: {
          userId,
          dueDate: { gte: dayStart, lte: dayEnd },
        },
        include: { pushupDebt: true },
      });

      // If no tasks were due, skip this day (doesn't break streak)
      if (tasksDueThisDay.length === 0) continue;

      // Check if all tasks were completed
      const allCompleted = tasksDueThisDay.every((t) => t.completed);

      // Check if any unresolved debt exists from this day
      const hasUnresolvedDebt = tasksDueThisDay.some(
        (t) => t.pushupDebt && !t.pushupDebt.resolved
      );

      if (allCompleted && !hasUnresolvedDebt) {
        streak++;
      } else {
        break;
      }
    }

    return res.json({ streak });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
