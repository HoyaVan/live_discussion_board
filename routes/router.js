const router = require("express").Router();
const session = require("express-session");
const bcrypt = require("bcrypt");
const Joi = require("joi");

const mongoStore = include("/mongoStoreConnection");

const db_users = include('database/users');

require("dotenv").config();

const expireTime = 1 * 60 * 60 * 1000;
const saltRounds = 12;

router.use(
  session({
    secret: process.env.NODE_SESSION_SECRET,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

router.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.userId = req.session.userId;
  res.locals.authenticated = req.session.authenticated;
  next();
})

router.get("/login", async (req, res) => {
  const error = req.session.error;
  req.session.error = null;

  res.render("login", { error });
});

router.post('/submitLogin', async (req,res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

try {
    const user = await db_users.getUser({ user: username, email: email });

    if (!user) {
      req.session.error =
        "This e-mail or username could not be found. Please enter a valid e-mail address.";
      return res.redirect("/login");
    }

    if (!(await bcrypt.compare(password, user.password_hash))) {
      req.session.error = "Incorrect password! Please try again.";
      return res.redirect("/login");
    }

    // Session variable stuff
    req.session.username = user.username;
    req.session.userId = user.user_id;
    req.session.authenticated = true;
    req.session.cookie.maxAge = expireTime;

    console.log(`User ${user.username}, logged in successfully!`);

    return res.redirect("/loggedin");
  } catch (error) {
    console.log("Login error:", error);
    return res.render("login", {
      error: "An error occurred. Please try again.",
    });
  }
});

router.get("/signup", async (req, res) => {
  const error = req.session.error;
  req.session.error = null;

  res.render("signup", { error });
});

router.post("/submitSignup", async (req, res) => {
  const { username, email, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().max(20).required().messages({
      "string.max": "Username must be less than 20 characters.",
      "any.required": "Username is required.",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email format.",
      "any.required": "Email is required.",
    }),
    password: Joi.string()
      .min(10)
      .pattern(
        new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_]).{10,}$")
      )
      .required()
      .messages({
        "string.min": "Password must be at least 10 characters.",
        "string.pattern.base":
          "Password must contain uppercase, lowercase, numbers, and symbols.",
        "any.required": "Password is required.",
      }),
  });

  const validationResult = schema.validate(
    { username, email, password },
    { abortEarly: false }
  );

  if (validationResult.error != null) {
    console.log(validationResult.error);
    req.session.error = `${validationResult.error}`;
    return res.redirect("/signup");
  }

  try {
    const existingUser = await db_users.getUser({ user: username, email: email });

    if (existingUser && existingUser.length > 0) {
      req.session.error = "Email or username already exists. Please try again.";
      return res.redirect("/signup");
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const defaultUserRole = 'user';

    const success = await db_users.createUser({
      email: email,
      user: username,
      hashedPassword: passwordHash,
      role: defaultUserRole
    });

    if (success) {
      res.redirect("/login");
    } else {
      req.session.error = "MySQL Database Error! Please contact server administrators.";
      return res.redirect("/signup");
    }

  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send("Internal Server Error");
  }

  console.log("Signup submitted!");
});


router.get("/loggedin", async (req, res) => {
  const error = req.session.error;
  req.session.error = null;

  res.render("loggedin", { error });
})

router.get("/", async (req, res) => {
  res.render("index");
});


router.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

module.exports = router;