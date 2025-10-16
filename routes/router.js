// router.js
const router = require("express").Router();
const bcrypt = require("bcrypt");
const Joi = require("joi");

const db_users = include('database/users');
require("dotenv").config();

const expireTime = 1 * 60 * 60 * 1000;
const saltRounds = 12;

// auth guard
const authRequired = (req, res, next) => {
  if (req.session?.user) return next();
  return res.redirect("/login");
};

// expose common locals for all views
router.use((req, res, next) => {
  res.locals.authenticated = !!req.session.user;
  res.locals.username = req.session.user?.username || null;
  // optional: keep a default displayName so EJS never crashes
  res.locals.displayName = res.locals.username;
  next();
});

router.get("/login", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("login", { error });
});

router.post('/submitLogin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db_users.getUser({ user: null, email });
    if (!user) {
      req.session.error = "This e-mail or username could not be found. Please enter a valid e-mail address.";
      return res.redirect("/login");
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      req.session.error = "Incorrect password! Please try again.";
      return res.redirect("/login");
    }

    // set session
    req.session.user = { user_id: user.user_id, username: user.username, email: user.email };
    req.session.cookie.maxAge = expireTime;

    // >>> go to profile (not /loggedin)
    return res.redirect("/profile");
  } catch (error) {
    console.log("Login error:", error);
    return res.render("login", { error: "An error occurred. Please try again." });
  }
});

router.get("/signup", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("signup", { error });
});

router.post("/submitSignup", async (req, res) => {
  const { username, email, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(10)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_]).{10,}$"))
      .required(),
  });

  const validationResult = schema.validate({ username, email, password }, { abortEarly: false });
  if (validationResult.error) {
    req.session.error = `${validationResult.error}`;
    return res.redirect("/signup");
  }

  try {
    const existingUser = await db_users.getUser({ user: username, email });
    if (existingUser) {
      req.session.error = "Email or username already exists. Please try again.";
      return res.redirect("/signup");
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const success = await db_users.createUser({ email, user: username, hashedPassword: passwordHash });

    if (!success) {
      req.session.error = "Database Error! Please contact server administrators.";
      return res.redirect("/signup");
    }

    // Optional: log them in right away
    req.session.user = { user_id: null, username, email }; // you can fetch ID if needed
    req.session.cookie.maxAge = expireTime;

    return res.redirect("/profile");
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// // >>> protect profile and pass displayName explicitly (belt and suspenders)
// router.get("/profile", authRequired, (req, res) => {
//   const error = req.session.error;
//   req.session.error = null;
//   res.render("profile", {
//     error,
//     displayName: req.session.user.username,   // ensure EJS has it
//     username: req.session.user.username       // also pass username
//   });
// });
router.get("/profile", authRequired, (req, res) => {
  const threads = [
    {
      id: 101,
      title: "Best starter stack for a student project?",
      tags: ["node", "mysql", "tailwind"],
      status: "published",        // "draft" | "published" | "archived"
      visibility: "public",       // "public" | "private" | "unlisted"
      views: 482,
      comments: 19,
      likes: 34,
      createdAt: "2025-09-21",
      updatedAt: "2025-10-12"
    },
    {
      id: 102,
      title: "Help: MySQL foreign keys not showing in DBeaver ERD",
      tags: ["mysql", "erd", "dbeaver"],
      status: "draft",
      visibility: "private",
      views: 73,
      comments: 3,
      likes: 4,
      createdAt: "2025-10-01",
      updatedAt: "2025-10-10"
    },
    {
      id: 103,
      title: "Tailwind v4: CLI + PostCSS quick setup",
      tags: ["tailwind", "css", "build"],
      status: "published",
      visibility: "public",
      views: 921,
      comments: 41,
      likes: 88,
      createdAt: "2025-09-15",
      updatedAt: "2025-10-14"
    }
  ];

  res.render("profile", {
    displayName: req.session.user.username,
    username: req.session.user.username,
    threads
  });
});

router.get('/upload', authRequired, (req, res) => {
  res.render('upload', { error: null, success: null });
});

router.get("/", (req, res) => {
  const error = req.session.error;
  const success = req.session.success;
  req.session.error = null;
  req.session.success = null;
  res.render("index", { error, success });
});

router.get("*", (req, res) => {
  res.status(404).render("404");
});

module.exports = router;
