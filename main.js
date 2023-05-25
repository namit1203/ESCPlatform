// Include the dependencies
const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const { Console } = require('console');
const isLoggedin = require('./utils/isLoggedin')
const loginRoutes = require('./routes/login.js');
const logoutRouter = require('./routes/logout');
const registerRouter = require('./routes/register');
const forgotpasswordRouter = require('./routes/forgotpassword');
const resetpasswordRouter = require('./routes/resetpassword');
const createTeam = require('./routes/createTeam');
const profile = require('./routes/profile');
const admin = require('./routes/admin/admin');
const secret_key = 'your secret key';
// Update the below details with  MySQL connection details

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
app.use('/',createTeam);
app.use('/',forgotpasswordRouter);
app.use('/',resetpasswordRouter);
app.use('/',profile);
app.use('/',admin);
app.get('/home', (request, response) => isLoggedin(request, settings => {
	// Render home template
	response.render('home.html', { username: request.session.account_username, role: request.session.account_role });
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
app.listen(3000);