require('dotenv').config(); // <--- MUST be the very first line!

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const adrRoutes = require('./routes/adrRoutes');
const seedRoutes = require('./routes/seedRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Imported here
const pharmacistRoutes = require('./routes/pharmacistRoutes');
const stateRoutes = require('./routes/stateRoutes');
const nationalRoutes = require('./routes/nationalRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes

app.use('/api', adrRoutes);
app.use('/api', seedRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api', pharmacistRoutes);
app.use('/api', stateRoutes);
app.use('/api', nationalRoutes);
app.use('/api/ai', aiRoutes);
const districtRoutes = require('./routes/districtRoutes'); 
app.use('/api', districtRoutes); 

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to SOMed AI API (MySQL & JavaScript Edition)',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Somed AI Server running on port ${PORT}`);
});