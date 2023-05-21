// Include the dependencies
const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');
const nodemailer = require('nodemailer');
const uuidv1 = require('uuid/v1');
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
const init = require('./utils/init')
const isLoggedin = require('./utils/isLoggedin')
const connection = require('./Controller/dbContext')
const loginRoutes = require('./routes/login.js');
const logoutRouter = require('./routes/logout');
const registerRouter = require('./routes/register');
const secret_key = 'your secret key';
// Update the below details with  MySQL connection details
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});
// Mail settings: Update the username and passowrd below to your email and pass, the current mail host is set to gmail, but you can change that if you want.

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
app.use('/', loginRoutes);
app.use('/', logoutRouter);
app.use('/',registerRouter);
app.get('/home', (request, response) => isLoggedin(request, settings => {
	// Render home template
	response.render('home.html', { username: request.session.account_username, role: request.session.account_role });
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
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
app.get('/createTeam', (request, response) => isLoggedin(request, settings => {	
		response.render('createTeam.html',{});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
// Insert a new team with avatar
app.post('/createTeam', upload.single('avatar'), (request, response) => {
	// Get data from request body
	const name = request.body.teamName;
	const game_type = request.body.gameType;
	const contact_type = request.body.contactType;
	const contact_detail = request.body.contactDetail;
	const location = request.body.location;
	// const captain_id = req.session.account_id;
	// Handle avatar
	let avatar = null;
	if (request.file) {
	  avatar = request.file.buffer;
	}
  
	// Insert new team into database
	const query = 'INSERT INTO Team (name, game_type, contact_type, contact_detail, location, captain_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
	connection.query(query, [name, game_type, contact_type, contact_detail, location, request.session.account_id, avatar], (error, results, fields) => {
	  if (error) {
		console.error(error);
		console.log('ID:'+request.session.account_id)
		return response.status(500).send({ success: false, message: 'Failed to add team to database.' });
	  }
	  return response.send({ success: true, message: 'Team has been added to database.' });
	});
  });
// http://localhost:3000/edit_profile - displat the edit profile page

// const isLoggedin = (request, callback, callback2) => {
// 	// Check if the loggedin param exists in session
// 	init(request, settings => {
// 		if (request.session.account_loggedin) {
// 			return callback !== undefined ? callback(settings) : false;
// 		} else if (request.cookies.rememberme) {
// 			// if the remember me cookie exists check if an account has the same value in the database
// 			connection.query('SELECT * FROM accounts WHERE rememberme = ?', [request.cookies.rememberme], (error, accounts, fields) => {
// 				if (accounts.length > 0) {
// 					request.session.account_loggedin = true;
// 					request.session.account_id = accounts[0].id;
// 					request.session.account_username = accounts[0].username;
// 					request.session.account_role = accounts[0].role;
// 					request.session.account_password = accounts[0].password;
// 					return callback !== undefined ? callback(settings) : false;
// 				} else {
// 					return callback2 !== undefined ? callback2(settings) : false;
// 				}
// 			});
// 		} else {
// 			return callback2 !== undefined ? callback2(settings) : false;
// 		}
// 	});
// };
// // Function init - check loggedin and retrieve settings
// const init = (request, callback) => {
// 	if (request.session.account_loggedin) {
// 		// Update last seen date
// 		let d = new Date();
// 		let now = (new Date(d.getTime() - d.getTimezoneOffset()* 60000).toISOString()).slice(0, -1).split('.')[0];
// 		connection.query('UPDATE accounts SET last_seen = ? WHERE id = ?', [now, request.session.account_id]);
// 	}
// 	connection.query('SELECT * FROM settings', (error, settings) => {
// 		if (error) throw error;
// 		let settings_obj = {};
// 		for (let i = 0; i < settings.length; i++) {
// 			settings_obj[settings[i].setting_key] = settings[i].setting_value;
// 		}
// 		callback(settings_obj);
// 	});
// };
app.listen(3000);