// init.js
// Define the init function
const connection = require('C:\\Users\\Admin\\Documents\\SWP\\Controller\\dbContext.js');
function init(request, callback) {
    if (request.session.account_loggedin) {
      // Update last seen date
      let d = new Date();
      let now = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, -1).split('.')[0];
      connection.query('UPDATE accounts SET last_seen = ? WHERE id = ?', [now, request.session.account_id]);
    }
    connection.query('SELECT * FROM settings', (error, settings) => {
      if (error) throw error;
      let settings_obj = {};
      for (let i = 0; i < settings.length; i++) {
        settings_obj[settings[i].setting_key] = settings[i].setting_value;
      }
      callback(settings_obj);
    });
  }
  
  // Export the init function
  module.exports = init;
  