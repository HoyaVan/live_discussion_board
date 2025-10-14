const express = require("express");
const dotenv = require("dotenv");
const sessionMiddleware = require("./auth/session_check.js");
require("./database/connect_mongo.js");
const { pool, setupDatabase } = require("./database/connect_mysql.js");

global.base_dir = __dirname;
global.abs_path = function(path) {
    return base_dir + path;
}
global.include = function(file) {
    return require(abs_path('/' + file));
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database (only runs once)
setupDatabase();

// Add this temporary check function
const checkTables = async () => {
  try {
    console.log('\n=== CHECKING TABLES ===');
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables found:', tables.length);
    
    if (tables.length === 0) {
      console.log('No tables found. Database setup may have failed.');
    } else {
      tables.forEach(table => {
        console.log('-', Object.values(table)[0]);
      });
    }
    console.log('=== END CHECK ===\n');
  } catch (error) {
    console.error('Error checking tables:', error);
  }
};

// Check tables after 3 seconds
setTimeout(checkTables, 3000);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.set('view engine', 'ejs');
app.use(express.static('public'));

const router = include('routes/router');
app.use('/', router);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});