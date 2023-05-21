const express = require('express');
const secret_key = 'your secret key';
const router = express.Router();
router.get('/logout', (request, response) => {
  // Destroy session data
  request.session.destroy();
  // Clear remember me cookie
  response.clearCookie('rememberme');
  // Redirect to login page
  response.redirect('/');
});

module.exports = router;