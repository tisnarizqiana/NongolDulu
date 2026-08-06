const db = require('./db/turso');

async function migrate() {
  try {
    console.log('Dropping old tables if exists...');
    await db.execute('DROP TABLE IF EXISTS attendances');
    await db.execute('DROP TABLE IF EXISTS class_enrollments');
    await db.execute('DROP TABLE IF EXISTS schedules');
    await db.execute('DROP TABLE IF EXISTS classes');
    await db.execute('DROP TABLE IF EXISTS users');
    await db.execute('DROP TABLE IF EXISTS departments');
    console.log('Creating departments table...');
    await db.execute(`
      CREATE TABLE departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nama_departemen TEXT NOT NULL UNIQUE
      )
    `);

    console.log('Creating users table v3...');
    await db.execute(`
      CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nomor_induk TEXT NOT NULL UNIQUE,
          nama TEXT NOT NULL,
          role TEXT NOT NULL,
          departemen TEXT,
          password TEXT NOT NULL,
          face_descriptor TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating classes table...');
    await db.execute(`
      CREATE TABLE classes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nama_mata_kuliah TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating schedules table...');
    await db.execute(`
      CREATE TABLE schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          class_id INTEGER,
          dosen_id INTEGER,
          hari TEXT NOT NULL, -- 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
          jam_mulai TEXT NOT NULL, -- '08:00'
          jam_selesai TEXT NOT NULL, -- '10:00'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
          FOREIGN KEY (dosen_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Creating class_enrollments table...');
    await db.execute(`
      CREATE TABLE class_enrollments (
          class_id INTEGER NOT NULL,
          mahasiswa_id INTEGER NOT NULL,
          PRIMARY KEY (class_id, mahasiswa_id),
          FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
          FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Creating attendances table v3...');
    await db.execute(`
      CREATE TABLE attendances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          schedule_id INTEGER,
          status TEXT NOT NULL, -- 'Hadir', 'Sakit', 'Izin', 'Alfa'
          latitude REAL,
          longitude REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL
      )
    `);

    console.log('Migration v3 successful!');

    // Create a default admin user
    const bcrypt = require('bcrypt');
    const hashedPass = await bcrypt.hash('admin123', 10);
    // Face descriptor for admin is a dummy 128 float array
    const dummyDescriptor = JSON.stringify(Array(128).fill(0));
    await db.execute({
      sql: 'INSERT INTO users (nomor_induk, nama, role, departemen, password, face_descriptor) VALUES (?, ?, ?, ?, ?, ?)',
      args: ['admin', 'Super Admin', 'admin', 'IT', hashedPass, dummyDescriptor]
    });
    console.log('Created default admin user: admin / admin123');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
