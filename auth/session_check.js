const session = require("express-session");
const MongoStore = require("connect-mongo");
const dotenv = require("dotenv");
const { getMongoClient } = require("../database/connect_mongo.js");

dotenv.config();

const {
  SESSION_SECRET,
  SESSION_STORE_SECRET,
} = process.env;

const oneDayMs = 1000 * 60 * 60 * 24;

const sessionMiddleware = session({
  name: "sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    client: getMongoClient(),
    collectionName: "sessions",
    ttl: 60 * 60 * 24,
    touchAfter: 60 * 60 * 12,
    crypto: SESSION_STORE_SECRET ? { secret: SESSION_STORE_SECRET } : undefined,
  }),
  cookie: {
    maxAge: oneDayMs,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
});

module.exports = sessionMiddleware;
