require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  try {
    console.log('Adding email to users...');
    await db.execute('ALTER TABLE users ADD COLUMN email TEXT DEFAULT NULL');
  } catch (err) {
    console.log('email column might already exist:', err.message);
  }

  try {
    console.log('Creating unique index for email...');
    await db.execute('CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL');
  } catch (err) {
    console.log('Unique index might already exist:', err.message);
  }

  try {
    console.log('Adding reset_token to users...');
    await db.execute('ALTER TABLE users ADD COLUMN reset_token TEXT DEFAULT NULL');
  } catch (err) {
    console.log('reset_token column might already exist:', err.message);
  }

  try {
    console.log('Adding reset_token_expires to users...');
    await db.execute('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL');
  } catch (err) {
    console.log('reset_token_expires column might already exist:', err.message);
  }

  console.log('V6 Migrations applied successfully!');
  process.exit(0);
}

migrate();
