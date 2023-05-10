// Include the dependencies
const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');
const nodemailer = require('nodemailer');
// const uuidv1 = require('uuid/v1');
const cookieParser = require('cookie-parser');
const cryptography = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const { Console } = require('console');
// npm install -g nodemon --save
// npm install nunjucks --save
// npm install express --save
// npm install express-session --save
// npm install mysql --save
// npm install nodemailer --save
// npm install uuid --save
// npm install node-fetch@2 --save
const secret_key = 'your secret key';
// Update the below details with  MySQL connection details
const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'root',
	database: 'nodelogin',
	multipleStatements: true
});
// Mail settings: Update the username and passowrd below to your email and pass, the current mail host is set to gmail, but you can change that if you want.
const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: 'escplatform.fpt@gmail.com',
		pass: 'fpt123456'
	}
});
const app = express();
// Configure nunjucks template engine
const env = nunjucks.configure('views', {
  	autoescape: true,
  	express: app
});
env.addFilter('formatNumber', num => String(num).replace(/(.)(?=(\d{3})+$)/g,'$1,'));
env.addFilter('formatDateTime', date => (new Date(date).toISOString()).slice(0, -1).split('.')[0]);
// Use sessions and other dependencies
app.use(session({
	secret: secret_key,
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(cookieParser());
app.use(bodyParser.json()); // Use the JSON middleware
app.use(bodyParser.urlencoded({ extended: false })); // Use bodyParser middleware
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
app.get('/register', (request, response) => isLoggedin(request, () => {
	// User is logged in, redirect to home page
	response.redirect('/home');
}, (settings) => {
	// Create CSRF token
	let token = cryptography.randomBytes(20).toString('hex');
	// Store token in session
	request.session.token = token;
	// User is not logged in, render login template
	response.render('register.html', { token: token, settings: settings });
}));
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
// Function init - check loggedin and retrieve settings
const init = (request, callback) => {
	if (request.session.account_loggedin) {
		// Update last seen date
		let d = new Date();
		let now = (new Date(d.getTime() - d.getTimezoneOffset()* 60000).toISOString()).slice(0, -1).split('.')[0];
		connection.query('UPDATE accounts SET last_seen = ? WHERE id = ?', [now, request.session.account_id]);
	}
	connection.query('SELECT * FROM settings', (error, settings) => {
		if (error) throw error;
		let settings_obj = {};
		for (let i = 0; i < settings.length; i++) {
			settings_obj[settings[i].setting_key] = settings[i].setting_value;
		}
		callback(settings_obj);
	});
};
app.listen(3000);