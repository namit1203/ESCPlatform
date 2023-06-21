const init = require(__dirname + '\\init.js');
const connection = require('..\\Controller\\dbContext.js');
const isLoggedin = (request, callback, callback2) => {
	// Check if the loggedin param exists in session
	init(request, settings => {
		if (request.session.account_loggedin) {
			return executeCallback(callback, settings);
		} else if (request.cookies.rememberme) {
			connection.query('SELECT * FROM accounts WHERE rememberme = ?', [request.cookies.rememberme], (error, accounts, fields) => {
				if (accounts.length > 0) {
					setSessionData(request, accounts[0]);
					return executeCallback(callback, settings);
				} else {
					return executeCallback(callback2, settings);
				}
			});
		} else {
			return executeCallback(callback2, settings);
		}
	});
	
	function executeCallback(callback, settings) {
		return callback !== undefined ? callback(settings) : false;
	}
	
	function setSessionData(request, account) {
		request.session.account_loggedin = true;
		request.session.account_id = account.id;
		request.session.account_username = account.username;
		request.session.account_role = account.role;
		request.session.account_password = account.password;
	}
	
};
module.exports = isLoggedin;
