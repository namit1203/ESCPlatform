const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nodelogin1'
});
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/images/teams');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({storage: storage});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.get('/createTeam', function(req, res) {
    res.sendFile(__dirname + '/views/createTeam.html');
});
app.post('/createTeam', upload.single('avatar'), (req, res) => {
    // Get form data from request body
    const teamName = req.body.teamName;
    const gameType = req.body.gameType;
    const contactType = req.body.contactType;
    const contactDetail = req.body.contactDetail;
    const country = req.body.country;
    const captainId = req.session.userId;
    const avatar = req.file?.filename || '';
  

    // Insert new team into MySQL database with the file path to image
    const sql = 'INSERT INTO Team (name, game_type, contact_type, contact_detail, location, captain_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [teamName, gameType, contactType, contactDetail, country, captainId, avatar];
    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting new team:', err);
            res.status(500).send('Error inserting new team into database.');
        } else {
            console.log(`New team created with ID ${result.insertId}`);
            res.redirect('/teams'); // Redirect to page showing all teams
        }
    });
});

// Start Express server
app.listen(3001, () => {
    console.log('Server is running on port 3001.');
});