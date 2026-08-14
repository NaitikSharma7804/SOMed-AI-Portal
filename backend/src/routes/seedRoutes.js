const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

router.post('/seed', async (req, res) => {
  try {
    // 1. Create a default PATIENT role (or handle if it already exists)
    let role = await prisma.role.findUnique({
      where: { name: 'PATIENT' }
    });

    if (!role) {
      role = await prisma.role.create({
        data: { name: 'PATIENT' }
      });
    }

    // 2. Create a test user linked to this role
    const user = await prisma.user.create({
      data: {
        email: `patient_${Date.now()}@medivigil.com`,
        passwordHash: 'hashedpassword123',
        roleId: role.id
      }
    });

    res.status(201).json({
      message: 'Test user created successfully!',
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;