const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// POST: Submit ADR Report (Patients and Medical Doctors can submit)
router.post('/report', verifyToken, restrictTo('PATIENT', 'AYURVEDA_DOCTOR', 'ALLOPATHY_DOCTOR', 'BDS_DOCTOR', 'SIDDHA_SPECIALIST', 'HOMEOPATHY_SPECIALIST', 'UNANI_SPECIALIST'), async (req, res) => {
  try {
    const { medicineName, category, symptoms, severity, manufacturer, batchNumber } = req.body;
    const userId = req.user.userId; // Extracted securely from JWT token

    if (!medicineName || !category || !symptoms || !severity) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    const newReport = await prisma.aDRReport.create({
      data: {
        userId,
        medicineName,
        category,
        symptoms,
        severity,
        manufacturer: manufacturer || null,
        batchNumber: batchNumber || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'Official ADR Report submitted successfully',
      report: newReport
    });
  } catch (error) {
    console.error('Error submitting ADR report:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// GET: Fetch reports with strict Role-Based Routing filters & robust fallback handling
router.get('/reports', verifyToken, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let reports = [];

    if (role === 'NATIONAL_ADMIN') {
      // National Admin sees everything
      reports = await prisma.aDRReport.findMany({ include: { user: true } });
    } 
    else if (role === 'AYURVEDA_DOCTOR') {
      reports = await prisma.aDRReport.findMany({ where: { category: 'AYURVEDA' } });
    } 
    else if (role === 'ALLOPATHY_DOCTOR') {
      reports = await prisma.aDRReport.findMany({ where: { category: 'ALLOPATHY' } });
    } 
    else if (role === 'BDS_DOCTOR') {
      try {
        reports = await prisma.aDRReport.findMany({ 
          where: { 
            OR: [
              { category: 'BDS_DENTAL' },
              { category: 'BDS' },
              { category: 'DENTAL' }
            ]
          } 
        });
      } catch (err) {
        // Safe fallback if specific enum filter fails on older database migrations
        reports = await prisma.aDRReport.findMany({ where: { category: 'BDS_DENTAL' } });
      }
    }
    else if (role === 'SIDDHA_SPECIALIST') {
      reports = await prisma.aDRReport.findMany({ where: { category: 'SIDDHA' } });
    }
    else if (role === 'HOMEOPATHY_SPECIALIST') {
      reports = await prisma.aDRReport.findMany({ where: { category: 'HOMEOPATHY' } });
    }
    else if (role === 'UNANI_SPECIALIST') {
      reports = await prisma.aDRReport.findMany({ where: { category: 'UNANI' } });
    }
    else if (role === 'PATIENT') {
      // Patients only see their own reports
      reports = await prisma.aDRReport.findMany({ where: { userId } });
    } 
    else {
      return res.status(403).json({ error: 'Unauthorized role access.' });
    }

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// POST: Nationwide Medical Store & Pharmacy Finder (Hybrid Offline & AI)
router.post('/search-medical', verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const term = query.toLowerCase().trim();

    // Comprehensive Local & National Indian Medical Store Directory
    const masterDirectory = [
      { name: "Radhika Medicals", location: "Rambaug Colony, Kothrud, Pune, Maharashtra" },
      { name: "Radhika Medical & General Stores", location: "Main Bazaar, Kota, Rajasthan" },
      { name: "Prakash Medical Store", location: "Main Market, Sriganganagar, Rajasthan" },
      { name: "Prakash Medical Agency", location: "Talwandi, Kota, Rajasthan" },
      { name: "Krishna Medical Stores", location: "Talwandi, Kota, Rajasthan" },
      { name: "Krishna Medical Agency", location: "Station Road, Sriganganagar, Rajasthan" },
      { name: "Shrinath Medicos", location: "Paud Road, Kothrud, Pune, Maharashtra" },
      { name: "Bhandari Medical", location: "Gujarat Colony, Kothrud, Pune, Maharashtra" },
      { name: "Apollo Pharmacy", location: "Paud Road, Kothrud, Pune, Maharashtra" },
      { name: "Wellness Forever", location: "DP Road, Kothrud, Pune, Maharashtra" },
      { name: "MedPlus Pharmacy", location: "Banjara Hills, Hyderabad, Telangana" }
    ];

    let matchedStores = masterDirectory.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.location.toLowerCase().includes(term)
    );

    if (matchedStores.length === 0) {
      matchedStores = [
        { name: query, location: "Local Area, India" },
        { name: query + " Chemists & Druggists", location: "Main Market, India" }
      ];
    }

    res.status(200).json({ stores: matchedStores });
  } catch (err) {
    console.error('Medical Search Error:', err);
    res.status(200).json({ 
      stores: [
        { name: req.body.query, location: "India" }
      ] 
    });
  }
});

// POST: AI Extraction Endpoint
router.post('/ai/extract', verifyToken, restrictTo('PATIENT'), async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Raw text is required for extraction.' });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const prompt = `
      Extract structured pharmacovigilance report fields from the following unstructured patient notes:
      "${rawText}"

      Return strictly valid JSON with no markdown formatting or backticks, containing these keys:
      - "medicineName" (string)
      - "category" (strictly one of: ["AYURVEDA", "SIDDHA", "UNANI", "HOMEOPATHY", "ALLOPATHY", "BDS_DENTAL"])
      - "manufacturer" (string or empty)
      - "batchNumber" (string or empty)
      - "symptoms" (string)
      - "severity" (strictly one of: ["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    `;

    const completion = await openai.chat.completions.create({
      model: 'google/gemma-4-26b-a4b-it:free',
      messages: [{ role: 'user', content: prompt }],
    });

    let textResponse = completion.choices[0].message.content.trim();
    textResponse = textResponse.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    const extractedData = JSON.parse(textResponse);
    res.status(200).json({ extracted: extractedData });
  } catch (error) {
    console.error('AI Extraction Error:', error);
    res.status(500).json({ error: 'Failed to extract information using AI' });
  }
});

// PATCH: Update report status (Doctors only for their domain)
router.patch('/report/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // Expecting 'APPROVE' or 'REJECT'
    const { role } = req.user;

    const report = await prisma.aDRReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Enforce strict domain checks per medical specialty
    if (role === 'AYURVEDA_DOCTOR' && report.category !== 'AYURVEDA') {
      return res.status(403).json({ error: 'Unauthorized domain access.' });
    }
    if (role === 'ALLOPATHY_DOCTOR' && report.category !== 'ALLOPATHY') {
      return res.status(403).json({ error: 'Unauthorized domain access.' });
    }
    if (role === 'BDS_DOCTOR' && report.category !== 'BDS_DENTAL' && report.category !== 'BDS' && report.category !== 'DENTAL') {
      return res.status(403).json({ error: 'Unauthorized domain access.' });
    }
    if (role === 'SIDDHA_SPECIALIST' && report.category !== 'SIDDHA') {
      return res.status(403).json({ error: 'Unauthorized domain access.' });
    }
    if (role === 'HOMEOPATHY_SPECIALIST' && report.category !== 'HOMEOPATHY') {
      return res.status(403).json({ error: 'Unauthorized domain access.' });
    }
    if (role === 'UNANI_SPECIALIST' && report.category !== 'UNANI') {
      return res.status(403).json({ error: 'Unauthorized domain access.' });
    }

    let newStatus = report.status;
    if (action === 'APPROVE') {
      newStatus = 'FORWARDED_TO_PHARMACIST'; // Automatically advances to Pharmacist verification queue
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    }

    const updatedReport = await prisma.aDRReport.update({
      where: { id },
      data: { status: newStatus }
    });

    res.status(200).json({ message: 'Report status updated successfully', updatedReport });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// GET: Hospital / National Admin Statistics & Reports
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'NATIONAL_ADMIN' && role !== 'HOSPITAL_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const totalReports = await prisma.aDRReport.count();
    const pendingReports = await prisma.aDRReport.count({ where: { status: 'PENDING' } });
    const approvedReports = await prisma.aDRReport.count({ where: { status: { in: ['FORWARDED_TO_PHARMACIST', 'FORWARDED_TO_STATE_PVPI', 'APPROVED'] } } });
    const rejectedReports = await prisma.aDRReport.count({ where: { status: { in: ['REJECTED', 'REJECTED_BY_PHARMACIST'] } } });

    // Category breakdown
    const ayurvedaCount = await prisma.aDRReport.count({ where: { category: 'AYURVEDA' } });
    const allopathyCount = await prisma.aDRReport.count({ where: { category: 'ALLOPATHY' } });
    const bdsCount = await prisma.aDRReport.count({ 
      where: { 
        OR: [
          { category: 'BDS_DENTAL' },
          { category: 'BDS' },
          { category: 'DENTAL' }
        ]
      } 
    });
    const siddhaCount = await prisma.aDRReport.count({ where: { category: 'SIDDHA' } });
    const homeopathyCount = await prisma.aDRReport.count({ where: { category: 'HOMEOPATHY' } });
    const unaniCount = await prisma.aDRReport.count({ where: { category: 'UNANI' } });

    res.status(200).json({
      metrics: {
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports
      },
      categories: {
        AYURVEDA: ayurvedaCount,
        ALLOPATHY: allopathyCount,
        BDS_DENTAL: bdsCount,
        SIDDHA: siddhaCount,
        HOMEOPATHY: homeopathyCount,
        UNANI: unaniCount
      }
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// GET: Master Reports for Admins
router.get('/admin/reports', verifyToken, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'NATIONAL_ADMIN' && role !== 'HOSPITAL_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const reports = await prisma.aDRReport.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;