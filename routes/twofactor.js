

const uuidv1 = require('uuid/v1');
const express = require('express');
const init = require('../utils/init')
const app = express();
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer');
const connection = require('../Controller/dbContext')
const nunjucks = require('nunjucks');
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
app.get('/twofactor', (request, response) => init(request, settings => {
	// Check if the tfa session variables are declared
	if (request.session.tfa_id && request.session.tfa_email) {
		// Generate a random unique ID
		let twofactorCode = uuidv1();
		// Get the twofactor email template
        console.log(twofactorCode)
		let twofactorTemplate = fs.readFileSync(path.join(__dirname, '../views/twofactor-email-template.html'), 'utf8').replaceAll('%code%', twofactorCode);
		// Change the below mail options
		let mailOptions = {
			from: settings['mail_from'], // "Your Name / Business name" <xxxxxx@gmail.com>
			to: request.session.tfa_email,
			subject: 'Your Access Code',
			text: twofactorTemplate.replace(/<\/?[^>]+(>|$)/g, ''),
			html: twofactorTemplate
		};
		// Update tfa code column in db
		connection.query('UPDATE accounts SET tfa_code = ? WHERE id = ?', [twofactorCode, request.session.tfa_id]);
		// Send tfa email
		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				return console.log(error);
			}
			console.log('Message %s sent: %s', info.messageId, info.response);
		});
		// Render twofactor template
		response.render('twofactor.html');	
	} else {
		// Redirect to login page
		response.redirect('/');
	}	
}));
// http://localhost:3000/twofactor - twofactor authentication
app.post('/twofactor', (request, response) => {
	// Check if the tfa session variables are declared
	if (request.session.tfa_id && request.session.tfa_email) {
		// Retrieve account info from database that's associated with the captured email
		connection.query('SELECT * FROM accounts WHERE id = ? AND email = ?', [request.session.tfa_id, request.session.tfa_email], (error, accounts) => {
			// Output msg
			let msg = '';
			// If accounts not empty
			if (accounts.length > 0) {
				// Check if user submitted the form
				if (request.body.code) {
					// Check if captured code and account code match
					if (request.body.code == accounts[0]['tfa_code']) {
						// Get client IP address
						let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
						// Update IP address in db
						connection.query('UPDATE accounts SET ip = ? WHERE id = ?', [ip, request.session.tfa_id]);
						// Authenticate the user
						request.session.account_loggedin = true;
						request.session.account_id = accounts[0].id;
						request.session.account_username = accounts[0].username;
						request.session.account_password = accounts[0].password;
						request.session.account_role = accounts[0].role;
						// Redirect to home page	
						return response.redirect('/home');					
					} else {
						msg = 'Incorrect email and/or code!';
					}
				}
			} else {
				msg = 'Incorrect email and/or code!';
			}
			// Render twofactor template
			response.render('twofactor.html', { msg: msg });	
		});
	} else {
		// Redirect to login page
		response.redirect('/');
	}
});
module.exports = app;