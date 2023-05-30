const init = require(__dirname + '\\init.js');
const connection = require('..\\Controller\\dbContext.js');
const isLoggedin = (request, callback, callback2) => {
	// Check if the loggedin param exists in session
	init(request, settings => {
		if (request.session.account_loggedin) {
			return callback !== undefined ? callback(settings) : false;
		} else if (request.cookies.rememberme) {
			// if the remember me cookie exists check if an account has the same value in the database
			connection.query('SELECT * FROM accounts WHERE rememberme = ?', [request.cookies.rememberme], (error, accounts, fields) => {
				if (accounts.length > 0) {
					request.session.account_loggedin = true;
					request.session.account_id = accounts[0].id;
					request.session.account_username = accounts[0].username;
					request.session.account_role = accounts[0].role;
					request.session.account_password = accounts[0].password;
					return callback !== undefined ? callback(settings) : false;
				} else {
					return callback2 !== undefined ? callback2(settings) : false;
				}
			});
		} else {
			return callback2 !== undefined ? callback2(settings) : false;
		}
	});
};
module.exports = isLoggedin;
