const mysqlPool = include('database/connect_mysql');

async function createUser(postData) {
    let createUserSQL = `
        INSERT INTO users
        (email, username, password_hash)
        VALUES
        (?, ?, ?);
    `;

    let params = [
        postData.email,
        postData.user,
        postData.hashedPassword
    ];

    try {
        const [results] = await mysqlPool.execute(createUserSQL, params);
        console.log("Successfully created user");
        return true;
    }
    catch(err) {
        console.log("Error inserting user:", err);
        return false;
    }
}

async function getUsers() {
    let getUsersSQL = `
        SELECT user_id, username, email, password_hash, created_at
        FROM users;
    `;
    
    try {
        const [results] = await mysqlPool.execute(getUsersSQL);
        console.log("Successfully retrieved users");
        return results;
    }
    catch(err) {
        console.log("Error getting users:", err);
        return false;
    }
}

async function getUser(postData) {
    let getUserSQL = `
        SELECT user_id, username, email, password_hash
        FROM users
        WHERE email = ? AND username = ?
        LIMIT 1;
    `;

    let params = [postData.email, postData.user];
    
    try {
        const [results] = await mysqlPool.execute(getUserSQL, params);
        console.log("Successfully found user");
        return results[0] || null;
    }
    catch(err) {
        console.log("Error trying to find user:", err);
        return false;
    }
}

module.exports = {createUser, getUsers, getUser};