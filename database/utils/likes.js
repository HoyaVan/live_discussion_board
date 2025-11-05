const { pool: mysqlPool } = include('database/connect_mysql');

async function toggleLike({ userId, targetType, targetId }) {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT _id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ? FOR UPDATE',
      [userId, targetType, targetId]
    );

    let liked;
    if (rows.length) {
      await conn.execute(
        'DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
        [userId, targetType, targetId]
      );
      await conn.execute(
        targetType === 'thread'
          ? 'UPDATE threads SET likes_count = GREATEST(likes_count - 1, 0) WHERE thread_id = ?'
          : 'UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE comment_id = ?',
        [targetId]
      );
      liked = false;
    } else {
      await conn.execute(
        'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
        [userId, targetType, targetId]
      );
      await conn.execute(
        targetType === 'thread'
          ? 'UPDATE threads SET likes_count = likes_count + 1 WHERE thread_id = ?'
          : 'UPDATE comments SET likes_count = likes_count + 1 WHERE comment_id = ?',
        [targetId]
      );
      liked = true;
    }

    await conn.commit();
    return { liked };
  } catch (e) {
    await conn.rollback();
    console.log('toggleLike error', e);
    return { liked: null };
  } finally {
    conn.release();
  }
}

async function likeThread(userId, threadId) { return toggleLike({ userId, targetType: 'thread', targetId: threadId }); }
async function likeComment(userId, commentId) { return toggleLike({ userId, targetType: 'comment', targetId: commentId }); }

module.exports = { likeThread, likeComment };