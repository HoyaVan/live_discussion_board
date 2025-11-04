const { pool: mysqlPool } = include('database/connect_mysql');

function toBooleanQuery(raw) {
  if (!raw) return '';
  // split on non-letters/digits, remove very short tokens (<3), and stopword-ish bits
  const tokens = String(raw)
    .toLowerCase()
    .split(/[^a-z0-9_#+-]+/i)
    .filter(t => t && t.length >= 3 && !['the','and','for','with','from','this','that','have','you','your','are','was','were'].includes(t));

  // Build +token* for prefix match; boolean mode needs at least one term
  return tokens.map(t => `+${t}*`).join(' ');
}

async function searchThreadsAndComments(q) {
  const booleanQuery = toBooleanQuery(q);
  const likeQuery = `%${q}%`;

  // Threads
  const threadsSql = booleanQuery
    ? `
      SELECT
        'thread' AS kind,
        t.thread_id,
        NULL     AS comment_id,
        MATCH(t.title, t.description) AGAINST (? IN BOOLEAN MODE) AS score,
        t.title, t.description,
        u.username, u.avatar_url AS author_avatar_url,
        t.created_at
      FROM threads t
      JOIN users u ON u.user_id = t.author_id
      WHERE MATCH(t.title, t.description) AGAINST (? IN BOOLEAN MODE)
    `
    : `
      SELECT
        'thread' AS kind,
        t.thread_id,
        NULL     AS comment_id,
        0        AS score,
        t.title, t.description,
        u.username, u.avatar_url AS author_avatar_url,
        t.created_at
      FROM threads t
      JOIN users u ON u.user_id = t.author_id
      WHERE t.title LIKE ? OR t.description LIKE ?
    `;

  // Comments
  const commentsSql = booleanQuery
    ? `
      SELECT
        'comment' AS kind,
        c.thread_id,
        c.comment_id,
        MATCH(c.body) AGAINST (? IN BOOLEAN MODE) AS score,
        t.title        AS thread_title,
        c.body         AS description,
        u.username     AS comment_username,
        u.avatar_url   AS commenter_avatar_url,
        c.created_at
      FROM comments c
      JOIN threads t ON t.thread_id = c.thread_id
      JOIN users   u ON u.user_id   = c.author_id
      WHERE MATCH(c.body) AGAINST (? IN BOOLEAN MODE)
    `
    : `
      SELECT
        'comment' AS kind,
        c.thread_id,
        c.comment_id,
        0          AS score,
        t.title    AS thread_title,
        c.body     AS description,
        u.username AS comment_username,
        u.avatar_url AS commenter_avatar_url,
        c.created_at
      FROM comments c
      JOIN threads t ON t.thread_id = c.thread_id
      JOIN users   u ON u.user_id   = c.author_id
      WHERE c.body LIKE ?
    `;

  const unionSql = `
    ${threadsSql}
    UNION ALL
    ${commentsSql}
    ORDER BY score DESC, created_at DESC
    LIMIT 50
  `;

  const params = booleanQuery
    ? [booleanQuery, booleanQuery, booleanQuery, booleanQuery]
    : [likeQuery, likeQuery, likeQuery];

  const [rows] = await mysqlPool.execute(unionSql, params);
  return rows;
}

module.exports = { searchThreadsAndComments };
