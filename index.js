const dotenv = require("dotenv");
const express = require("express");
const path = require("path");

dotenv.config();

const sessionMiddleware = require("./auth/session_check.js");
require("./database/connect_mongo.js");
const { pool, setupDatabase } = require("./database/connect_mysql.js");

global.base_dir = __dirname;
global.abs_path = function (p) { return base_dir + p; }
global.include = function (file) { return require(abs_path('/' + file)); }

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware); // must be before router

// Views / static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));           // ensure EJS path
app.use(express.static(path.join(__dirname, 'public')));

// Router
const router = include('routes/router');
app.use('/', router);

// Optional: table check
const checkTables = async () => {
  try {
    console.log('\n=== CHECKING TABLES ===');
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables found:', tables.length);
    tables.forEach(t => console.log('-', Object.values(t)[0]));
    console.log('=== END CHECK ===\n');
  } catch (error) {
    console.error('Error checking tables:', error);
  }
};

// Start after DB setup
(async () => {
  await setupDatabase();
  setTimeout(checkTables, 3000);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
