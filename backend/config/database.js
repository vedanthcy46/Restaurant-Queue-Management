const Database = require('better-sqlite3');
const path = require('path');

// Create DB instance (sync)
const db = new Database(path.join(__dirname, '../restaurant.db'));

console.log('Connected to SQLite (better-sqlite3)');

module.exports = db;
