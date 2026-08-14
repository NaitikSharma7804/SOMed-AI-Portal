const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// GET: Fetch reports forwarded to State level from District
router.get('/state/reports', verifyToken, restrictTo('STATE_OFFICER'), async (req, res) => {
  try {
    const reports = await prisma.aDRReport.findMany({
      where: {
        status: { in: ['FORWARDED_TO_STATE_PVPI', 'APPROVED_BY_STATE', 'ESCALATED'] }
      },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching state reports:', error);
    res.status(500).json({ error: 'Failed to fetch state reports' });
  }
});

// GET: State Analytics & Medicine Trends
router.get('/state/analytics', verifyToken, restrictTo('STATE_OFFICER'), async (req, res) => {
  try {
    const totalStateReports = await prisma.aDRReport.count({
      where: { status: { in: ['FORWARDED_TO_STATE_PVPI', 'APPROVED_BY_STATE', 'ESCALATED'] } }
    });
    const approvedStateCount = await prisma.aDRReport.count({ where: { status: 'APPROVED_BY_STATE' } });
    const escalatedCount = await prisma.aDRReport.count({ where: { status: 'ESCALATED' } });

    // Group by medicine for trends
    const medicineTrends = await prisma.aDRReport.groupBy({
      by: ['medicineName'],
      _count: { medicineName: true },
      orderBy: { _count: { medicineName: 'desc' } },
      take: 5
    });

    res.status(200).json({
      metrics: { totalStateReports, approvedStateCount, escalatedCount },
      trends: medicineTrends
    });
  } catch (error) {
    console.error('Error fetching state analytics:', error);
    res.status(500).json({ error: 'Failed to fetch state analytics' });
  }
});

// PATCH: State Officer Action (Approve & Forward to National, or Escalate)
router.patch('/state/report/:id/action', verifyToken, restrictTo('STATE_OFFICER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // Expecting 'APPROVE' or 'ESCALATE'

    const report = await prisma.aDRReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    let newStatus = action === 'APPROVE' ? 'APPROVED_BY_STATE' : 'ESCALATED';

    const updated = await prisma.aDRReport.update({
      where: { id },
      data: { 
        status: newStatus,
        pharmacistComment: comment ? `State Note: ${comment}` : report.pharmacistComment
      }
    });

    res.status(200).json({ 
      message: `Report successfully ${action === 'APPROVE' ? 'Approved & Forwarded to National' : 'Escalated'}`, 
      updated 
    });
  } catch (error) {
    console.error('Error processing state action:', error);
    res.status(500).json({ error: 'Failed to process state action' });
  }
});

module.exports = router;