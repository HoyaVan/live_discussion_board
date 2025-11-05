const router = require("express").Router();
const bcrypt = require("bcrypt");
const db_users = include('database/utils/users');
const db_threads = include('database/utils/threads');
const db_comments = include('database/utils/comments');
const db_likes = include('database/utils/likes');
const validation = include('auth/validation');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = include('database/utils/cloudinary');
const db_search = include('database/utils/search');
require("dotenv").config();

const expireTime = 1 * 60 * 60 * 1000;
const saltRounds = 12;

// auth guard
const authRequired = (req, res, next) => {
  if (req.session?.user) return next();
  return res.redirect("/login");
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid file type'), ok);
  }
});

// expose common locals for all views
router.use((req, res, next) => {
  res.locals.authenticated = !!req.session.user;
  res.locals.username = req.session.user?.username || null;
  res.locals.displayName = res.locals.username;
  res.locals.avatar_url = req.session.user?.avatar_url || process.env.DEFAULT_AVATAR_URL || null;
  res.locals.default_avatar_url = process.env.DEFAULT_AVATAR_URL || '/images/default-avatar.png'; // ← add this
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
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url || process.env.DEFAULT_AVATAR_URL || null
    };
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
    req.session.user = {
      user_id: null,
      username,
      email,
      avatar_url: process.env.DEFAULT_AVATAR_URL || null
    };
    req.session.cookie.maxAge = expireTime;


    return res.redirect("/profile");
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      req.session.error = "Email or username already exists. Please try another.";
      return res.redirect("/signup");
    }
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


router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, results: [] });

    const results = await db_search.searchThreadsAndComments(q);
    res.json({ success: true, results });
  } catch (e) {
    console.error('search error', e);
    res.json({ success: false, error: 'Search failed' });
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

// Account page
router.get('/account', authRequired, (req, res) => {
  res.render('account', {
    username: req.session.user.username,
    email: req.session.user.email,
    avatar_url: req.session.user.avatar_url || process.env.DEFAULT_AVATAR_URL || null
  });
});

// Update username
router.post('/account/username', authRequired, async (req, res) => {
  try {
    const newUsername = (req.body.username || '').trim();
    if (!newUsername) return res.redirect('/account');

    const ok = await db_users.updateUsername({ user_id: req.session.user.user_id, username: newUsername });
    if (ok) req.session.user.username = newUsername;
    return res.redirect('/account');
  } catch (e) {
    console.error('update username', e);
    return res.redirect('/account');
  }
});

// Delete account (hard delete; make sure FKs are ON DELETE CASCADE or handle deletes in utils)
router.post('/account/delete', authRequired, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // optionally remove avatar from Cloudinary
    try {
      const row = await db_users.getUser({ email: req.session.user.email });
      if (row?.avatar_pid) {
        const cloudinary = include('database/utils/cloudinary');
        await cloudinary.uploader.destroy(row.avatar_pid);
      }
    } catch (_) { }

    const ok = await db_users.deleteUser({ user_id: userId });

    req.session.destroy(() => {
      res.clearCookie('sid', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.redirect('/?loggedOut=true');
    });
  } catch (e) {
    console.error('delete account', e);
    return res.redirect('/account');
  }
});

router.post('/profile/avatar', authRequired, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.redirect('/profile');

    const userId = req.session.user.user_id;
    const userRow = await db_users.getUser({ email: req.session.user.email });
    const prevPid = userRow?.avatar_pid || null;

    const publicId = `avatars/user_${userId}_${Date.now()}`;
    const cldOpts = {
      folder: 'avatars',
      public_id: publicId,
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }]
    };

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(cldOpts, (err, resu) => err ? reject(err) : resolve(resu));
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    if (prevPid) {
      try { await cloudinary.uploader.destroy(prevPid); } catch (_) { }
    }

    await db_users.setUserAvatar({ user_id: userId, avatar_url: result.secure_url, avatar_pid: result.public_id });
    req.session.user.avatar_url = result.secure_url;
    // keep username/email in session; refresh nothing else
    return res.redirect('/profile');
  } catch (e) {
    console.error('avatar upload', e);
    req.session.error = 'Avatar upload failed.';
    return res.redirect('/profile');
  }
});

router.post('/profile/avatar/reset', authRequired, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const userRow = await db_users.getUser({ email: req.session.user.email });
    const prevPid = userRow?.avatar_pid || null;

    if (prevPid) {
      try { await cloudinary.uploader.destroy(prevPid); } catch (_) { }
    }
    await db_users.resetUserAvatar({ user_id: userId });
    req.session.user.avatar_url = process.env.DEFAULT_AVATAR_URL || null;
    return res.redirect('/profile');
  } catch (e) {
    console.error('avatar reset', e);
    req.session.error = 'Could not reset avatar.';
    return res.redirect('/profile');
  }
});

// Edit comment (author only)
router.put('/api/comments/:id', authRequired, async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const body = (req.body?.body || '').trim();
    if (!body) return res.status(400).json({ success: false, error: 'Body is required' });

    const userId = req.session.user.user_id;

    // Who is allowed?
    const meta = await db_comments.getCommentWithThreadAuthor(commentId);
    if (!meta) return res.status(404).json({ success: false, error: 'Not found' });

    const isAuthor = Number(userId) === Number(meta.comment_author_id);
    const isThreadOwner = Number(userId) === Number(meta.thread_author_id);
    if (!isAuthor && !isThreadOwner) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comment or comments in threads you own.'
      });
    }
    // Perform edit (use existing util which checks author; allow owner path as well)
    let ok = false;
    if (isAuthor) {
      ok = await db_comments.editComment({ comment_id: commentId, author_id: userId, body });
    } else {
      // thread owner edit path (no author check)
      ok = await db_comments.editCommentAsThreadAuthor
        ? await db_comments.editCommentAsThreadAuthor({ comment_id: commentId, body })
        : await db_comments.softDeleteCommentAsThreadAuthor({ comment_id: commentId }) && false; // fallback if not implemented
    }

    if (!ok) return res.status(409).json({ success: false, error: 'Edit failed' });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/api/comments/:id', authRequired, async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const userId = req.session.user.user_id;

    const meta = await db_comments.getCommentWithThreadAuthor(commentId);
    if (!meta) return res.status(404).json({ success: false, error: 'Not found' });

    const isAuthor = Number(userId) === Number(meta.comment_author_id);
    const isThreadOwner = Number(userId) === Number(meta.thread_author_id);

    let ok = false;
    if (isAuthor) {
      ok = await db_comments.softDeleteComment({ comment_id: commentId, author_id: userId });
    } else if (isThreadOwner) {
      ok = await db_comments.softDeleteCommentAsThreadAuthor({ comment_id: commentId });
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({ success: ok });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// API route to get thread with comments
router.get('/api/threads/:id', async (req, res) => {
  try {
    const threadId = req.params.id;

    // count each open
    await db_threads.incrementThreadViews(threadId);

    // then fetch fresh data
    const thread = await db_threads.getThreadById(threadId);
    const commentsRaw = await db_comments.getCommentsByThread(threadId);
    const userId = req.session.user?.user_id || null;

    const [likedRows] = await include('database/connect_mysql').pool.execute(
      'SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1',
      [userId || 0, 'thread', threadId]
    );
    const userLiked = !!likedRows.length;

    // Add permissions and display text
    // find which comments current user liked (for quick UI state)
    let userLikedCommentIds = new Set();
    try {
      if (userId && commentsRaw.length) {
        const ids = commentsRaw.map(c => c.comment_id);
        const placeholders = ids.map(() => '?').join(',');
        const [likedRowsComments] = await include('database/connect_mysql').pool.execute(
          `SELECT target_id FROM likes WHERE user_id = ? AND target_type = 'comment' AND target_id IN (${placeholders})`,
          [userId, ...ids]
        );
        userLikedCommentIds = new Set(likedRowsComments.map(r => Number(r.target_id)));
      }
    } catch (_) { }

    const enriched = commentsRaw.map(c => ({
      ...c,
      can_edit: !!userId && Number(userId) === Number(c.author_id) && c.is_deleted === 0,
      can_delete: !!userId && (Number(userId) === Number(c.author_id) || Number(userId) === Number(thread.author_id)) && c.is_deleted === 0,
      display_body: c.is_deleted ? 'deleted' : c.body,
      user_liked: userLikedCommentIds.has(Number(c.comment_id))
    }));

    // Build a tree (parent_comment_id -> children)
    const byId = new Map();
    enriched.forEach(c => byId.set(c.comment_id, { ...c, children: [] }));
    const roots = [];
    enriched.forEach(c => {
      if (c.parent_comment_id) {
        const parent = byId.get(c.parent_comment_id);
        if (parent) parent.children.push(byId.get(c.comment_id));
      } else {
        roots.push(byId.get(c.comment_id));
      }
    });

    const totalLikes = thread.likes_count + enriched.reduce((sum, c) => sum + c.likes_count, 0);

    res.json({
      success: true,
      thread: {
        ...thread,
        user_liked: userLiked,
        comments: roots,
        total_likes: totalLikes,
      },
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    res.json({ success: false, error: error.message });
  }
});

router.post('/threads/:id/delete', authRequired, async (req, res) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.session.user.user_id;
    const ok = await db_threads.deleteThread({ thread_id: threadId, author_id: userId });
    req.session[ok ? 'success' : 'error'] = ok ? 'Thread deleted.' : 'Delete failed or not allowed.';
    return res.redirect('/profile');
  } catch (e) {
    req.session.error = 'Error deleting thread.';
    return res.redirect('/profile');
  }
});

// API route to like a thread
router.post('/api/threads/:id/like', authRequired, async (req, res) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.session.user.user_id;
    const result = await db_likes.likeThread(userId, threadId); // { liked: boolean|null }
    res.json({ success: result.liked !== null, liked: result.liked });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// API route to like a comment
router.post('/api/comments/:id/like', authRequired, async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const userId = req.session.user.user_id;
    const result = await db_likes.likeComment(userId, commentId); // { liked: true|false|null }
    if (result.liked === null) return res.status(500).json({ success: false });
    return res.json({ success: true, liked: result.liked });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// API route to add a comment
router.post('/api/threads/:id/comments', authRequired, async (req, res) => {
  try {
    const threadId = Number(req.params.id);
    const { comment, parent_comment_id } = req.body;
    const parentId = parent_comment_id == null || parent_comment_id === '' ? null : Number(parent_comment_id);

    const commentId = await db_comments.createComment({
      thread_id: threadId,
      author_id: req.session.user.user_id,
      body: comment,
      parent_comment_id: parentId
    });

    res.json({ success: !!commentId, comment_id: commentId });
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
