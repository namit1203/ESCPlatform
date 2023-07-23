const express = require('express');
const isLoggedin = require('../utils/isLoggedin');
const app = express();
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const fs = require('fs');
const connection = require('../Controller/dbContext');
const multer = require('multer');
const session = require('express-session');
const secret_key = 'your secret key';
app.use(session({
	secret: secret_key,
	resave: true,
	saveUninitialized: true
}));
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
app.get('/tournament/:id', (request, response) => {
   isLoggedin(request, settings => {
  const tournamentId = request.params.id;
  const accountId = request.session.account_id;

  // Retrieve tournament details from the database
  connection.query('SELECT * FROM tournament WHERE id = ?', [tournamentId], (error, tournaments) => {
    if (error || tournaments.length === 0) {
      response.redirect('/tournaments');
    } else {
      // Fetch user's teams from the database where the user is the captain
      const query = 'SELECT team.* FROM team JOIN accounts ON team.captain_id = accounts.id WHERE accounts.id = ?';
      connection.query(query, [accountId], (error, teams) => {
        if (error) {
          console.error('Error fetching user teams:', error);
          response.redirect('/tournaments');
        } else {
          // Query to calculate the total number of teams joined in the tournament
          const countQuery = 'SELECT COUNT(*) AS total_teams FROM tournament_teams WHERE tournament_id = ?';
          connection.query(countQuery, [tournamentId], (error, result) => {
            if (error) {
              console.error('Error calculating total teams:', error);
              response.redirect('/tournaments');
            } else {
              const totalTeamsJoined = result[0].total_teams || 0;
              response.render('tournament.html', { tournaments: tournaments, teams: teams, totalTeamsJoined: totalTeamsJoined });
            }
          });
        }
      });
    }
  });
}, () => {
  response.redirect('/'); // Redirect to the login page if not logged in
});
})

  
app.post('/join-tournament/:tournamentId', (request, response) => {
  isLoggedin(request, settings => {
    const userId = request.session.account_id;
    const tournamentId = request.params.tournamentId;
    const teamId = request.body.teamId;

    // Check if the user's team exists and is valid
    connection.query('SELECT * FROM Team WHERE id = ? AND captain_id = ?', [teamId, userId], (error, teams) => {
      if (error || teams.length === 0) {
        // Handle the error or invalid team case
        response.status(400).send('Invalid team');
        return;
      }

      // Check if the tournament exists and is valid
      connection.query('SELECT * FROM tournament WHERE id = ?', [tournamentId], (error, tournaments) => {
        if (error || tournaments.length === 0) {
          // Handle the error or invalid tournament case
          response.status(400).send('Invalid tournament');
          return;
        }

        // Check if the team has already joined the tournament
        connection.query('SELECT * FROM tournament_teams WHERE tournament_id = ? AND team_id = ?', [tournamentId, teamId], (error, joinedTeams) => {
          if (error) {
            // Handle the error case
            response.status(500).send('Internal Server Error');
            return;
          }

          if (joinedTeams.length > 0) {
            // The team has already joined the tournament
            const message = `Your team has already joined this tournament.`;
            const redirectUrl = '/';
            const alertScript = `<script>alert('${message}');window.location.href='${redirectUrl}';</script>`;
            response.send(alertScript);
            return;
          }

          // Get the total number of teams joined in the tournament
          connection.query('SELECT COUNT(*) AS total_joined_teams FROM tournament_teams WHERE tournament_id = ?', [tournamentId], (error, result) => {
            if (error) {
              // Handle the error case
              response.status(500).send('Internal Server Error');
              return;
            }

            const totalJoinedTeams = result[0].total_joined_teams;
            const maxTeamsAllowed = tournaments[0].total_team;

            if (totalJoinedTeams >= maxTeamsAllowed) {
              // The tournament is full of teams
              const message = `The tournament is already full of teams.`;
              const redirectUrl = '/';
              const alertScript = `<script>alert('${message}');window.location.href='${redirectUrl}';</script>`;
              response.send(alertScript);
              return;
            }

            // Add the team to the tournament by updating the tournament_teams table
            connection.query('INSERT INTO tournament_teams (tournament_id, team_id) VALUES (?, ?)', [tournamentId, teamId], (error) => {
              if (error) {
                // Handle the error case
                response.status(500).send('Internal Server Error');
                return;
              }

              const message = `Join Successfully`;
              const redirectUrl = '/';
              const alertScript = `<script>alert('${message}');window.location.href='${redirectUrl}';</script>`;
              response.send(alertScript);
            });
          });
        });
      });
    });
  }, () => {
    response.redirect('/'); // Redirect to the login page if not logged in
  });
});
// GET route to render the bracket HTML
app.get('/bracket/:id', (req, res) => {
  const tournamentId = req.params.id; // Get the tournament ID from the URL parameter

  // Fetch tournament match data from the database for the specified tournament ID
  const query = `
  SELECT tm.*, t1.team_name AS team1, t2.team_name AS team2, t1.score AS score1, t2.score AS score2
  FROM tournament_match tm
  INNER JOIN match_table t1 ON tm.match_id = t1.id
  INNER JOIN match_table t2 ON tm.match_id = t2.id
  WHERE tm.tournament_id = ?
`;


  connection.query(query, [tournamentId], (error, results) => {
    if (error) {
      console.error('Error fetching data from the database:', error);
      return res.status(500).send('An error occurred while fetching data from the database.');
    }

    // Get the total number of teams from the database
    const totalTeams = 16; // Replace this with the actual total_teams value fetched from your database

    // Process the results to construct the bracketData and fill missing teams with spaces
    const bracketData = processBracketData(results, totalTeams);

    // Render the bracket HTML with the bracketData
    res.render('bracket', { bracketData });
  });
});

// Function to process the fetched data and construct bracketData
function processBracketData(matches) {
  // Calculate the number of matches for each round
  const totalMatches = matches.length;

  // Calculate the number of teams based on the total number of matches
  let totalTeams = 1;
  while (totalTeams < totalMatches) {
    totalTeams *= 2;
  }

  // Add missing teams as spaces (if necessary)
  const missingTeams = totalTeams - matches.length;
  for (let i = 0; i < missingTeams; i++) {
    matches.push({ team1: ' ', score1: 0, team2: ' ', score2: 0 });
  }

  // Implement your logic here to construct the bracketData
  // For example, create an array of objects, where each object represents a match in the bracket

  return matches;
}


// Handle server errors
app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).send('500: Internal Server Error');
});

module.exports = app;
