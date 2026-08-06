const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const path = require('path');
require('dotenv').config();

const app = express();

// Keamanan HTTP Headers
app.use(helmet());

// Cookie parser untuk membaca HttpOnly cookies
app.use(cookieParser());

const frontendUrl = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL 
  : (process.env.FRONTEND_URL || 'http://localhost:5173');

if (process.env.NODE_ENV === 'production' && !frontendUrl) {
  console.error("FATAL ERROR: FRONTEND_URL is required in production environment.");
  process.exit(1);
}

// Konfigurasi CORS yang lebih ketat
app.use(cors({
  origin: frontendUrl,
  credentials: true, // Wajib agar cookie bisa melintas antar domain/port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting (Mencegah brute-force secara umum)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 1000, // Limit 1000 request per IP per 15 menit untuk route umum (dinaikkan agar tidak 429 saat dev/usage)
  message: { error: 'Terlalu banyak permintaan dari IP Anda, silakan coba lagi nanti.' }
});
app.use('/api', globalLimiter);

// Default Route
app.get('/api', (req, res) => {
  res.json({ message: 'Face Recognition Attendance API is running.' });
});

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 3000;
// Saat berjalan di Vercel, app.listen tidak selalu dibutuhkan, tapi aman untuk local dev
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
