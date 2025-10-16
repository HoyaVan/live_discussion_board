const { pool: mysqlPool } = include('database/connect_mysql');

async function createThread(postData) {
    let createThreadSQL = `
        INSERT INTO threads
        (author_id, title, description)
        VALUES
        (?, ?, ?);
    `;

    let params = [
        postData.author_id,
        postData.title,
        postData.description
    ];

    try {
        const [results] = await mysqlPool.execute(createThreadSQL, params);
        console.log("Successfully created thread");
        return results.insertId; // Return the new thread ID
    }
    catch (err) {
        console.log("Error creating thread:", err);
        return false;
    }
}

// get all threads for main page
async function getAllThreads() {
    let sql = `
        SELECT t.thread_id, t.author_id, t.title, t.description, t.views, 
               t.likes_count, t.comments_count, t.created_at, t.updated_at,
               u.username, u.email
        FROM threads t
        JOIN users u ON t.author_id = u.user_id
        ORDER BY t.created_at DESC
    `;

    try {
        const [results] = await mysqlPool.execute(sql);
        console.log("Successfully retrieved threads all threads");
        return results;
    }
    catch (err) {
        console.log("Error getting threads by author:", err);
        return [];
    }
}

// get specific thread for profile page
async function getThreadsByAuthor(author_id){
    let sql = `
        SELECT thread_id, author_id, title, description, views, 
            likes_count, comments_count, created_at, updated_at
        FROM threads
        WHERE author_id = ?
        ORDER BY created_at DESC
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

// Get a single thread by ID for thread detail page
async function getThreadById(thread_id) {
    let sql = `
        SELECT t.thread_id, t.author_id, t.title, t.description, t.views, 
               t.likes_count, t.comments_count, t.created_at, t.updated_at,
               u.username, u.email
        FROM threads t
        JOIN users u ON t.author_id = u.user_id
        WHERE t.thread_id = ?
        LIMIT 1
    `;
    
    try {
        const [results] = await mysqlPool.execute(sql, [thread_id]);
        console.log("Successfully retrieved thread by ID");
        return results[0] || null;
    }
    catch(err) {
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
  
module.exports = {
createThread,
getAllThreads,
getThreadsByAuthor,
getThreadById,
incrementThreadViews, 
};
