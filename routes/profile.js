const uuidv1 = require('uuid/v1');
const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const connection = require('../Controller/dbContext')
const nunjucks = require('nunjucks');
const secret_key = 'your secret key';
const isLoggedin = require('../utils/isLoggedin')
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
// http://localhost:3000/edit_profile - update account details
app.post('/edit_profile', (request, response) => isLoggedin(request, settings => {
	// Create variables for easy access
	let username = request.body.username;
	let password = request.body.password;
	let cpassword = request.body.cpassword;
	let hashedPassword = cryptography.createHash('sha1').update(request.body.password).digest('hex');
	let email = request.body.email;
	let errorMsg = '';
	// Validation
	if (password != cpassword) {
		errorMsg = 'Passwords do not match!';
	} else if (!/\S+@\S+\.\S+/.test(email)) {
		errorMsg = 'Invalid email address!';
	} else if (!/[A-Za-z0-9]+/.test(username)) {
		errorMsg = 'Username must contain only characters and numbers!';
	} else if (password != cpassword) {
		errorMsg = 'Passwords do not match!';
	} else if (username.length < 5 || username.length > 20) {
		errorMsg = 'Username must be between 5 and 20 characters long!';
	} else if (password && password.length < 5 || password.length > 20) {
		errorMsg = 'Password must be between 5 and 20 characters long!';
	} else if (username && email) {
		// Get account details from database
		connection.query('SELECT * FROM accounts WHERE username = ?', [username], (error, accounts, fields) => {
			// Does the account require activation
			let requiresActivation = false;
			// Activation code
			let activationCode = 'activated';
			// Update the password
			hashedPassword = !password ? request.session.account_password : hashedPassword;
			// Check if account activation is required
			if (settings['account_activation'] == 'true' && accounts.length > 0 && accounts[0].email != email) {
				// Generate a random unique ID
				activationCode = uuidv1();
				// Change the below domain to your domain
				let activateLink = request.protocol + '://' + request.get('host') + '/activate/' + email + '/' + activationCode;
				// Change the below mail options
				let mailOptions = {
					from: '"Your Name / Business name" <xxxxxx@gmail.com>',
					to: email,
					subject: 'Account Activation Required',
					text: 'Please click the following link to activate your account: ' + activateLink,
					html: '<p>Please click the following link to activate your account: <a href="' + activateLink + '">' + activateLink + '</a></p>'
				};
				requiresActivation = true;
			}
			// Check if username exists
			if (accounts.length > 0 && username != request.session.account_username) {
				// Username exists
				response.render('profile-edit.html', { account: accounts[0], msg: 'Username already exists!', role: request.session.account_role });
			} else {
				// Update account with new details
				connection.query('UPDATE accounts SET username = ?, password = ?, email = ?, activation_code = ? WHERE username = ?', [username, hashedPassword, email, activationCode, request.session.account_username], () => {
					// Update session with new username
					request.session.account_username = username;
					// Output message
					let msg = 'Account Updated!';
					// Account activation required?
					if (requiresActivation) {
						// Send activation email
						transporter.sendMail(mailOptions, (error, info) => {
							if (error) {
								return console.log(error);
							}
							console.log('Message %s sent: %s', info.messageId, info.response);
						});
						// Update msg
						msg = 'You have changed your email address! You need to re-activate your account! You will be automatically logged-out.';	
						// Destroy session data
						request.session.destroy();					
					}
					// Get account details from database
					connection.query('SELECT * FROM accounts WHERE username = ?', [username], (error, accounts, fields) => {
						// Render edit profile page
						response.render('profile-edit.html', { account: accounts[0], msg: msg, role: request.session.account_role });
					});
				});
			}
		});
	}
	// Output error message if any
	if (errorMsg) {
		// Get account details from database
		connection.query('SELECT * FROM accounts WHERE username = ?', [username], (error, accounts, fields) => {
			// Render edit profile page
			response.render('profile-edit.html', { account: accounts[0], msg: errorMsg, role: request.session.account_role });
		});
	}
}));

module.exports = app;