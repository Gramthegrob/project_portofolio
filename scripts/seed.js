const readline = require('readline');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function seed() {
  try {
    console.log('Portfolio Admin User Setup');
    const usernameInput = await question('Username (default: admin): ');
    const username = usernameInput.trim() || 'admin';
    
    const passwordInput = await question('Password (min 6 chars): ');
    const password = passwordInput.trim();

    if (password.length < 6) {
      console.error('Error: Password must be at least 6 characters long.');
      rl.close();
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    
    const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    insertUser.run(username, hash);
    
    console.log(`Successfully created admin user: ${username}`);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.error('Error: Username already exists in the database.');
    } else {
      console.error('Database error:', error.message);
    }
  } finally {
    rl.close();
  }
}

seed();
