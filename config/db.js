const mysql = require('mysql2/promise');
const fs = require('fs');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'household_finance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Optional TLS/SSL configuration (production)
if (process.env.DB_SSL_CA) {
  try {
    poolConfig.ssl = { ca: fs.readFileSync(process.env.DB_SSL_CA) };
  } catch (err) {
    console.warn('Unable to read DB_SSL_CA file:', err.message);
  }
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
