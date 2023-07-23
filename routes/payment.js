// const axios = require('axios');
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


const env = nunjucks.configure('views', {
    autoescape: true,
    express: app
  });
  
  env.addFilter('formatNumber', num => String(num).replace(/(.)(?=(\d{3})+$)/g, '$1,'));
  env.addFilter('formatDateTime', date => (new Date(date).toISOString()).slice(0, -1).split('.')[0]);
  async function fetchJsonData() {
    try {
        const response = await fetch('https://api.sieuthicode.net/historyapimomov3/d83b387e-9f1b-400a-b00b-2b5a79e6c2d4');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('data',data.momoMsg.tranList);
        return data.momoMsg.tranList;
    } catch (error) {
        console.error('Error fetching data from the API:', error);
        return null;
    }
}

async function processJsonData() {
  const jsonData = await fetchJsonData();
  if (!jsonData) {
      res.status(500).json({
          status: false,
          message: 'Failed to fetch JSON data from the API'
      });
      return;
  }

  try {
      for (const item of jsonData) {
          const payment_id = item.ID;
          const amount = item.amount;

          const inputString = item.comment;
          const regex = /namit(\d+)/;
          const match = inputString.match(regex);

          if (match) {
              user_id = parseInt(match[1], 10);

              console.log('User ID:', user_id);
              console.log(user_id); // Output: the extracted number from the comment
          } else {
              console.log('No match found.');
              continue; // Skip this iteration and continue to the next one
          }

          // Insert data into payment table
          try {
              await insertIntoPayment(payment_id, amount, user_id);
          } catch (error) {
              if (error.code === 'ER_DUP_ENTRY') {
                  console.error('Duplicate entry error:', error.sqlMessage);
              } else {
                  throw error; // Re-throw other unexpected errors
              }
          }
      }

      console.log('Processing of JSON data completed.');
  } catch (error) {
      console.error('Error processing and inserting data:', error);
  }
}

// Call the function to start the processing
processJsonData();

async function selectBalance(user_id) {
  return new Promise((resolve, reject) => {
      connection.query('SELECT balance FROM accounts WHERE id = ?', [user_id], (error, current_amount) => {
          if (error) {
              reject(error);
          } else {
              resolve(current_amount[0] ? current_amount[0].balance : 0);
          }
      });
  });
}
async function insertIntoPayment(payment_id, amount, user_id) {
  try {
      // Check if the payment_id already exists in the payment table
      const checkDuplicateSql = 'SELECT COUNT(*) AS count FROM payment WHERE payment_id = ?';
      const [duplicateRows] = await connection.execute(checkDuplicateSql, [payment_id]);
      const duplicateCount = duplicateRows[0].count;

      if (duplicateCount > 0) {
          console.log(`Payment with payment_id '${payment_id}' already exists. Skipping insertion.`);
          return;
      }

      const current_balance = await selectBalance(user_id);
      const new_balance = current_balance + amount;

      const sql = 'INSERT INTO payment (payment_id, amount, user_id) VALUES (?, ?, ?)';
      const sql2 = 'UPDATE accounts SET balance = ? WHERE id = ?';

      await connection.execute(sql, [payment_id, amount, user_id]);
      await connection.execute(sql2, [new_balance, user_id]);

      console.log('Data inserted into payment table:', payment_id, amount, user_id);
  } catch (error) {
      console.error('Error inserting data into payment table:', error);
  }
}

// Define the endpoint to process JSON data and insert into the payment table
app.post('/processJsonData', async (req, res) => {
  try {
      await processJsonData();
      res.status(200).json({
          status: true,
          message: 'Data processing and insertion successful'
      });
  } catch (error) {
      console.error('Error processing and inserting data:', error);
      res.status(500).json({
          status: false,
          message: 'An error occurred during data processing and insertion'
      });
  }
});

// Define the endpoint to get payment data
app.get('/payment', async (req, res) => {
  const sql = 'SELECT * FROM payment';
  connection.query(sql, (error, results) => {
      if (error) {
          console.error('Error retrieving payment data:', error);
          res.status(500).json({
              status: false,
              message: 'Failed to retrieve payment data'
          });
      } else {
          res.status(200).json({
              status: true,
              data: results
          });
      }
  });
});

// Serve the HTML page
app.get('/payments', (request, response) => {
  isLoggedin(request, settings => {
    connection.query('SELECT * FROM accounts WHERE id = ?', [request.session.account_id], (error, accounts, fields) => {
		// Format the registered date
        
        console.log('id:',request.session.account_id)
        response.render('payment.html', { account: accounts[0], userId:request.session.account_id});
	});
   
  }, () => {
    response.redirect('/'); // Redirect to login page if not logged in
  });
});

module.exports = app;