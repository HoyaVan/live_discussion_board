const router = require("express").Router();
const bcrypt = require("bcrypt");
const db_users = include('database/utils/users');
const db_threads = include('database/utils/threads');
const db_comments = include('database/utils/comments');
const db_likes = include('database/utils/likes');
const validation = include('auth/validation');

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

  const loginResult = validation.validateLogin({ email, password });
  if (loginResult.error) {
    req.session.error = validation.formatValidationErrors(loginResult);
    return res.redirect("/login");
  }

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

  const validationResult = validation.validateSignup({ username, email, password });
  if (validationResult.error) {
    req.session.error = validation.formatValidationErrors(validationResult);
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

// In your POST /threads/create route:
router.post('/threads/create', authRequired, async (req, res) => {
  const { title, body } = req.body;
  
  const validationResult = validation.validateThread({ title, body });
  
  if (validationResult.error) {
    return res.render('upload', { 
      error: validationResult.error.details.map(d => d.message).join(', '),
      success: null 
    });
  }
  
  try {
    const threadId = await db_threads.createThread({
      author_id: req.session.user.user_id,
      title: title,
      description: body
    });
    
    if (threadId) {
      req.session.success = "Thread created successfully!";
      return res.redirect('/profile');
    } else {
      return res.render('upload', { 
        error: 'Failed to create thread. Please try again.',
        success: null 
      });
    }
  } catch (error) {
    console.error("Error creating thread:", error);
    return res.render('upload', { 
      error: 'An error occurred. Please try again.',
      success: null 
    });
  }
});

router.get("/profile", authRequired, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const threads = await db_threads.getThreadsByAuthor(userId);
    
    res.render("profile", {
      displayName: req.session.user.username,
      username: req.session.user.username,
      threads
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.render("profile", {
      displayName: req.session.user.username,
      username: req.session.user.username,
      threads: []
    });
  }
});

// API route to get thread with comments
router.get('/api/threads/:id', async (req, res) => {
  try {
    const threadId = req.params.id;

    // increment every time the detail is fetched
    await db_threads.incrementThreadViews(threadId);

    // fetch the updated thread and comments
    const thread = await db_threads.getThreadById(threadId);
    const comments = await db_comments.getCommentsByThread(threadId);

    const totalLikes = thread.likes_count + comments.reduce((sum, c) => sum + c.likes_count, 0);

    res.json({
      success: true,
      thread: {
        ...thread,
        comments,
        total_likes: totalLikes,
      },
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// API route to like a thread
router.post('/api/threads/:id/like', authRequired, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.session.user.user_id;
    
    const success = await db_likes.likeThread(userId, threadId);
    res.json({ success });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// API route to like a comment
router.post('/api/comments/:id/like', authRequired, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.session.user.user_id;
    
    const success = await db_likes.likeComment(userId, commentId);
    res.json({ success });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// API route to add a comment
router.post('/api/threads/:id/comments', authRequired, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { comment } = req.body;
    const userId = req.session.user.user_id;
    
    const commentId = await db_comments.createComment({
      thread_id: threadId,
      author_id: userId,
      body: comment
    });
    
    res.json({ success: !!commentId });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get('/upload', authRequired, (req, res) => {
  res.render('upload', { error: null, success: null });
});

// Logout route
router.get('/logout', (req, res) => {
  // Get the session ID before destroying
  const sessionId = req.sessionID;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/');
    }
    
    // Clear the session cookie
    res.clearCookie('sid', { 
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Redirect to home page with success message
    res.redirect('/?loggedOut=true');
  });
});

// Alternative POST logout route (if you prefer form submission)
router.post('/logout', (req, res) => {
  const sessionId = req.sessionID;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/');
    }
    
    res.clearCookie('sid', { 
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.redirect('/?loggedOut=true');
  });
});

router.get("/", async (req, res) => {
  try {
    const threads = await db_threads.getAllThreads();
    const loggedOut = req.query.loggedOut === 'true';
    
    res.render("index", { 
      threads,
      error: req.session.error,
      success: loggedOut ? 'You have been logged out successfully.' : req.session.success
    });
  } catch (error) {
    console.error("Error loading main page:", error);
    res.render("index", { 
      threads: [],
      error: "Failed to load threads",
      success: null
    });
  }
});

router.get("*", (req, res) => {
  res.status(404).render("404");
});

module.exports = router;
