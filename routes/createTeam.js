const express = require('express');
const isLoggedin = require('../utils/isLoggedin');
const app = express();
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const fs = require('fs');
const connection = require('../Controller/dbContext');
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024
  }, // 5 MB limit
});

const env = nunjucks.configure('views', {
  autoescape: true,
  express: app
});

env.addFilter('formatNumber', num => String(num).replace(/(.)(?=(\d{3})+$)/g, '$1,'));
env.addFilter('formatDateTime', date => (new Date(date).toISOString()).slice(0, -1).split('.')[0]);

app.use(bodyParser.json()); // Use the JSON middleware
app.use(bodyParser.urlencoded({ extended: false })); // Use bodyParser middleware

// Render the create team form
app.get('/createTeam', (request, response) => {
  isLoggedin(request, settings => {
    response.render('createTeam.html', {});
  }, () => {
    response.redirect('/'); // Redirect to login page if not logged in
  });
});
// Insert a new team with avatar
app.post('/createTeam', (request, response) => {
  upload.single('avatar')(request, response, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      const errorMessage = 'The avatar file size exceeds the limit of 5MB.';
      const alertScript = `<script>alert('${errorMessage}');window.location.href='/createTeam';</script>`;
      return response.send(alertScript);
    }

    const name = request.body.teamName;
    const game_type = request.body.gameType;
    const contact_type = request.body.contactType;
    const contact_detail = request.body.contactDetail;
    const location = request.body.location;

    let avatar = null;
    if (request.file) {
      avatar = request.file.buffer;
    }

    const query = 'INSERT INTO Team (name, game_type, contact_type, contact_detail, location, captain_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(query, [name, game_type, contact_type, contact_detail, location, request.session.account_id, avatar], (error, results, fields) => {
      if (error) {
        console.error(error);
        console.log('ID:' + request.session.account_id);
        const errorMessage = 'An error occurred while creating the team.';
        const alertScript = `<script>alert('${errorMessage}');window.location.href='/createTeam';</script>`;
        response.send(alertScript);
      } else {
        const message = `Team "${name}" has been added successfully.`;
        const redirectUrl = '/';
        const alertScript = `<script>alert('${message}');window.location.href='${redirectUrl}';</script>`;
        response.send(alertScript);
      }
    });
  });
});



// Example additional routes
app.get('/teams', (request, response) => {
  connection.query('SELECT * FROM Team', (error, results, fields) => {
    if (error) {
      console.error(error);
    } else {
      response.render('teams.html', { teams: results });
    }
  });
});

app.get('/team/:id', (request, response) => {
  const teamId = request.params.id;
  connection.query('SELECT * FROM Team WHERE id = ?', [teamId], (error, results, fields) => {
    if (error) {
      console.error(error);
    } else {
      response.render('team.html', { team: results[0] });
    }
  });
});

// Handle server errors
app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).send('500: Internal Server Error');
});

module.exports = app;
