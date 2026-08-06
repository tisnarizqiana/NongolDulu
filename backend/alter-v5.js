require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  try {
    console.log('Adding notes to attendances...');
    await db.execute('ALTER TABLE attendances ADD COLUMN notes TEXT DEFAULT NULL');
  } catch (err) {
    console.log('notes column might already exist:', err.message);
  }

  try {
    console.log('Adding lock_at to class_sessions...');
    await db.execute('ALTER TABLE class_sessions ADD COLUMN lock_at DATETIME DEFAULT NULL');
  } catch (err) {
    console.log('lock_at column might already exist:', err.message);
  }

  console.log('V5 Migrations applied successfully!');
  process.exit(0);
}

migrate();
