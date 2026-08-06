const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('Menambahkan kolom otp_code dan otp_expires ke tabel users...');
  try {
    await db.execute('ALTER TABLE users ADD COLUMN otp_code VARCHAR(10)');
    await db.execute('ALTER TABLE users ADD COLUMN otp_expires DATETIME');
    console.log('Migrasi V7 berhasil!');
  } catch (error) {
    console.error('Error (mungkin kolom sudah ada):', error.message);
  }
}

migrate();
