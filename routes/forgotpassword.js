
const uuidv1 = require('uuid/v1');
const express = require('express');
const session = require('express-session');
const init = require('../utils/init')
const app = express();
const nodemailer = require('nodemailer');
const connection = require('../Controller/dbContext')
const nunjucks = require('nunjucks');
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

app.get('/forgotpassword', (request, response) => {
	// Render forgot password template and output message
	response.render('forgotpassword.html');	
});
app.post('/forgotpassword', (request, response) => init(request, settings => {
	// Render activate template and output message
	if (request.body.email) {
		// Retrieve account info from database that's associated with the captured email
		connection.query('SELECT * FROM accounts WHERE email = ?', [request.body.email], (error, accounts) => {
			// If account exists
			if (accounts.length > 0) {
				// Generate a random unique ID
				let resetCode = uuidv1();
				// Change the below domain to your domain
				let resetLink = request.protocol + '://' + request.get('host') + '/resetpassword/' + request.body.email + '/' + resetCode;
				console.log(resetLink);
				// Change the below mail options
		        let mailOptions = {
		            from: settings['mail_from'], // "Your Name / Business name" <xxxxxx@gmail.com>
		            to: request.body.email,
		            subject: 'Password Reset',
		            text: 'Please click the following link to reset your password: ' + resetLink,
		            html: '<p>Please click the following link to reset your password: <a href="' + resetLink + '">' + resetLink + '</a></p>'
		        };
				// Update reset column in db
				connection.query('UPDATE accounts SET reset = ? WHERE email = ?', [resetCode, request.body.email]);
				// Send reset password email
				transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
						return console.log(error);
					}
					console.log('Message %s sent: %s', info.messageId, info.response);
				});
				// Render forgot password template
				response.render('forgotpassword.html', { msg: 'Reset password link has been sent to your email!' });
			} else {
				// Render forgot password template
				response.render('forgotpassword.html', { msg: 'An account with that email does not exist!' });	
			}
		});
	}
}));
module.exports = app;