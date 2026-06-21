const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Necesario para conexiones a Supabase u otros servicios en la nube
    rejectUnauthorized: false
  }
});

module.exports = pool;
