const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/leaderboard — users sorted by lowest total pushup debt
router.get('/', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        tasks: {
          select: {
            pushupDebt: {
              where: { resolved: false },
              select: { pushupsOwed: true },
            },
          },
        },
        pushupSessions: {
          select: { pushupsCompleted: true },
        },
      },
    });

    const leaderboard = users.map((user) => {
      const totalDebt = user.tasks.reduce((sum, task) => {
        const taskDebt = task.pushupDebt ? task.pushupDebt.pushupsOwed : 0;
        return sum + taskDebt;
      }, 0);

      const totalCompleted = user.pushupSessions.reduce(
        (sum, s) => sum + s.pushupsCompleted,
        0
      );

      return {
        id: user.id,
        email: user.email,
        totalDebt: Math.ceil(totalDebt),
        totalCompleted,
        memberSince: user.createdAt,
      };
    });

    // Sort by lowest debt first, then by most pushups completed as tiebreaker
    leaderboard.sort((a, b) => {
      if (a.totalDebt !== b.totalDebt) return a.totalDebt - b.totalDebt;
      return b.totalCompleted - a.totalCompleted;
    });

    return res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
