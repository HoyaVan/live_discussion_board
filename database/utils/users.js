const { pool: mysqlPool } = include('database/connect_mysql');

async function createUser(postData) {
  const sql = `
    INSERT INTO users (email, username, password_hash, avatar_url, avatar_pid)
    VALUES (?, ?, ?, ?, ?);
  `;
  const params = [
    postData.email,
    postData.user,
    postData.hashedPassword,
    postData.avatar_url || process.env.DEFAULT_AVATAR_URL || null,
    postData.avatar_pid || null
  ];
  try {
    const [results] = await mysqlPool.execute(sql, params);
    return true;
  } catch (err) {
    console.log("Error inserting user:", err);
    return false;
  }
}

async function getUsers() {
  const sql = `
    SELECT user_id, username, email, password_hash, avatar_url, avatar_pid, created_at
    FROM users;
  `;
  try {
    const [results] = await mysqlPool.execute(sql);
    return results;
  } catch (err) {
    console.log("Error getting users:", err);
    return false;
  }
}

async function getUser(postData) {
  const sql = `
    SELECT user_id, username, email, password_hash, avatar_url, avatar_pid
    FROM users
    WHERE email = ?
    LIMIT 1;
  `;
  try {
    const [results] = await mysqlPool.execute(sql, [postData.email]);
    return results[0] || null;
  } catch (err) {
    console.log("Error trying to find user:", err);
    return false;
  }
}

async function setUserAvatar({ user_id, avatar_url, avatar_pid }) {
  const sql = `UPDATE users SET avatar_url = ?, avatar_pid = ?, updated_at = NOW() WHERE user_id = ?`;
  try {
    const [r] = await mysqlPool.execute(sql, [avatar_url, avatar_pid, user_id]);
    return r.affectedRows === 1;
  } catch (err) {
    console.log("Error setting avatar:", err);
    return false;
  }
}

async function resetUserAvatar({ user_id }) {
  const sql = `UPDATE users SET avatar_url = ?, avatar_pid = NULL, updated_at = NOW() WHERE user_id = ?`;
  try {
    const [r] = await mysqlPool.execute(sql, [process.env.DEFAULT_AVATAR_URL || null, user_id]);
    return r.affectedRows === 1;
  } catch (err) {
    console.log("Error resetting avatar:", err);
    return false;
  }
}
async function updateUsername({ user_id, username }) {
  const sql = `UPDATE users SET username = ?, updated_at = NOW() WHERE user_id = ?`;
  try {
    const [r] = await mysqlPool.execute(sql, [username, user_id]);
    return r.affectedRows === 1;
  } catch (err) {
    console.log('Error updating username:', err);
    return false;
  }
}

async function deleteUser({ user_id }) {
  const sql = `DELETE FROM users WHERE user_id = ?`;
  try {
    const [r] = await mysqlPool.execute(sql, [user_id]);
    return r.affectedRows === 1;
  } catch (err) {
    console.log('Error deleting user:', err);
    return false;
  }
}

module.exports = {  createUser,
  getUsers,
  getUser,
  setUserAvatar,
  resetUserAvatar,
  updateUsername,
  deleteUser
  };
