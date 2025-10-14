const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT
} = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
  throw new Error("MySQL environment variables are not set. Please check MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.");
}

// Create connection pool with SSL for Aiven
const pool = mysql.createPool({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  port: MYSQL_PORT,
  ssl: {
    rejectUnauthorized: false,
    secureProtocol: 'TLSv1_2_method',
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Check if database is initialized
const isDatabaseInitialized = async () => {
  try {
    const [tables] = await pool.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY table_name
    `, [MYSQL_DATABASE]);
    
    return tables.length >= 5; // We expect 5 tables
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
};

// Database setup function - only runs if not already initialized
const setupDatabase = async () => {
  try {
    // Check if database is already initialized (unless forced)
    const forceInit = process.env.FORCE_DB_INIT === 'true';
    const initialized = forceInit ? false : await isDatabaseInitialized();
    
    if (initialized) {
      console.log('Database already initialized, skipping setup.');
      return;
    }

    console.log('Initializing database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'queries', 'create_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Parse SQL statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
      .map(stmt => stmt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(stmt => stmt.length > 0);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await pool.execute(statement);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error.message);
          throw error; // Stop execution if any statement fails
        }
      }
    }

    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error setting up database tables:', error);
  }
};

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('MySQL connected successfully to Aiven');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err);
  });

// Graceful shutdown
const shutdown = async (signal) => {
  try {
    console.log(`\n${signal} received. Closing MySQL connection pool...`);
    await pool.end();
    console.log('MySQL connection pool closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during MySQL disconnect:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = {pool, setupDatabase};