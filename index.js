const express = require("express");
const dotenv = require("dotenv");
const sessionMiddleware = require("./Auth/session_check.js");
require("./database/connect_mongo.js"); // ensures MongoDB connects first

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
