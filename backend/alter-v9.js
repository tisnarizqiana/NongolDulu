require('dotenv').config();
const db = require('./db/turso');

async function alter() {
  try {
    console.log('Adding new CMS columns to app_settings table...');
    
    // SQLite doesn't support adding multiple columns in one ALTER TABLE statement easily,
    // so we'll do it one by one. If they already exist, it will throw, so we catch individual errors or just ignore them.
    
    const columns = [
      { name: 'lecturer_subtitle', type: 'TEXT', defaultVal: "'Kelola jadwal, absensi, dan jurnal dengan mudah dan cepat.'" },
      { name: 'student_subtitle', type: 'TEXT', defaultVal: "'Pantau jadwalmu dan pastikan kehadiran selalu tercatat dengan baik hari ini.'" },
      { name: 'staff_subtitle', type: 'TEXT', defaultVal: "'Pantau jadwal shift Anda dan pastikan log kehadiran harian tercatat secara akurat.'" },
      { name: 'subject_label', type: 'TEXT', defaultVal: "'Mata Kuliah'" },
      { name: 'schedule_label', type: 'TEXT', defaultVal: "'Jadwal Perkuliahan'" }
    ];

    for (const col of columns) {
      try {
        await db.execute(`ALTER TABLE app_settings ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.defaultVal}`);
        console.log(`Added column ${col.name}`);
      } catch (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`Column ${col.name} already exists. Skipping.`);
        } else {
          console.error(`Failed to add column ${col.name}:`, err.message);
        }
      }
    }

    console.log('Advanced CMS migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

alter();
