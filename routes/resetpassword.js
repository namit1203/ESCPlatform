const express = require('express');
const app = express();
const cryptography = require('crypto');
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const connection = require('../Controller/dbContext')
const env = nunjucks.configure('views', {
    autoescape: true,
    express: app
});
env.addFilter('formatNumber', num => String(num).replace(/(.)(?=(\d{3})+$)/g,'$1,'));
env.addFilter('formatDateTime', date => (new Date(date).toISOString()).slice(0, -1).split('.')[0]);
app.get('/resetpassword/:email/:code', (request, response) => {
	// Make sure the params are specified
	if (request.params.email && request.params.code) {
		// Retrieve account info from database that's associated with the captured email
		connection.query('SELECT * FROM accounts WHERE email = ? AND reset = ?', [request.params.email, request.params.code], (error, accounts) => {
			// Check if account exists
			if (accounts.length > 0) {
				// Render forgot password template
				response.render('resetpassword.html', { email: request.params.email, code: request.params.code });	
			} else {
				response.send('Incorrect email and/or code provided!');
				response.end();						
			}
		});
	} else {
		response.send('No email and/or code provided!');
		response.end();		
	}
});
app.post('/resetpassword/:email/:code', (request, response) => {
	// Make sure the params are specified
	if (request.params.email && request.params.code) {
		// Retrieve account info from database that's associated with the captured email
		connection.query('SELECT * FROM accounts WHERE email = ? AND reset = ?', [request.params.email, request.params.code], (error, accounts) => {
			// Check if account exists
			if (accounts.length > 0) {
				// Output msg
				let msg = '';
				// Check if user submitted the form
				if (request.body.npassword && request.body.cpassword) {
					// Validation
					if (request.body.npassword != request.body.cpassword) {
						msg = 'Passwords do not match!';
					} else if (request.body.npassword.length < 5 || request.body.npassword.length > 20) {
						msg = 'Password must be between 5 and 20 characters long!';
					} else {
						// Success! Update password
						msg = 'Your password has been reset! You can now <a href="/">login</a>!';
						// Hash password
						let hashedPassword = cryptography.createHash('sha1').update(request.body.npassword).digest('hex');
						// Update password
						connection.query('UPDATE accounts SET password = ?, reset = "" WHERE email = ?', [hashedPassword, request.params.email]);
					}
					// Render reset password template
					response.render('resetpassword.html', { msg: msg, email: request.params.email, code: request.params.code });
				} else {
					msg = 'Password fields must not be empty!';
					// Render reset password template
					response.render('resetpassword.html', { msg: msg, email: request.params.email, code: request.params.code });
				}	
			} else {
				response.send('Incorrect email and/or code provided!');
				response.end();						
			}
		});
	} else {
		response.send('No email and/or code provided!');
		response.end();		
	}
});

module.exports = app;