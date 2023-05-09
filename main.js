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
// Update the below details with your own MySQL connection details
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
		user: 'xxxxxx@xxxxxx.xxx',
		pass: 'xxxxxx'
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