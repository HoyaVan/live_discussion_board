const { pool: mysqlPool } = include('database/connect_mysql');

async function likeThread(userId, threadId) {
    try {
        // Check if already liked
        const [existing] = await mysqlPool.execute(
            'SELECT _id FROM likes WHERE user_id = ? AND target_type = "thread" AND target_id = ?',
            [userId, threadId]
        );
        
        if (existing.length > 0) {
            return false; // Already liked
        }
        
        // Add like
        await mysqlPool.execute(
            'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, "thread", ?)',
            [userId, threadId]
        );
        
        // Update thread likes count
        await mysqlPool.execute(
            'UPDATE threads SET likes_count = likes_count + 1 WHERE thread_id = ?',
            [threadId]
        );
        
        return true;
    } catch (error) {
        console.log("Error liking thread:", error);
        return false;
    }
}

async function likeComment(userId, commentId) {
    try {
        // Check if already liked
        const [existing] = await mysqlPool.execute(
            'SELECT _id FROM likes WHERE user_id = ? AND target_type = "comment" AND target_id = ?',
            [userId, commentId]
        );
        
        if (existing.length > 0) {
            return false; // Already liked
        }
        
        // Add like
        await mysqlPool.execute(
            'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, "comment", ?)',
            [userId, commentId]
        );
        
        // Update comment likes count
        await mysqlPool.execute(
            'UPDATE comments SET likes_count = likes_count + 1 WHERE comment_id = ?',
            [commentId]
        );
        
        return true;
    } catch (error) {
        console.log("Error liking comment:", error);
        return false;
    }
}

module.exports = { likeThread, likeComment };