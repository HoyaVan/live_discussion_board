const { pool: mysqlPool } = include('database/connect_mysql');

async function createThread(postData) {
  const createThreadSQL = `
    INSERT INTO threads
      (author_id, title, description)
    VALUES
      (?, ?, ?);
  `;
  const params = [
    postData.author_id,
    postData.title,
    postData.description
  ];

  try {
    const [results] = await mysqlPool.execute(createThreadSQL, params);
    console.log("Successfully created thread");
    return results.insertId; // Return the new thread ID
  } catch (err) {
    console.log("Error creating thread:", err);
    return false;
  }
}

// get all threads for main page (feed)
async function getAllThreads() {
  const sql = `
    SELECT
      t.thread_id,
      t.author_id,
      t.title,
      t.description,
      t.views,
      t.likes_count,
      t.comments_count,
      t.created_at,
      t.updated_at,
      u.username,
      u.email,
      u.avatar_url AS author_avatar_url
    FROM threads t
    JOIN users u ON t.author_id = u.user_id
    ORDER BY t.created_at DESC
  `;

  try {
    const [results] = await mysqlPool.execute(sql);
    console.log("Successfully retrieved all threads");
    return results;
  } catch (err) {
    console.log("Error getting all threads:", err);
    return [];
  }
}

// get specific user's threads (profile page)
// (including avatar for consistency / future UI use)
async function getThreadsByAuthor(author_id) {
  const sql = `
    SELECT
      t.thread_id,
      t.author_id,
      t.title,
      t.description,
      t.views,
      t.likes_count,
      t.comments_count,
      t.created_at,
      t.updated_at,
      u.username,
      u.avatar_url AS author_avatar_url
    FROM threads t
    JOIN users u ON t.author_id = u.user_id
    WHERE t.author_id = ?
    ORDER BY t.created_at DESC
  `;

  try {
    const [results] = await mysqlPool.execute(sql, [author_id]);
    console.log("Successfully retrieved threads by author");
    return results;
  } catch (err) {
    console.log("Error getting threads by author:", err);
    return [];
  }
}

// get a single thread by ID (thread detail modal)
async function getThreadById(thread_id) {
  const sql = `
    SELECT
      t.thread_id,
      t.author_id,
      t.title,
      t.description,
      t.views,
      t.likes_count,
      t.comments_count,
      t.created_at,
      t.updated_at,
      u.username,
      u.email,
      u.avatar_url AS author_avatar_url
    FROM threads t
    JOIN users u ON t.author_id = u.user_id
    WHERE t.thread_id = ?
    LIMIT 1
  `;

  try {
    const [results] = await mysqlPool.execute(sql, [thread_id]);
    console.log("Successfully retrieved thread by ID");
    return results[0] || null;
  } catch (err) {
    console.log("Error getting thread by ID:", err);
    return null;
  }
}

async function incrementThreadViews(thread_id) {
  try {
    await mysqlPool.execute(
      'UPDATE threads SET views = views + 1 WHERE thread_id = ?',
      [thread_id]
    );
    return true;
  } catch (err) {
    console.log('Error incrementing thread views:', err);
    return false;
  }
}

async function deleteThread({ thread_id, author_id }) {
  try {
    const [res] = await mysqlPool.execute(
      `DELETE FROM threads WHERE thread_id = ? AND author_id = ?`,
      [thread_id, author_id]
    );
    return res.affectedRows > 0;
  } catch (err) {
    console.log('Error deleting thread:', err);
    return false;
  }
}

async function incrementUniqueView(thread_id, viewer_key) {
  try {
    // record unique view per viewer_key
    const [r] = await mysqlPool.execute(
      'INSERT IGNORE INTO thread_views (thread_id, viewer_key) VALUES (?, ?)',
      [thread_id, viewer_key]
    );
    if (r.affectedRows === 1) {
      await mysqlPool.execute(
        'UPDATE threads SET views = views + 1 WHERE thread_id = ?',
        [thread_id]
      );
    }
    return true;
  } catch (err) {
    console.log('incrementUniqueView error', err);
    return false;
  }
}

async function countThreadsByAuthor(author_id) {
  const sql = `SELECT COUNT(*) AS cnt FROM threads WHERE author_id = ?`;
  try {
    const [rows] = await mysqlPool.execute(sql, [author_id]);
    return rows[0]?.cnt || 0;
  } catch (err) {
    console.log("Error counting threads by author:", err);
    return 0;
  }
}

async function getThreadsByAuthorPaginated(author_id, limit, offset) {
  // Coerce and clamp to safe integers, then inline to avoid MySQL binding issues for LIMIT/OFFSET
  const lim = Math.max(0, parseInt(limit, 10) || 6);
  const off = Math.max(0, parseInt(offset, 10) || 0);

  const sql = `
    SELECT
      t.thread_id,
      t.author_id,
      t.title,
      t.description,
      t.views,
      t.likes_count,
      t.comments_count,
      t.created_at,
      t.updated_at,
      u.username,
      u.avatar_url AS author_avatar_url
    FROM threads t
    JOIN users u ON t.author_id = u.user_id
    WHERE t.author_id = ?
    ORDER BY t.created_at DESC
    LIMIT ${lim} OFFSET ${off}
  `;
  try {
    const [rows] = await mysqlPool.execute(sql, [author_id]);
    return rows;
  } catch (err) {
    console.log("Error getting threads by author (paginated):", err);
    return [];
  }
}

module.exports = {
  createThread,
  getAllThreads,
  getThreadsByAuthor,
  getThreadById,
  incrementThreadViews,
  deleteThread,
  incrementUniqueView,
  countThreadsByAuthor,
  getThreadsByAuthorPaginated,
};
