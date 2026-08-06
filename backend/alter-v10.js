require('dotenv').config();
const db = require('./db/turso');

async function alter() {
  try {
    console.log('Adding header CMS columns to app_settings table...');
    
    const columns = [
      { name: 'student_header', type: 'TEXT', defaultVal: "'SIAKAD Mahasiswa'" },
      { name: 'lecturer_header', type: 'TEXT', defaultVal: "'SIAKAD Dosen V5'" },
      { name: 'staff_header', type: 'TEXT', defaultVal: "'SIAKAD Staff'" }
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

    console.log('Header CMS migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

alter();
