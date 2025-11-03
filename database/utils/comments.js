const { pool: mysqlPool } = include('database/connect_mysql');

async function createComment({ thread_id, author_id, body, parent_comment_id = null }) {
    // Insert with temporary path; we’ll compute proper path/depth based on parent
    const insertSql = `
        INSERT INTO comments (thread_id, author_id, parent_comment_id, body, path, depth)
        VALUES (?, ?, ?, ?, JSON_ARRAY(), 0)
    `;

    const conn = await mysqlPool.getConnection();
    try {
        await conn.beginTransaction();
        
        let parentPath = [];
        let depth = 0;

        if (parent_comment_id) {
            const [parents] = await conn.execute(
                `SELECT comment_id, path, depth, is_deleted FROM comments WHERE comment_id = ? AND thread_id = ?`,
                [parent_comment_id, thread_id]
            );
            if (!parents.length) throw new Error('Parent not found');
            const parent = parents[0];
            if (parent.is_deleted) throw new Error('Cannot reply to a deleted comment');
            const rawPath = parent.path;

            let basePath = [];
            try {
                if (Array.isArray(rawPath)) {
                    basePath = rawPath;
                } else if (typeof rawPath === 'string') {
                    basePath = rawPath.trim() ? JSON.parse(rawPath) : [];
                } else if (rawPath && typeof rawPath === 'object') {
                    basePath = rawPath; // some drivers already parse JSON
                }
            } catch (_) {
                basePath = [];
            }
            parentPath = basePath.concat([parent.comment_id]);

            depth = parent.depth + 1;
        }

        const [res] = await conn.execute(insertSql, [
            thread_id,
            author_id,
            parent_comment_id,
            body
        ]);

        const newId = res.insertId;

        // Set the actual path/depth for the new comment
        const finalPath = JSON.stringify(parentPath);
        await conn.execute(
            `UPDATE comments SET path = ?, depth = ? WHERE comment_id = ?`,
            [finalPath, depth, newId]
        );

        // Increment thread comments_count
        await conn.execute(
            `UPDATE threads SET comments_count = comments_count + 1 WHERE thread_id = ?`,
            [thread_id]
        );

        await conn.commit();
        return newId;
    } catch (e) {
        await conn.rollback();
        console.log('Error creating comment:', e);
        return false;
    } finally {
        conn.release();
    }
}

async function editComment({ comment_id, author_id, body }) {
    try {
        const [res] = await mysqlPool.execute(
            `UPDATE comments
         SET body = ?
         WHERE comment_id = ? AND author_id = ? AND is_deleted = 0`,
            [body, comment_id, author_id]
        );
        return res.affectedRows > 0;
    } catch (e) {
        console.log('Error editing comment:', e);
        return false;
    }
}

async function softDeleteComment({ comment_id, author_id }) {
    try {
        const [res] = await mysqlPool.execute(
            `UPDATE comments
         SET is_deleted = 1, body = ''
         WHERE comment_id = ? AND author_id = ? AND is_deleted = 0`,
            [comment_id, author_id]
        );
        return res.affectedRows > 0;
    } catch (e) {
        console.log('Error soft-deleting comment:', e);
        return false;
    }
}

// Flat fetch (includes needed fields). You’ll build the tree on the server or client.
async function getCommentsByThread(threadId) {
    const sql = `
      SELECT c.comment_id, c.thread_id, c.author_id, c.parent_comment_id, c.body,
             c.likes_count, c.created_at, c.updated_at, c.is_deleted, c.path, c.depth,
             u.username
      FROM comments c
      JOIN users u ON c.author_id = u.user_id
      WHERE c.thread_id = ?
      ORDER BY JSON_LENGTH(c.path) ASC, c.created_at ASC
    `;
    try {
        const [rows] = await mysqlPool.execute(sql, [threadId]);
        return rows;
    } catch (e) {
        console.log('Error getting comments:', e);
        return [];
    }
}

async function getCommentWithThreadAuthor(comment_id) {
    try {
        const [rows] = await mysqlPool.execute(
            `SELECT c.comment_id,
                    c.author_id   AS comment_author_id,
                    c.thread_id,
                    t.author_id   AS thread_author_id
             FROM comments c
             JOIN threads  t ON t.thread_id = c.thread_id
             WHERE c.comment_id = ?`,
            [comment_id]
        );
        return rows[0] || null;
    } catch (e) {
        console.log('Error fetching comment meta:', e);
        return null;
    }
}

async function softDeleteCommentAsThreadAuthor({ comment_id }) {
    try {
        const [res] = await mysqlPool.execute(
            `UPDATE comments
             SET is_deleted = 1, body = ''
             WHERE comment_id = ? AND is_deleted = 0`,
            [comment_id]
        );
        return res.affectedRows > 0;
    } catch (e) {
        console.log('Error moderator-deleting comment:', e);
        return false;
    }
}

module.exports = {
    createComment,
    editComment,
    softDeleteComment,
    getCommentsByThread,
    getCommentWithThreadAuthor,
    softDeleteCommentAsThreadAuthor
};