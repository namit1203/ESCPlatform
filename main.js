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
const createTour = require('./routes/createTour');
const profile = require('./routes/profile');
const tournament = require('./routes/tournament');
const admin = require('./routes/admin/admin');
const twofactor = require('./routes/twofactor');
const payment = require('./routes/payment')
const secret_key = 'your secret key';
const connection = require('./Controller/dbContext');
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
app.use('/',createTour);
app.use('/',forgotpasswordRouter);
app.use('/',resetpasswordRouter);
app.use('/',profile);
app.use('/',admin);
app.use('/',twofactor);
app.use('/',tournament);
app.use('/',payment);
app.get('/home', (request, response) => {
    // Fetch approved tournaments
    connection.query('SELECT * FROM tournament WHERE approved = 1', (error, tournaments) => {
        console.log('ID1:' + request.session.account_id);
        if (error) {
            // Handle the error appropriately
            console.error(error);
            response.status(500).send('Internal Server Error');
            return;
        }

        // Fetch top users with approved tournaments and total tournament count
        connection.query('SELECT accounts.username, COUNT(tournament.id) AS tournament_count FROM accounts JOIN tournament ON accounts.id = tournament.creator_id WHERE tournament.approved = 1 GROUP BY accounts.id ORDER BY tournament_count DESC LIMIT 10', (error, users) => {
            if (error) {
                // Handle the error appropriately
                console.error(error);
                response.status(500).send('Internal Server Error');
                return;
            }

            // Render the home template with the fetched data
            response.render('home.html', { approved_tournaments: tournaments, top_users: users });
        });
    });
});

app.get('/uploads/:id', (request, response) => {
    const id = request.params.id;
    connection.query('SELECT banner FROM tournament WHERE id = ?', [id], (error, results) => {
        // console.log('img:' + request.params.id);
        console.log('ID:' + request.session.account_id);
        if (error) {
            console.error(error);
            response.status(500).send('Internal Server Error');
            return;
        }

        if (results.length === 0 || !results[0].banner) {
            response.status(404).send('Image not found');
            return;
        }

        // Set the appropriate Content-Type based on your image type
        response.set('Content-Type', 'image/jpeg');
        response.send(results[0].banner);
    });
});

app.get('/team', (request, response) => {
    const accountId = request.session.account_id;
  
      connection.query('SELECT * FROM team WHERE captain_id = ?', [accountId], (error, teams) => {
        if (error) {
          console.error('Error fetching user teams:', error);
          response.redirect('/tournaments');
        } else {
          console.log('accountId:', accountId);
          response.render('tournament.html', { teams: teams });
        }
      });
    });
app.use((req, res, next) => {
	const error = new Error('Not Found');
	error.status = 404;
	next(error);
  });
  
  app.use((err, req, res, next) => {
	if (err.status === 404) {
		res.status(404).sendFile(__dirname + '/views/404.html');
	} else {
	  res.status(err.status || 500);
	  res.send('Internal Server Error');
	}
  });

  
  
  app.listen(80, () => {
    console.log(`Example app listening on 80`)
  })