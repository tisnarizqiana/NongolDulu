require('dotenv').config();
const db = require('./db/turso');

async function alter() {
  try {
    console.log('Creating app_settings table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_name TEXT NOT NULL,
          student_label TEXT NOT NULL,
          lecturer_label TEXT NOT NULL,
          staff_label TEXT NOT NULL,
          department_label TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cek apakah sudah ada data
    const result = await db.execute('SELECT COUNT(*) as count FROM app_settings');
    if (result.rows[0].count === 0) {
      console.log('Inserting default settings...');
      await db.execute(`
        INSERT INTO app_settings (app_name, student_label, lecturer_label, staff_label, department_label) 
        VALUES ('Nongol Dulu', 'Mahasiswa', 'Dosen', 'Staff Admin', 'Departemen')
      `);
    }

    console.log('Settings table migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

alter();
