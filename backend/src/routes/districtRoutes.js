const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// GET: Fetch reports pending district review
router.get('/district/reports', verifyToken, restrictTo('DISTRICT_OFFICER'), async (req, res) => {
  try {
    const reports = await prisma.aDRReport.findMany({
      where: { status: 'FORWARDED_TO_DISTRICT' },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching district reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH: District action (Approve & Forward to State, or Reject with comment)
router.patch('/district/report/:id/action', verifyToken, restrictTo('DISTRICT_OFFICER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // 'APPROVE' or 'REJECT'

    const report = await prisma.aDRReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    let newStatus = report.status;
    if (action === 'APPROVE') {
      newStatus = 'FORWARDED_TO_STATE_PVPI';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED_BY_DISTRICT';
    }

    const updated = await prisma.aDRReport.update({
      where: { id },
      data: { 
        status: newStatus,
        pharmacistComment: comment ? `District Note: ${comment}` : report.pharmacistComment 
      }
    });

    res.status(200).json({ message: 'District review updated successfully', updated });
  } catch (error) {
    console.error('Error processing district action:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;