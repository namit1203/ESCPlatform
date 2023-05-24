
const connection = require('..\\Controller\\dbContext.js');
const loginAttempts = (ip, update = true, callback) => {
	// Get the current date
	let d = new Date();
	let now = (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1).split('.')[0];
	// Update attempts left
	if (update) {
		connection.query('INSERT INTO login_attempts (ip_address, `date`) VALUES (?,?) ON DUPLICATE KEY UPDATE attempts_left = attempts_left - 1, `date` = VALUES(`date`)', [ip, now]);
	}
	// Retrieve the login attempts from the db
	connection.query('SELECT * FROM login_attempts WHERE ip_address = ?', [ip], (error, results) => {
		let login_attempts = [];
		if (results.length > 0) {
			// Determine expiration date
			let expire = new Date(results[0].date);
			expire.setDate(expire.getDate() + 1);
			// If current date is greater than the expiration date
			if (d.getTime() > expire.getTime()) {
				// Delete attempts
				connection.query('DELETE FROM login_attempts WHERE id_address = ?', [ip]);
			} else {
				login_attempts = results[0];
			}
		}
		// Execute callback function
		if (callback != undefined) callback(login_attempts);
	});
};
module.exports = loginAttempts;