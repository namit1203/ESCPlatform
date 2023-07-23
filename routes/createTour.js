const express = require('express');
const isLoggedin = require('../utils/isLoggedin');
const app = express();
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const fs = require('fs');
const connection = require('../Controller/dbContext');
const multer = require('multer');
const {
  type
} = require('os');

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
app.use(bodyParser.urlencoded({
  extended: false
})); // Use bodyParser middleware

// Render the create team form
app.get('/createTour', (request, response) => {
  isLoggedin(request, settings => {
    console.log('ID:' + request.session.account_id);
    response.render('createTour.html', {});
  }, () => {
    response.redirect('/'); // Redirect to login page if not logged in
  });
});

app.post('/createTour', (request, response) => {
  upload.single('banner')(request, response, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      const errorMessage = 'The avatar file size exceeds the limit of 5MB.';
      const alertScript = `<script>alert('${errorMessage}');window.location.href='/createTeam';</script>`;
      return response.send(alertScript);
    }
    const type = request.body.type;
    const gameType = request.body.game_type;
    const name = request.body.name;
    const startDate = request.body.start_date;
    const endDate = request.body.end_date;
    const tournamentFormat = request.body.tournament_format;
    const totalTeam = request.body.total_team;
    let prize1 = parseInt(request.body.prize_1.replace(/\D/g, ''), 10);
    let prize2 = parseInt(request.body.prize_2.replace(/\D/g, ''), 10);
    let prize3 = parseInt(request.body.prize_3.replace(/\D/g, ''), 10);
    let prize4 = parseInt(request.body.prize_4.replace(/\D/g, ''), 10);

    const totalPrize = prize1 + prize2 + prize3 + prize4;

    const description = request.body.description;
    const checkinTime = request.body.checkin_time;
    let banner = null;
    if (request.file) {
      banner = request.file.buffer;
    }
    const query = 'INSERT INTO tournament (prize_total, total_team, name, type, game_type, start_date, end_date, tournament_format, description, prize_1, prize_2, prize_3, prize_4, checkin_time, creator_id, banner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(query, [totalPrize, totalTeam, name, type, gameType, startDate, endDate, tournamentFormat, description, prize1, prize2, prize3, prize4, checkinTime, request.session.account_id, banner], (error, results, fields) => {
      if (error) {
        console.error(error);
        console.log('ID:' + request.session.account_id);
        const errorMessage = 'An error occurred while creating tournament.';
        const alertScript = `<script>alert('${errorMessage}');window.location.href='/createTeam';</script>`;
        response.send(alertScript);
      } else {
        const message = `Tournament "${name}" has been added successfully, waiting for approve`;
        const redirectUrl = '/';
        const alertScript = `<script>alert('${message}');window.location.href='${redirectUrl}';</script>`;
        response.send(alertScript);
      }
    });
  });

});
module.exports = app;