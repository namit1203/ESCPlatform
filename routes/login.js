const express = require('express');
const init = require('../utils/init')
const loginAttempts = require('../utils/loginAttempts')
const isLoggedin = require('../utils/isLoggedin')
const connection = require('../Controller/dbContext')
const app = express();
const cryptography = require('crypto');
const nunjucks = require('nunjucks');
const secret_key = 'your secret key';
const path = require('path');

const cookieParser = require('cookie-parser');
const env = nunjucks.configure('views', {
    autoescape: true,
    express: app
});
env.addFilter('formatNumber', num => String(num).replace(/(.)(?=(\d{3})+$)/g,'$1,'));
env.addFilter('formatDateTime', date => (new Date(date).toISOString()).slice(0, -1).split('.')[0]);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(cookieParser());

app.get(['/', '/login'], (request, response) => isLoggedin(request, () => {
	// User is logged in, redirect to home page
	response.redirect('/home');
}, () => {
	// Create CSRF token
	let token = cryptography.randomBytes(20).toString('hex');
	// Store token in session
	request.session.token = token;
	// User is not logged in, render login template
	response.render('index.html', { token: token });
}));
// http://localhost:3000/ - authenticate the user
app.post(['/', '/login'], (request, response) => init(request, settings => {
	// Create variables and assign the post data
	let username = request.body.username;
	let password = request.body.password;
	let hashedPassword = cryptography.createHash('sha1').update(request.body.password).digest('hex');
	let token = request.body.token;
	// Get client IP address
	let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
	// Bruteforce protection
	if (settings['brute_force_protection'] == 'true') {
		loginAttempts(ip, false, result => {
			if (result && result['attempts_left'] <= 1) {
				// No login attempts remaining
				response.send('You cannot login right now! Please try again later!');
				return response.end();				
			}
		});
	}
	// check if the data exists and is not empty
	if (username && password) {
		// Ensure the captured token matches the session token (CSRF Protection)
		if (settings['csrf_protection'] == 'true' && token != request.session.token) {
			// Incorrect token
			response.send('Incorrect token provided!');
			return response.end();			
		}
		// Select the account from the accounts table
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, hashedPassword], (error, accounts) => {
			// If the account exists
			if (accounts.length > 0) {
				// Twofactor
				if (settings['twofactor_protection'] == 'true' && accounts[0].ip != ip) {
					request.session.tfa_id = accounts[0].id;
					request.session.tfa_email = accounts[0].email;
					response.send('tfa: twofactor');
					return response.end();						
				}
				// Make sure account is activated
				// if (settings['account_activation'] == 'true' && accounts[0].activation_code != 'activated' && accounts[0].activation_code != '') {
				// 	response.send('Please activate your account to login!');
				// 	return response.end();					
				// }
				// Account exists (username and password match)
				// Create session variables
				request.session.account_loggedin = true;
				request.session.account_id = accounts[0].id;
				request.session.account_username = accounts[0].username;
				request.session.account_password = accounts[0].password;
				request.session.account_role = accounts[0].role;
				// If user selected the remember me option
				if (request.body.rememberme) {
					// Create cookie hash, will be used to check if user is logged in
					let hash = accounts[0].rememberme ? accounts[0].rememberme : cryptography.createHash('sha1').update(username + password + secret_key).digest('hex');
					// Num days until the cookie expires (user will log out)
					let days = 90;
					// Set the cookie
					response.cookie('rememberme', hash, { maxAge: 1000*60*60*24*days, httpOnly: true });
					// Update code in database
					connection.query('UPDATE accounts SET rememberme = ? WHERE username = ?', [hash, username]);
				}
				// Delete login attempts
				connection.query('DELETE FROM login_attempts WHERE ip_address = ?', [ip]);
				// Output success and redirect to home page
				response.send('success'); // do not change the message as the ajax code depends on it
				return response.end();
			} else {
				// Bruteforce
				if (settings['brute_force_protection'] == 'true') loginAttempts(ip);
				// Incorrect username/password
				response.send('Incorrect Username and/or Password!');
				return response.end();
			}
		});
	} else {
		// Bruteforce
		if (settings['brute_force_protection'] == 'true') loginAttempts(ip);
		// Incorrect username/password
		response.send('Incorrect Username and/or Password!');
		return response.end();
	}
}));
module.exports = app;