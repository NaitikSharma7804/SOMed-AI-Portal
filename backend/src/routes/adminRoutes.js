const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyToken } = require('../middleware/authMiddleware'); // Updated path

// GET: List all registered doctors in the hospital for assignment
router.get('/doctors', verifyToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: {
          name: {
            in: ['AYURVEDA_DOCTOR', 'ALLOPATHY_DOCTOR', 'SIDDHA_SPECIALIST', 'HOMEOPATHY_SPECIALIST', 'UNANI_SPECIALIST']
          }
        }
      },
      select: { id: true, email: true, role: true }
    });
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// PATCH: Assign or re-route a report to a specific doctor/domain
router.patch('/report/:id/assign', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    const updated = await prisma.aDRReport.update({
      where: { id },
      data: { category: category }
    });

    res.status(200).json({ message: 'Report domain assigned successfully', updated });
  } catch (error) {
    console.error('Assignment error:', error);
    res.status(500).json({ error: 'Failed to assign report', details: error.message });
  }
});

// GET: Generate downloadable hospital performance report summary
router.get('/hospital/export', verifyToken, async (req, res) => {
  try {
    const reports = await prisma.aDRReport.findMany({
      include: { user: { select: { email: true } } }
    });

    res.status(200).json({
      institution: "SOMed AI National & Hospital Node",
      generatedAt: new Date(),
      totalRecords: reports.length,
      data: reports
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate hospital report' });
  }
});

module.exports = router;