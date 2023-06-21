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
app.get('/createTour', (request, response) => {
  isLoggedin(request, settings => {
    response.render('createTeam.html', {});
  }, () => {
    response.redirect('/'); // Redirect to login page if not logged in
  });
});
module.exports = app;
