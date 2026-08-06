const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi Multer untuk upload logo (Memory Storage for Vercel Serverless)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan.'));
    }
  }
});
const db = require('../db/turso');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

function euclideanDistance(desc1, desc2) {
  if (desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

const authenticateToken = (req, res, next) => {
  // Ambil token dari cookie atau header authorization (fallback)
  const token = req.cookies?.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- HELPER TIMEZONE JAKARTA ---
const getJakartaTime = (date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
};

const getJakartaDateString = () => {
  const jt = getJakartaTime();
  const yyyy = jt.getFullYear();
  const mm = String(jt.getMonth() + 1).padStart(2, '0');
  const dd = String(jt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getJakartaTimeString = () => {
  const jt = getJakartaTime();
  const hh = String(jt.getHours()).padStart(2, '0');
  const min = String(jt.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
};

const getJakartaDayString = () => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[getJakartaTime().getDay()];
};

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Max 100 attempts (ditingkatkan untuk development)
  message: { error: 'Terlalu banyak percobaan, coba lagi dalam 15 menit.' }
});

const kioskLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 15, // Max 15 scan per menit
  message: { error: 'Harap tunggu sebentar sebelum memindai lagi.' }
});

// Zod Schemas
const loginSchema = z.object({
  nomor_induk: z.string().min(1, 'Nomor Induk wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi')
});

const enrollSchema = z.object({
  nomor_induk: z.string().min(1, 'Nomor Induk wajib diisi'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  role: z.string().min(1, 'Role wajib diisi'),
  departemen: z.string().optional(),
  email: z.string().email('Format email tidak valid'),
  descriptor: z.array(z.number())
});

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// --- Settings API (CMS) ---
router.get('/settings', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM app_settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({
        app_name: 'Nongol Dulu',
        student_label: 'Mahasiswa',
        lecturer_label: 'Dosen',
        staff_label: 'Staff Admin',
        department_label: 'Departemen',
        lecturer_subtitle: 'Kelola jadwal, absensi, dan jurnal dengan mudah dan cepat.',
        student_subtitle: 'Pantau jadwalmu dan pastikan kehadiran selalu tercatat dengan baik hari ini.',
        staff_subtitle: 'Pantau jadwal shift Anda dan pastikan log kehadiran harian tercatat secara akurat.',
        subject_label: 'Mata Kuliah',
        schedule_label: 'Jadwal Perkuliahan',
        student_header: 'SIAKAD Mahasiswa',
        lecturer_header: 'SIAKAD Dosen V5',
        staff_header: 'SIAKAD Staff'
      });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil pengaturan.' });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    const {
      app_name, app_logo, student_label, lecturer_label, staff_label, department_label,
      lecturer_subtitle, student_subtitle, staff_subtitle, subject_label, schedule_label,
      student_header, lecturer_header, staff_header
    } = req.body;

    await db.execute({
      sql: `UPDATE app_settings SET 
              app_name = ?, app_logo = ?, student_label = ?, lecturer_label = ?, staff_label = ?, department_label = ?, 
              lecturer_subtitle = ?, student_subtitle = ?, staff_subtitle = ?, subject_label = ?, schedule_label = ?, 
              student_header = ?, lecturer_header = ?, staff_header = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM app_settings LIMIT 1)`,
      args: [
        app_name, app_logo, student_label, lecturer_label, staff_label, department_label,
        lecturer_subtitle, student_subtitle, staff_subtitle, subject_label, schedule_label,
        student_header, lecturer_header, staff_header
      ]
    });

    res.json({ message: 'Pengaturan berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui pengaturan.' });
  }
});

router.post('/settings/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    }
    
    // Convert buffer to base64 Data URI
    const base64Str = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${base64Str}`;
    
    res.json({ url: dataUri });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Gagal mengunggah logo.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { nomor_induk, password } = loginSchema.parse(req.body);

    const userRes = await db.execute({
      sql: 'SELECT * FROM users WHERE nomor_induk = ?',
      args: [nomor_induk]
    });
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Nomor Induk tidak ditemukan.' });

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Password salah.' });

    const token = jwt.sign(
      { id: user.id, nomor_induk: user.nomor_induk, role: user.role, nama: user.nama },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token in HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 jam
    });

    res.json({ message: 'Login berhasil', user: { id: user.id, nomor_induk: user.nomor_induk, role: user.role, nama: user.nama, email: user.email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout berhasil' });
});

router.get('/generate-induk', async (req, res) => {
  try {
    const jt = getJakartaTime();
    const yy = String(jt.getFullYear()).slice(-2);
    const mm = String(jt.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`;
    
    const result = await db.execute({
      sql: `SELECT nomor_induk FROM users WHERE nomor_induk LIKE ? ORDER BY nomor_induk DESC LIMIT 1`,
      args: [`${prefix}%`]
    });

    let nextSequence = 1;
    if (result.rows.length > 0) {
      const lastInduk = result.rows[0].nomor_induk;
      const sequencePart = lastInduk.slice(prefix.length);
      const parsedSeq = parseInt(sequencePart, 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }

    const nextInduk = `${prefix}${String(nextSequence).padStart(3, '0')}`;
    res.json({ nomor_induk: nextInduk });
  } catch (error) {
    res.status(500).json({ error: 'Gagal generate nomor induk' });
  }
});

router.post('/enroll', authLimiter, async (req, res) => {
  try {
    const { nomor_induk, nama, role, departemen, email, descriptor } = enrollSchema.parse(req.body);

    const checkResult = await db.execute({
      sql: 'SELECT nomor_induk FROM users WHERE nomor_induk = ?',
      args: [nomor_induk]
    });
    if (checkResult.rows.length > 0) return res.status(400).json({ error: 'Nomor Induk sudah terdaftar.' });

    // Cek Duplikasi Wajah
    const allUsers = await db.execute("SELECT id, role, face_descriptor FROM users WHERE role != 'admin'");
    for (const u of allUsers.rows) {
      const storedDesc = JSON.parse(u.face_descriptor);
      const distance = euclideanDistance(descriptor, storedDesc);
      if (distance < 0.5) {
        if ((role === 'dosen' && u.role === 'staff') || (role === 'staff' && u.role === 'dosen')) {
          // Boleh merangkap
        } else {
          return res.status(400).json({ error: `Wajah ini sudah terdaftar sebagai ${u.role}. Dilarang mendaftar ganda.` });
        }
      }
    }

    const hashedPass = await bcrypt.hash(nomor_induk, 10);
    const descriptorStr = JSON.stringify(descriptor);

    await db.execute({
      sql: 'INSERT INTO users (nomor_induk, nama, role, departemen, email, password, face_descriptor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [nomor_induk, nama, role, departemen || '', email, hashedPass, descriptorStr]
    });
    res.status(201).json({ message: 'Registrasi wajah berhasil!' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Terjadi kesalahan saat registrasi.' });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi' });

  try {
    const userRes = await db.execute({
      sql: 'SELECT id, nama FROM users WHERE email = ?',
      args: [email]
    });
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Email tidak ditemukan di sistem' });
    }

    const user = userRes.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60000).toISOString().replace('T', ' ').substring(0, 19); // 15 mins

    await db.execute({
      sql: 'UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
      args: [otp, otpExpires, user.id]
    });

    const mailOptions = {
      from: `"Nongol Dulu" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Kode OTP Reset Password - Nongol Dulu',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Halo, ${user.nama}</h2>
          <p>Anda telah meminta untuk melakukan reset password akun Nongol Dulu.</p>
          <p>Berikut adalah kode OTP untuk mengatur ulang password Anda:</p>
          <h1 style="letter-spacing: 5px; color: #0336ff;">${otp}</h1>
          <p>Kode ini akan kedaluwarsa dalam 15 menit.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Kode OTP reset password telah dikirim ke email Anda.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Gagal mengirim email reset password.' });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { email, otp, new_password } = req.body;
  if (!email || !otp || !new_password) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const userRes = await db.execute({
      sql: 'SELECT id, otp_code, otp_expires FROM users WHERE email = ?',
      args: [email]
    });

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Email tidak terdaftar' });
    }

    const user = userRes.rows[0];

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ error: 'Kode OTP salah' });
    }

    if (new Date() > new Date(user.otp_expires + 'Z')) {
      return res.status(400).json({ error: 'Kode OTP telah kedaluwarsa' });
    }

    const hashedPass = await bcrypt.hash(new_password, 10);

    await db.execute({
      sql: 'UPDATE users SET password = ?, otp_code = NULL, otp_expires = NULL WHERE id = ?',
      args: [hashedPass, user.id]
    });

    res.json({ message: 'Password berhasil diubah. Silakan login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Gagal mengubah password.' });
  }
});

// Update Profile (Nama & Email) for existing users
router.put('/user/profile', authenticateToken, async (req, res) => {
  const { nama, email } = req.body;
  if (!email || !nama) return res.status(400).json({ error: 'Nama dan Email wajib diisi' });

  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Format email tidak valid' });

  try {
    const checkRes = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
      args: [email, req.user.id]
    });

    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Email ini sudah digunakan oleh akun lain' });
    }

    await db.execute({
      sql: 'UPDATE users SET nama = ?, email = ? WHERE id = ?',
      args: [nama, email, req.user.id]
    });

    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

// Request OTP for Change Password
router.post('/user/request-otp', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.execute({ sql: 'SELECT email, nama FROM users WHERE id = ?', args: [req.user.id] });
    const user = userRes.rows[0];
    if (!user.email) return res.status(400).json({ error: 'Email belum diatur. Update profil terlebih dahulu.' });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000).toISOString().replace('T', ' ').substring(0, 19); // 10 mins

    await db.execute({
      sql: 'UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
      args: [otp, otpExpires, req.user.id]
    });

    const mailOptions = {
      from: `"Nongol Dulu" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Kode OTP Ganti Password - Nongol Dulu',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Halo, ${user.nama}</h2>
          <p>Anda telah meminta untuk mengganti password. Berikut adalah kode OTP Anda:</p>
          <h1 style="letter-spacing: 5px; color: #0336ff;">${otp}</h1>
          <p>Kode ini hanya berlaku selama 10 menit. Jangan berikan kode ini kepada siapa pun.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP berhasil dikirim ke email.' });
  } catch (error) {
    console.error('OTP error:', error);
    res.status(500).json({ error: 'Gagal mengirim OTP' });
  }
});

// Verify OTP & Change Password
router.put('/user/change-password', authenticateToken, async (req, res) => {
  const { otp, new_password } = req.body;
  if (!otp || !new_password) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const userRes = await db.execute({ sql: 'SELECT otp_code, otp_expires FROM users WHERE id = ?', args: [req.user.id] });
    const user = userRes.rows[0];

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ error: 'Kode OTP salah' });
    }
    if (new Date() > new Date(user.otp_expires + 'Z')) {
      return res.status(400).json({ error: 'Kode OTP telah kedaluwarsa' });
    }

    const hashedPass = await bcrypt.hash(new_password, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ?, otp_code = NULL, otp_expires = NULL WHERE id = ?',
      args: [hashedPass, req.user.id]
    });

    res.json({ message: 'Password berhasil diubah.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengganti password' });
  }
});

router.post('/attend', kioskLimiter, async (req, res) => {
  const { descriptor, latitude, longitude } = req.body;
  if (!descriptor) return res.status(400).json({ error: 'Descriptor tidak ditemukan.' });

  try {
    const usersResult = await db.execute("SELECT id, nomor_induk, nama, role, departemen, face_descriptor FROM users WHERE role != 'admin'");
    const users = usersResult.rows;

    let bestMatch = null;
    let minDistance = Infinity;

    for (const user of users) {
      const storedDescriptor = JSON.parse(user.face_descriptor);
      const distance = euclideanDistance(descriptor, storedDescriptor);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    }

    if (minDistance < 0.5 && bestMatch) {
      const currentDay = getJakartaDayString();
      const timeStr = getJakartaTimeString();

      // Calculate tolerance time (30 mins ahead) for early check-ins
      const jt = getJakartaTime();
      jt.setMinutes(jt.getMinutes() + 30);
      const tolHours = String(jt.getHours()).padStart(2, '0');
      const tolMinutes = String(jt.getMinutes()).padStart(2, '0');
      const tolTimeStr = `${tolHours}:${tolMinutes}`;

      let validSchedule = null;

      if (bestMatch.role === 'mahasiswa') {
        const scheds = await db.execute({
          sql: `SELECT s.id, s.jam_mulai, s.jam_selesai FROM schedules s
                JOIN class_enrollments ce ON s.class_id = ce.class_id
                WHERE ce.mahasiswa_id = ? AND s.hari = ? AND s.jam_mulai <= ? AND s.jam_selesai >= ?`,
          args: [bestMatch.id, currentDay, tolTimeStr, timeStr]
        });
        if (scheds.rows.length > 0) validSchedule = scheds.rows[0];
      } else if (bestMatch.role === 'dosen' || bestMatch.role === 'staff') {
        const scheds = await db.execute({
          sql: `SELECT id FROM schedules WHERE dosen_id = ? AND hari = ? AND jam_mulai <= ? AND jam_selesai >= ?`,
          args: [bestMatch.id, currentDay, tolTimeStr, timeStr]
        });
        if (scheds.rows.length > 0) validSchedule = scheds.rows[0];
      }

      const scheduleId = validSchedule ? validSchedule.id : null;
      if (!scheduleId) {
        return res.status(400).json({ message: 'Anda tidak memiliki jadwal saat ini.', match: true, user: bestMatch });
      }

      // Bypass session requirement for Staff and Dosen (since they don't open sessions for themselves)
      if (bestMatch.role === 'staff' || bestMatch.role === 'dosen') {
        const todayQuery = await db.execute({
          sql: `SELECT id FROM attendances WHERE user_id = ? AND schedule_id = ? AND date(created_at, '+7 hours') = ?`,
          args: [bestMatch.id, scheduleId, getJakartaDateString()]
        });

        if (todayQuery.rows.length > 0) {
          return res.status(400).json({ message: 'Anda sudah melakukan absensi untuk sesi ini.', match: true, user: bestMatch });
        }

        await db.execute({
          sql: 'INSERT INTO attendances (user_id, schedule_id, status, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
          args: [bestMatch.id, scheduleId, 'Hadir', latitude || null, longitude || null]
        });

        return res.json({ message: 'Presensi berhasil', match: true, user: { nomor_induk: bestMatch.nomor_induk, nama: bestMatch.nama, role: bestMatch.role, departemen: bestMatch.departemen }, distance: minDistance });
      }

      // Find active session for today for this schedule
      const sessionQuery = await db.execute({
        sql: `SELECT id, is_locked, lock_at FROM class_sessions WHERE schedule_id = ? AND date(tanggal) = ?`,
        args: [scheduleId, getJakartaDateString()]
      });

      if (sessionQuery.rows.length === 0) {
        return res.status(400).json({ message: 'Absensi belum dibuka oleh dosen untuk pertemuan hari ini.', match: true, user: bestMatch });
      }

      const activeSession = sessionQuery.rows[0];
      if (activeSession.is_locked) {
        return res.status(400).json({ message: 'Absensi kelas telah ditutup oleh Dosen.', match: true, user: bestMatch });
      }
      if (activeSession.lock_at && new Date() > new Date(activeSession.lock_at + 'Z')) {
        return res.status(400).json({ message: 'Batas toleransi waktu absensi telah habis.', match: true, user: bestMatch });
      }

      const sessionId = activeSession.id;

      const todayQuery = await db.execute({
        sql: `SELECT id FROM attendances WHERE user_id = ? AND session_id = ?`,
        args: [bestMatch.id, sessionId]
      });

      if (todayQuery.rows.length > 0) {
        return res.status(400).json({ message: 'Anda sudah melakukan absensi untuk sesi ini.', match: true, user: bestMatch });
      }

      await db.execute({
        sql: 'INSERT INTO attendances (user_id, schedule_id, session_id, status, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        args: [bestMatch.id, scheduleId, sessionId, 'Hadir', latitude || null, longitude || null]
      });

      res.json({ message: 'Presensi berhasil', match: true, user: { nomor_induk: bestMatch.nomor_induk, nama: bestMatch.nama, role: bestMatch.role, departemen: bestMatch.departemen }, distance: minDistance });
    } else {
      res.status(401).json({ message: 'Wajah tidak dikenali.', match: false });
    }
  } catch (error) {
    console.error('ERROR in /attend:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat absensi.' });
  }
});

router.get('/my-schedules', authenticateToken, async (req, res) => {
  const { id, role } = req.user;
  try {
    let sql = '';
    let args = [id];
    if (role === 'mahasiswa') {
      sql = `SELECT s.*, c.nama_mata_kuliah FROM schedules s JOIN classes c ON s.class_id = c.id JOIN class_enrollments ce ON c.id = ce.class_id WHERE ce.mahasiswa_id = ? ORDER BY s.hari, s.jam_mulai`;
    } else {
      sql = `SELECT s.*, c.nama_mata_kuliah FROM schedules s LEFT JOIN classes c ON s.class_id = c.id WHERE s.dosen_id = ? ORDER BY s.hari, s.jam_mulai`;
    }
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil jadwal.' }); }
});

router.get('/my-attendances', authenticateToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT a.status, a.notes, a.created_at, c.nama_mata_kuliah, cs.materi_bap, cs.pertemuan_ke 
            FROM attendances a 
            LEFT JOIN schedules s ON a.schedule_id = s.id 
            LEFT JOIN classes c ON s.class_id = c.id 
            LEFT JOIN class_sessions cs ON a.session_id = cs.id
            WHERE a.user_id = ? ORDER BY a.created_at DESC`,
      args: [req.user.id]
    });
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

router.put('/attendances/:id', authenticateToken, async (req, res) => {
  if (req.user.role === 'mahasiswa') return res.sendStatus(403);
  const { status, notes } = req.body;
  try {
    let sql = 'UPDATE attendances SET status = ?';
    let args = [status];
    if (notes !== undefined) {
      sql += ', notes = ?';
      args.push(notes);
    }
    sql += ' WHERE id = ?';
    args.push(req.params.id);

    await db.execute({ sql, args });
    res.json({ message: 'Status berhasil diubah' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

// Admin: Departments CRUD
router.get('/departments', async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM departments ORDER BY nama_departemen');
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});
router.post('/departments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'INSERT INTO departments (nama_departemen) VALUES (?)', args: [req.body.nama_departemen] });
    res.json({ message: 'Sukses' });
  } catch (error) { res.status(500).json({ error: 'Gagal / Duplikat' }); }
});
router.delete('/departments/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'DELETE FROM departments WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Sukses' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

// Admin: Classes CRUD
router.get('/classes', async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM classes ORDER BY nama_mata_kuliah');
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});
router.post('/classes', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'INSERT INTO classes (nama_mata_kuliah) VALUES (?)', args: [req.body.nama_mata_kuliah] });
    res.json({ message: 'Sukses' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});
router.delete('/classes/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'DELETE FROM classes WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Sukses' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

// Admin: Schedules CRUD
router.get('/schedules', authenticateToken, async (req, res) => {
  try {
    const r = await db.execute(`SELECT s.*, c.nama_mata_kuliah, u.nama as nama_dosen FROM schedules s LEFT JOIN classes c ON s.class_id = c.id LEFT JOIN users u ON s.dosen_id = u.id ORDER BY s.hari, s.jam_mulai`);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});
router.post('/schedules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { class_id, dosen_id, hari, jam_mulai, jam_selesai } = req.body;
  try {
    if (dosen_id) {
      const overlap = await db.execute({
        sql: 'SELECT id FROM schedules WHERE dosen_id = ? AND hari = ? AND jam_mulai < ? AND jam_selesai > ?',
        args: [dosen_id, hari, jam_selesai, jam_mulai]
      });
      if (overlap.rows.length > 0) return res.status(400).json({ error: 'Jadwal bentrok dengan jadwal lain untuk pengajar ini.' });
    }
    await db.execute({ sql: 'INSERT INTO schedules (class_id, dosen_id, hari, jam_mulai, jam_selesai) VALUES (?, ?, ?, ?, ?)', args: [class_id || null, dosen_id || null, hari, jam_mulai, jam_selesai] });
    res.json({ message: 'Sukses' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});
router.delete('/schedules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'DELETE FROM schedules WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Sukses' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

// Admin: Users list (fixed quotes)
router.get('/users', async (req, res) => {
  const { role } = req.query;
  try {
    let sql = "SELECT id, nomor_induk, nama, role, departemen, created_at FROM users WHERE role != 'admin'";
    let args = [];
    if (role) { sql += ' AND role = ?'; args = [role]; }
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil data pengguna.' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Terhapus' });
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

router.get('/stats', async (req, res) => {
  try {
    const userStats = await db.execute("SELECT role, COUNT(*) as count FROM users WHERE role != 'admin' GROUP BY role");
    
    const todayAbsents = await db.execute({
      sql: "SELECT COUNT(*) as count FROM attendances WHERE date(created_at, '+7 hours') = ?",
      args: [getJakartaDateString()]
    });

    // Monthly stats for the current year
    const monthlyData = await db.execute("SELECT strftime('%m', datetime(created_at, '+7 hours')) as month, COUNT(*) as count FROM attendances WHERE strftime('%Y', datetime(created_at, '+7 hours')) = strftime('%Y', datetime('now', '+7 hours')) GROUP BY month");
    const monthly = monthlyData.rows.map(row => ({ month: row.month, count: Number(row.count) }));

    const lateCount = await db.execute({
      sql: "SELECT COUNT(*) as count FROM attendances WHERE date(created_at, '+7 hours') = ? AND status = 'Terlambat'",
      args: [getJakartaDateString()]
    });
    const alphaCount = await db.execute({
      sql: "SELECT COUNT(*) as count FROM attendances WHERE date(created_at, '+7 hours') = ? AND status = 'Alfa'",
      args: [getJakartaDateString()]
    });

    const topAbsentees = await db.execute(`
      SELECT u.nama, u.role, COUNT(*) as count 
      FROM attendances a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.status = 'Alfa' AND strftime('%m', a.created_at) = strftime('%m', 'now') 
      GROUP BY a.user_id 
      ORDER BY count DESC 
      LIMIT 5
    `);

    const schedules = await db.execute(`
      SELECT s.id, c.nama_mata_kuliah, u.nama as dosen, s.hari, s.jam_mulai, s.jam_selesai 
      FROM schedules s 
      LEFT JOIN classes c ON s.class_id = c.id 
      LEFT JOIN users u ON s.dosen_id = u.id
    `);

    const stats = {
      mahasiswa: 0, dosen: 0, staff: 0,
      today: Number(todayAbsents.rows[0].count),
      late: Number(lateCount.rows[0].count),
      alpha: Number(alphaCount.rows[0].count),
      monthly,
      topAbsentees: topAbsentees.rows.map(row => ({ nama: row.nama, role: row.role, count: Number(row.count) })),
      schedules: schedules.rows
    };

    userStats.rows.forEach(row => {
      if (row.role === 'mahasiswa') stats.mahasiswa = Number(row.count);
      if (row.role === 'dosen') stats.dosen = Number(row.count);
      if (row.role === 'staff') stats.staff = Number(row.count);
    });
    res.json(stats);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

router.get('/attendances/live', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT a.id, u.nama, u.role, a.status, a.created_at, a.notes 
      FROM attendances a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

router.get('/attendances', async (req, res) => {
  try {
    const result = await db.execute(`SELECT a.id, u.nomor_induk, u.nama, u.role, u.departemen, a.status, a.notes, a.created_at, c.nama_mata_kuliah FROM attendances a JOIN users u ON a.user_id = u.id LEFT JOIN schedules s ON a.schedule_id = s.id LEFT JOIN classes c ON s.class_id = c.id ORDER BY a.created_at DESC LIMIT 100`);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

router.get('/attendances/export', async (req, res) => {
  try {
    const result = await db.execute(`SELECT u.nama, u.nomor_induk, u.role, a.status, a.created_at, a.notes 
      FROM attendances a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC`);

    let csv = 'Nama Lengkap,Nomor Induk,Peran,Waktu Absen,Status,Keterangan\n';
    result.rows.forEach(row => {
      const date = new Date(row.created_at).toLocaleString('id-ID');
      const safeNotes = row.notes ? row.notes.replace(/,/g, ' ') : '';
      csv += `${row.nama},${row.nomor_induk},${row.role},${date},${row.status || 'Hadir'},${safeNotes}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('Laporan_Absensi.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).send('Gagal membuat laporan');
  }
});
// --- NEW PUT AND ENROLLMENT ROUTES FOR V3.2 ---

// Admin: Edit Department
router.put('/departments/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'UPDATE departments SET nama_departemen = ? WHERE id = ?', args: [req.body.nama_departemen, req.params.id] });
    res.json({ message: 'Departemen diperbarui' });
  } catch (error) { res.status(500).json({ error: 'Gagal update' }); }
});

// Admin: Edit Class
router.put('/classes/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'UPDATE classes SET nama_mata_kuliah = ? WHERE id = ?', args: [req.body.nama_mata_kuliah, req.params.id] });
    res.json({ message: 'Kelas diperbarui' });
  } catch (error) { res.status(500).json({ error: 'Gagal update' }); }
});

// Admin: Edit Schedule
router.put('/schedules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { class_id, dosen_id, hari, jam_mulai, jam_selesai } = req.body;
  try {
    if (dosen_id) {
      const overlap = await db.execute({
        sql: 'SELECT id FROM schedules WHERE dosen_id = ? AND hari = ? AND jam_mulai < ? AND jam_selesai > ? AND id != ?',
        args: [dosen_id, hari, jam_selesai, jam_mulai, req.params.id]
      });
      if (overlap.rows.length > 0) return res.status(400).json({ error: 'Jadwal bentrok dengan jadwal lain untuk pengajar ini.' });
    }
    await db.execute({
      sql: 'UPDATE schedules SET class_id = ?, dosen_id = ?, hari = ?, jam_mulai = ?, jam_selesai = ? WHERE id = ?',
      args: [class_id || null, dosen_id || null, hari, jam_mulai, jam_selesai, req.params.id]
    });
    res.json({ message: 'Jadwal diperbarui' });
  } catch (error) { res.status(500).json({ error: 'Gagal update' }); }
});

// Admin: Edit User
router.put('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { nomor_induk, nama, role, departemen, email } = req.body;
  try {
    if (email) {
      const checkRes = await db.execute({ sql: 'SELECT id FROM users WHERE email = ? AND id != ?', args: [email, req.params.id] });
      if (checkRes.rows.length > 0) return res.status(400).json({ error: 'Email sudah digunakan' });
    }
    await db.execute({
      sql: 'UPDATE users SET nomor_induk = ?, nama = ?, role = ?, departemen = ?, email = ? WHERE id = ?',
      args: [nomor_induk, nama, role, departemen, email || null, req.params.id]
    });
    res.json({ message: 'Pengguna diperbarui' });
  } catch (error) { res.status(500).json({ error: 'Gagal update' }); }
});

// Admin: Reset Password to Default
router.put('/users/:id/reset-password', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const userRes = await db.execute({ sql: 'SELECT nomor_induk FROM users WHERE id = ?', args: [req.params.id] });
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });

    const nomor_induk = userRes.rows[0].nomor_induk;
    const hashedPass = await bcrypt.hash(nomor_induk, 10);

    await db.execute({ sql: 'UPDATE users SET password = ? WHERE id = ?', args: [hashedPass, req.params.id] });
    res.json({ message: 'Password direset ke nomor induk.' });
  } catch (error) { res.status(500).json({ error: 'Gagal reset password' }); }
});

// Admin: Class Enrollments Management
router.get('/classes/:id/students', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const result = await db.execute({
      sql: `SELECT u.id, u.nomor_induk, u.nama, u.departemen 
            FROM class_enrollments ce
            JOIN users u ON ce.mahasiswa_id = u.id
            WHERE ce.class_id = ?`,
      args: [req.params.id]
    });
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil data' }); }
});

router.post('/class-enrollments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { class_id, mahasiswa_id } = req.body;
  try {
    await db.execute({ sql: 'INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', args: [class_id, mahasiswa_id] });
    res.json({ message: 'Mahasiswa berhasil ditambahkan ke kelas' });
  } catch (error) { res.status(500).json({ error: 'Gagal menambah (Mungkin sudah terdaftar)' }); }
});

router.delete('/class-enrollments/:class_id/:mahasiswa_id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    await db.execute({ sql: 'DELETE FROM class_enrollments WHERE class_id = ? AND mahasiswa_id = ?', args: [req.params.class_id, req.params.mahasiswa_id] });
    res.json({ message: 'Dihapus dari kelas' });
  } catch (error) { res.status(500).json({ error: 'Gagal menghapus' }); }
});

// --- V3.3 ROSTER AND CRON ROUTES ---

// Lecturer: Get Class Roster for a specific session
router.get('/schedules/:id/roster', authenticateToken, async (req, res) => {
  try {
    const schedId = req.params.id;
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    // Ambil data jadwal untuk mengetahui class_id
    const schedRes = await db.execute({ sql: 'SELECT class_id FROM schedules WHERE id = ?', args: [schedId] });
    if (schedRes.rows.length === 0) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });

    const classId = schedRes.rows[0].class_id;
    if (!classId) return res.json([]);

    // Get the roster for this session
    const result = await db.execute({
      sql: `SELECT u.id as user_id, u.nomor_induk, u.nama, a.id as attendance_id, a.status, a.notes, a.created_at
            FROM class_enrollments ce
            JOIN users u ON ce.mahasiswa_id = u.id
            LEFT JOIN attendances a ON a.user_id = u.id AND a.session_id = ?
            WHERE ce.class_id = ?
            ORDER BY u.nama`,
      args: [session_id, classId]
    });

    // Calculate overall percentage for each student (cumulative)
    const totalSessionsRes = await db.execute({
      sql: `SELECT COUNT(*) as total FROM class_sessions WHERE schedule_id = ? AND date(tanggal) <= ?`,
      args: [schedId, getJakartaDateString()]
    });
    const totalSessions = parseInt(totalSessionsRes.rows[0].total) || 1;

    const attendanceStats = await db.execute({
      sql: `SELECT user_id, COUNT(*) as present_count 
            FROM attendances 
            WHERE schedule_id = ? AND status = 'Hadir' 
            GROUP BY user_id`,
      args: [schedId]
    });

    const statsMap = {};
    attendanceStats.rows.forEach(r => {
      statsMap[r.user_id] = r.present_count;
    });

    const enrichedRoster = result.rows.map(row => {
      const presentCount = statsMap[row.user_id] || 0;
      const percentage = Math.round((presentCount / totalSessions) * 100);
      return { ...row, percentage };
    });

    res.json(enrichedRoster);
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil roster' }); }
});

// Admin/System: Cron mark Alfa
router.post('/cron/mark-alfa', async (req, res) => {
  try {
    const currentDay = getJakartaDayString();
    const timeStr = getJakartaTimeString();

    // Cari jadwal hari ini yang JAM SELESAINYA sudah lewat
    const pastSchedules = await db.execute({
      sql: `SELECT id, class_id, dosen_id FROM schedules WHERE hari = ? AND jam_selesai < ?`,
      args: [currentDay, timeStr]
    });

    let alfaCount = 0;

    for (const sched of pastSchedules.rows) {
      if (sched.class_id) {
        // Jadwal Kuliah (Mahasiswa)
        const sessionQuery = await db.execute({
          sql: `SELECT id FROM class_sessions WHERE schedule_id = ? AND date(tanggal) = ?`,
          args: [sched.id, getJakartaDateString()]
        });

        if (sessionQuery.rows.length > 0) {
          const sessionId = sessionQuery.rows[0].id;
          const students = await db.execute({
            sql: `SELECT mahasiswa_id FROM class_enrollments WHERE class_id = ?`,
            args: [sched.class_id]
          });

          for (const student of students.rows) {
            // Cek apakah mahasiswa ini sudah absen di jadwal ini hari ini
            const check = await db.execute({
              sql: `SELECT id FROM attendances WHERE user_id = ? AND session_id = ?`,
              args: [student.mahasiswa_id, sessionId]
            });

            if (check.rows.length === 0) {
              // Beri Alfa
              await db.execute({
                sql: 'INSERT INTO attendances (user_id, schedule_id, session_id, status) VALUES (?, ?, ?, ?)',
                args: [student.mahasiswa_id, sched.id, sessionId, 'Alfa']
              });
              alfaCount++;
            }
          }
        }
      } else if (sched.dosen_id) {
        // Jadwal Shift Staff / Dosen Pribadi
        const check = await db.execute({
          sql: `SELECT id FROM attendances WHERE user_id = ? AND schedule_id = ? AND date(created_at, '+7 hours') = ?`,
          args: [sched.dosen_id, sched.id, getJakartaDateString()]
        });

        if (check.rows.length === 0) {
          await db.execute({
            sql: 'INSERT INTO attendances (user_id, schedule_id, status) VALUES (?, ?, ?)',
            args: [sched.dosen_id, sched.id, 'Alfa']
          });
          alfaCount++;
        }
      }
    }

    res.json({ message: `Cron dieksekusi. ${alfaCount} status Alfa ditambahkan.` });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menjalankan cron.' });
  }
});

// Lecturer: Manual update/insert attendance
router.post('/attendances/manual', authenticateToken, async (req, res) => {
  if (req.user.role !== 'dosen' && req.user.role !== 'admin') return res.sendStatus(403);
  const { user_id, schedule_id, session_id, status, notes } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const exist = await db.execute({
      sql: 'SELECT id FROM attendances WHERE user_id = ? AND session_id = ?',
      args: [user_id, session_id]
    });
    if (exist.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE attendances SET status = ?, notes = ? WHERE id = ?',
        args: [status, notes || null, exist.rows[0].id]
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO attendances (user_id, schedule_id, session_id, status, notes) VALUES (?, ?, ?, ?, ?)',
        args: [user_id, schedule_id, session_id, status, notes || null]
      });
    }
    res.json({ message: 'Status berhasil diubah' });
  } catch (error) { res.status(500).json({ error: 'Gagal merubah status' }); }
});

// --- NEW SESSIONS ROUTES FOR V4.5 ---

// Get all sessions for a schedule
router.get('/schedules/:id/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM class_sessions WHERE schedule_id = ? ORDER BY pertemuan_ke ASC',
      args: [req.params.id]
    });
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Gagal' }); }
});

// Create a new session
router.post('/schedules/:id/sessions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'dosen' && req.user.role !== 'admin') return res.sendStatus(403);
  const { pertemuan_ke, tanggal, auto_lock_minutes } = req.body;
  try {
    // Generate PIN
    const pin_code = Math.floor(100000 + Math.random() * 900000).toString();

    let lock_at = null;
    if (auto_lock_minutes) {
      // Calculate lock_at by adding minutes to current UTC time.
      // E.g. '2023-10-10 08:15:00'
      const lockDate = new Date(Date.now() + parseInt(auto_lock_minutes) * 60000);
      lock_at = lockDate.toISOString().replace('T', ' ').substring(0, 19);
    }

    const result = await db.execute({
      sql: 'INSERT INTO class_sessions (schedule_id, pertemuan_ke, tanggal, pin_code, lock_at) VALUES (?, ?, ?, ?, ?)',
      args: [req.params.id, pertemuan_ke, tanggal, pin_code, lock_at]
    });
    res.json({ message: 'Sesi dibuat', pin_code, lock_at });
  } catch (error) { res.status(500).json({ error: 'Gagal / Sesi sudah ada' }); }
});

// Update session (BAP, lock/unlock, PIN)
router.put('/sessions/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'dosen' && req.user.role !== 'admin') return res.sendStatus(403);
  const { materi_bap, is_locked, pin_code } = req.body;
  try {
    const updates = [];
    const args = [];
    if (materi_bap !== undefined) { updates.push('materi_bap = ?'); args.push(materi_bap); }
    if (is_locked !== undefined) { updates.push('is_locked = ?'); args.push(is_locked ? 1 : 0); }
    if (pin_code !== undefined) { updates.push('pin_code = ?'); args.push(pin_code); }

    if (updates.length > 0) {
      args.push(req.params.id);
      await db.execute({
        sql: `UPDATE class_sessions SET ${updates.join(', ')} WHERE id = ?`,
        args
      });
    }
    res.json({ message: 'Sesi diperbarui' });
  } catch (error) { res.status(500).json({ error: 'Gagal update sesi' }); }
});

// Delete a session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'dosen' && req.user.role !== 'admin') return res.sendStatus(403);
  try {
    // Optionally check if the user actually owns the schedule this session belongs to
    // But since it's an internal tool, role check is mostly sufficient.
    await db.execute({
      sql: 'DELETE FROM class_sessions WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ message: 'Sesi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus sesi' });
  }
});

// PIN Code Attendance Endpoint
router.post('/attend-pin', kioskLimiter, authenticateToken, async (req, res) => {
  const { pin_code } = req.body;
  try {
    // Find session by pin_code
    const sessionQuery = await db.execute({
      sql: `SELECT * FROM class_sessions WHERE pin_code = ? AND date(tanggal) = ?`,
      args: [pin_code, getJakartaDateString()]
    });

    if (sessionQuery.rows.length === 0) return res.status(400).json({ error: 'PIN tidak valid atau sesi bukan hari ini.' });
    const session = sessionQuery.rows[0];
    if (session.is_locked) return res.status(400).json({ error: 'Sesi kelas telah dikunci.' });

    if (session.lock_at && new Date() > new Date(session.lock_at + 'Z')) {
      return res.status(400).json({ error: 'Batas toleransi waktu absensi telah habis.' });
    }

    // Check if enrolled
    const enrolQuery = await db.execute({
      sql: 'SELECT * FROM schedules s JOIN class_enrollments ce ON s.class_id = ce.class_id WHERE s.id = ? AND ce.mahasiswa_id = ?',
      args: [session.schedule_id, req.user.id]
    });
    if (enrolQuery.rows.length === 0) return res.status(400).json({ error: 'Anda tidak terdaftar di kelas ini.' });

    // Check if already attended
    const checkQuery = await db.execute({
      sql: 'SELECT id FROM attendances WHERE user_id = ? AND session_id = ?',
      args: [req.user.id, session.id]
    });
    if (checkQuery.rows.length > 0) return res.status(400).json({ error: 'Anda sudah absen untuk sesi ini.' });

    await db.execute({
      sql: 'INSERT INTO attendances (user_id, schedule_id, session_id, status) VALUES (?, ?, ?, ?)',
      args: [req.user.id, session.schedule_id, session.id, 'Hadir']
    });

    res.json({ message: 'Presensi via PIN berhasil!' });
  } catch (err) { res.status(500).json({ error: 'Gagal presensi.' }); }
});

// Get Global Recap for a Schedule (Master Sheet)
router.get('/schedules/:id/recap', authenticateToken, async (req, res) => {
  const scheduleId = req.params.id;

  try {
    // 1. Get all sessions for this schedule
    const sessions = await db.execute({
      sql: 'SELECT id, pertemuan_ke, tanggal FROM class_sessions WHERE schedule_id = ? ORDER BY pertemuan_ke ASC',
      args: [scheduleId]
    });

    // 2. Get schedule and class info
    const schedInfo = await db.execute({
      sql: 'SELECT c.nama_mata_kuliah FROM schedules s JOIN classes c ON s.class_id = c.id WHERE s.id = ?',
      args: [scheduleId]
    });
    const className = schedInfo.rows.length > 0 ? schedInfo.rows[0].nama_mata_kuliah : 'Kelas';

    // 3. Get all students enrolled
    const students = await db.execute({
      sql: `SELECT u.id as user_id, u.nomor_induk, u.nama 
            FROM class_enrollments ce 
            JOIN users u ON ce.mahasiswa_id = u.id 
            JOIN schedules s ON ce.class_id = s.class_id
            WHERE s.id = ? 
            ORDER BY u.nama`,
      args: [scheduleId]
    });

    // 4. Get all attendances for this schedule
    const attendances = await db.execute({
      sql: 'SELECT user_id, session_id, status FROM attendances WHERE schedule_id = ?',
      args: [scheduleId]
    });

    res.json({
      className,
      sessions: sessions.rows,
      students: students.rows,
      attendances: attendances.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data rekap.' });
  }
});

module.exports = router;
