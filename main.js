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
	database: 'nodelogin1',
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
app.get('/logout', (request, response) => {
	// Destroy session data
	request.session.destroy();
	// Clear remember me cookie
	response.clearCookie('rememberme');
	// Redirect to login page
	response.redirect('/');
});
app.get('/home', (request, response) => isLoggedin(request, settings => {
	// Render home template
	response.render('home.html', { username: request.session.account_username, role: request.session.account_role });
}, () => {
	// Redirect to login page
	response.redirect('/');
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
app.post('/register', (request, response) => init(request, settings => {
	// Create variables and assign the POST data
	let username = request.body.username;
	let password = request.body.password;
	let cpassword = request.body.cpassword;
	let hashedPassword = cryptography.createHash('sha1').update(request.body.password).digest('hex');
	let email = request.body.email;
	let token = request.body.token;
	// Get client IP address
	let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
	// Default role
	let role = 'Member';
	// Ensure the captured token matches the session token (CSRF Protection)
	if (settings['csrf_protection'] == 'true' && token != request.session.token) {
		// Incorrect token
		response.send('Incorrect token provided!');
		return response.end();			
	}
	// Validate captcha if enabled
	if (settings['recaptcha'] == 'true') {
		if (!request.body['g-recaptcha-response']) {
			response.send('Invalid captcha!');
			return response.end();			
		} else {
			fetch('https://www.google.com/recaptcha/api/siteverify?response=' + request.body['g-recaptcha-response'] + '&secret=' + settings['recaptcha_secret_key']).then(res => res.json()).then(body => {
				if (body.success !== undefined && !body.success) {
					response.send('Invalid captcha!');
					return response.end();
				}
			});
		}
	}
	// Check if the POST data exists and not empty
	if (username && password && email) {
		// Check if account exists already in the accounts table based on the username or email
		connection.query('SELECT * FROM accounts WHERE username = ? OR email = ?', [username, email], (error, accounts, fields) => {
			// Check if account exists and validate input data
			if (accounts.length > 0) {
				response.send('Account already exists with that username and/or email!');
				response.end();
			} else if (!/\S+@\S+\.\S+/.test(email)) {
				response.send('Invalid email address!');
				response.end();
			} else if (!/[A-Za-z0-9]+/.test(username)) {
				response.send('Username must contain only characters and numbers!');
				response.end();
			} else if (password != cpassword) {
				response.send('Passwords do not match!');
				response.end();
			} else if (username.length < 5 || username.length > 20) {
				response.send('Username must be between 5 and 20 characters long!');
				response.end();
			} else if (password.length < 5 || password.length > 20) {
				response.send('Password must be between 5 and 20 characters long!');
				response.end();
			} else if (settings['account_activation'] == 'true') {
				// Generate a random unique ID
				let activationCode = uuidv1();
				// Change the below domain to your domain
				let activateLink = request.protocol + '://' + request.get('host') + '/activate/' + email + '/' + activationCode;
				// Get the activation email template
				let activationTemplate = fs.readFileSync(path.join(__dirname, 'views/activation-email-template.html'), 'utf8').replaceAll('%link%', activateLink);
				// Change the below mail options
		        let mailOptions = {
		            from: settings['mail_from'], // "Your Name / Business name" <xxxxxx@gmail.com>
		            to: email,
		            subject: 'Account Activation Required',
		            text: activationTemplate.replace(/<\/?[^>]+(>|$)/g, ''),
		            html: activationTemplate
		        };
				// Insert account with activation code
				connection.query('INSERT INTO accounts (username, password, email, activation_code, role, ip) VALUES (?, ?, ?, ?, ?, ?)', [username, hashedPassword, email, activationCode, role, ip], () => {
					// Send activation email
					transporter.sendMail(mailOptions, (error, info) => {
			            if (error) {
			                return console.log(error);
			            }
			            console.log('Message %s sent: %s', info.messageId, info.response);
			        });
					response.send('Please check your email to activate your account!');
					response.end();
				});
			} else {
				// Insert account
				connection.query('INSERT INTO accounts (username, password, email, activation_code, role, ip) VALUES (?, ?, ?, "activated", ?, ?)', [username, hashedPassword, email, role, ip], (error, result) => {
					// Registration success!
					if (settings['auto_login_after_register'] == 'true') {
						// Authenticate the user
						request.session.account_loggedin = true;
						request.session.account_id = result.insertId;
						request.session.account_username = username;
						request.session.account_password = hashedPassword;
						request.session.account_role = role;				
						response.send('autologin');
						response.end();						
					} else {
						response.send('You have registered! You can now login!');
						response.end();
					}
				});
			}
		});
	} else {
		// Form is not complete...
		response.send('Please complete the registration form!');
		response.end();
	}
}));
app.get('/profile', (request, response) => isLoggedin(request, settings => {
	// Get all the users account details so we can populate them on the profile page
	connection.query('SELECT * FROM accounts WHERE username = ?', [request.session.account_username], (error, accounts, fields) => {
		// Format the registered date
		accounts[0].registered = new Date(accounts[0].registered).toISOString().split('T')[0];
		// Render profile page
		response.render('profile.html', { account: accounts[0], role: request.session.account_role });
	});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

app.get('/createTeam', (request, response) => isLoggedin(request, settings => {	
		response.render('createTeam.html',{});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
// http://localhost:3000/edit_profile - displat the edit profile page
app.get('/edit_profile', (request, response) => isLoggedin(request, settings => {
	// Get all the users account details so we can populate them on the profile page
	connection.query('SELECT * FROM accounts WHERE username = ?', [request.session.account_username], (error, accounts, fields) => {
		// Format the registered date
		accounts[0].registered = new Date(accounts[0].registered).toISOString().split('T')[0];
		// Render profile page
		response.render('profile-edit.html', { account: accounts[0], role: request.session.account_role });
	});
}, () => {
	// Redirect to login page
	response.redirect('/');
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