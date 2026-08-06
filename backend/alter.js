const db = require('./db/turso');

async function migrateV45() {
  try {
    console.log('Creating class_sessions table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS class_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          schedule_id INTEGER NOT NULL,
          pertemuan_ke INTEGER NOT NULL,
          tanggal DATE NOT NULL,
          materi_bap TEXT,
          is_locked BOOLEAN DEFAULT 0,
          pin_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
          UNIQUE(schedule_id, pertemuan_ke)
      )
    `);

    console.log('Adding session_id to attendances...');
    try {
      await db.execute(`ALTER TABLE attendances ADD COLUMN session_id INTEGER REFERENCES class_sessions(id) ON DELETE SET NULL`);
    } catch (e) {
      console.log('Column session_id might already exist or error:', e.message);
    }

    console.log('Migration V4.5 successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateV45();
