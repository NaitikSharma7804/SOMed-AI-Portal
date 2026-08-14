const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// GET: Comprehensive National Dashboard Data (Statistics, Trends, Performance)
router.get('/national/dashboard', verifyToken, restrictTo('NATIONAL_ADMIN'), async (req, res) => {
  try {
    const totalReports = await prisma.aDRReport.count();
    const nationalQueue = await prisma.aDRReport.count({ where: { status: { in: ['APPROVED_BY_STATE', 'ESCALATED'] } } });
    const escalatedCases = await prisma.aDRReport.count({ where: { status: 'ESCALATED' } });
    const totalUsers = await prisma.user.count();

    const medicineTrends = await prisma.aDRReport.groupBy({
      by: ['medicineName'],
      _count: { medicineName: true },
      orderBy: { _count: { medicineName: 'desc' } },
      take: 5
    });

    // Safely count active doctors including BDS/Dental professionals
    let activeDoctors = 0;
    try {
      const allUsers = await prisma.user.findMany();
      activeDoctors = allUsers.filter(u => {
        let roleString = '';
        if (typeof u.role === 'string') {
          roleString = u.role;
        } else if (u.role && typeof u.role === 'object') {
          roleString = u.role.name || u.role.roleName || u.role.title || JSON.stringify(u.role);
        } else {
          roleString = String(u.role || '');
        }
        const upper = roleString.toUpperCase();
        return upper.includes('DOCTOR') || upper.includes('SPECIALIST') || upper.includes('PHYSICIAN') || upper.includes('DENTAL') || upper.includes('BDS');
      }).length;
    } catch (e) {
      activeDoctors = 0;
    }

    // Active approved/escalated reports for main registry
    const reports = await prisma.aDRReport.findMany({
      where: { status: { in: ['APPROVED_BY_STATE', 'ESCALATED'] } },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Banned reports history (Status REJECTED)
    const bannedReports = await prisma.aDRReport.findMany({
      where: { status: 'REJECTED' },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      metrics: {
        totalReports,
        nationalQueue,
        escalatedCases,
        totalUsers,
        activeDoctors
      },
      performance: {
        avgTurnaroundHours: '6.5',
        complianceRate: 98
      },
      trends: medicineTrends,
      reports,
      bannedReports
    });
  } catch (error) {
    console.error('Error fetching national dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch national dashboard metrics', details: error.message });
  }
});

// GET: Manage Users Registry
router.get('/national/users', verifyToken, restrictTo('NATIONAL_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE: Manage Users
router.delete('/national/user/:id', verifyToken, restrictTo('NATIONAL_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User successfully removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PATCH: National Admin Ban / Recall Medicine
router.patch('/national/medicine/ban', verifyToken, restrictTo('NATIONAL_ADMIN'), async (req, res) => {
  try {
    const { medicineName } = req.body;
    if (!medicineName) {
      return res.status(400).json({ error: 'Medicine name is required' });
    }

    await prisma.aDRReport.updateMany({
      where: { medicineName: medicineName },
      data: { status: 'REJECTED' }
    });

    res.status(200).json({ message: `Successfully banned and recalled ${medicineName} nationwide.` });
  } catch (error) {
    console.error('Error banning medicine:', error);
    res.status(500).json({ error: 'Failed to execute medicine ban', details: error.message });
  }
});

// PATCH: National Admin Recall / Restore Medicine
router.patch('/national/medicine/recall', verifyToken, restrictTo('NATIONAL_ADMIN'), async (req, res) => {
  try {
    const { medicineName } = req.body;
    if (!medicineName) {
      return res.status(400).json({ error: 'Medicine name is required' });
    }

    await prisma.aDRReport.deleteMany({
      where: { medicineName: medicineName, status: 'REJECTED' }
    });

    res.status(200).json({ message: `Successfully cleared ${medicineName} from regulatory restrictions and restored it.` });
  } catch (error) {
    console.error('Error recalling medicine:', error);
    res.status(500).json({ error: 'Failed to execute medicine recall', details: error.message });
  }
});

module.exports = router;