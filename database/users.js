const database = include('databaseConnection');

async function createUser(postData) {
	let createUserSQL = `
		INSERT INTO Users
		(email, username, password_hash, role)
		VALUES
		(:email, :user, :passwordHash, :role);
	`;

	let params = {
		email: postData.email,
		user: postData.user,
		passwordHash: postData.hashedPassword,
		role: postData.role
	};

	try {
		const results = await database.query(createUserSQL, params);

        console.log("Successfully created user");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error inserting user");
        console.log(err);
		return false;
	}
}

async function getUsers(postData) {
	let getUsersSQL = `
		SELECT username, password_hash
		FROM Users;
	`;
	
	try {
		const results = await database.query(getUsersSQL);

        console.log("Successfully retrieved users");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting users");
        console.log(err);
		return false;
	}
}

async function getUser(postData) {
	let getUserSQL = `
		SELECT user_id, username, email, password_hash
		FROM Users
		WHERE email = :email
			AND username = :user
		LIMIT 1;
		`;

	let params = {
		user: postData.user,
		email: postData.email
	}
	
	try {
		const [results] = await database.query(getUserSQL, params);

        console.log("Successfully found user");
		console.log(results[0]);
		return results[0];
	}

	catch(err) {
		console.log("Error trying to find user");
        console.log(err);
		return false;
	}
}

module.exports = {createUser, getUsers, getUser};