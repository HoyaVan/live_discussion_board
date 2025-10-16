const { pool: mysqlPool } = include('database/connect_mysql');

async function createComment(postData) {
    let sql = `
        INSERT INTO comments (thread_id, author_id, body, path, depth)
        VALUES (?, ?, ?, JSON_ARRAY(), 0)
    `;
    
    try {
        const [results] = await mysqlPool.execute(sql, [
            postData.thread_id,
            postData.author_id,
            postData.body
        ]);
        
        // Update thread comments count
        await mysqlPool.execute(
            'UPDATE threads SET comments_count = comments_count + 1 WHERE thread_id = ?',
            [postData.thread_id]
        );
        
        return results.insertId;
    } catch (error) {
        console.log("Error creating comment:", error);
        return false;
    }
}

async function getCommentsByThread(threadId) {
    let sql = `
        SELECT c.comment_id, c.thread_id, c.author_id, c.body, c.likes_count, c.created_at,
               u.username
        FROM comments c
        JOIN users u ON c.author_id = u.user_id
        WHERE c.thread_id = ?
        ORDER BY c.created_at ASC
    `;
    
    try {
        const [results] = await mysqlPool.execute(sql, [threadId]);
        return results;
    } catch (error) {
        console.log("Error getting comments:", error);
        return [];
    }
}

module.exports = { createComment, getCommentsByThread };