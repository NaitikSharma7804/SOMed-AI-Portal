const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// GET: Fetch reports forwarded to pharmacist
router.get('/pharmacist/reports', verifyToken, restrictTo('PHARMACIST'), async (req, res) => {
  try {
    const reports = await prisma.aDRReport.findMany({
      where: {
        status: { in: ['FORWARDED_TO_PHARMACIST', 'REJECTED_BY_PHARMACIST', 'FORWARDED_TO_DISTRICT', 'FORWARDED_TO_STATE_PVPI'] }
      },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching pharmacist reports:', error);
    res.status(500).json({ error: 'Failed to fetch pharmacist reports' });
  }
});

// PATCH: Pharmacist verify, approve, or reject with comments
router.patch('/pharmacist/report/:id/verify', verifyToken, restrictTo('PHARMACIST'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'APPROVE' or 'REJECT'

    let newStatus = 'FORWARDED_TO_DISTRICT'; // Advances to District Officer queue first
    let updateData = { status: newStatus, pharmacistComment: comment ? `Pharmacist Note: ${comment}` : null };

    if (action === 'REJECT') {
      newStatus = 'REJECTED_BY_PHARMACIST';
      updateData = { 
        status: newStatus, 
        pharmacistComment: comment ? `Pharmacist Note: ${comment}` : 'Rejected due to authenticity or batch discrepancy.' 
      };
    }

    const updated = await prisma.aDRReport.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({ message: 'Pharmacist verification completed, forwarded to District Office', updated });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

module.exports = router;