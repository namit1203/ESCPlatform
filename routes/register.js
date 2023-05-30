const express = require('express');
const fs = require('fs');
const nodemailer = require('nodemailer');
const uuidv1 = require('uuid/v1');
const init = require('../utils/init')
const isLoggedin = require('../utils/isLoggedin')
const app = express();
const path = require('path');
const connection = require('../Controller/dbContext')
const cryptography = require('crypto');
const nunjucks = require('nunjucks');
const cookieParser = require('cookie-parser');
const secret_key = 'your secret key';
const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: 'escplatform.fpt@gmail.com',
		pass: 'jzakrmpnhdvezhds' 
		// app password
	}
});
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
				let activationTemplate = fs.readFileSync(path.join(__dirname, '../views/activation-email-template.html'), 'utf8').replaceAll('%link%', activateLink);
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
module.exports = app;