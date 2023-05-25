const isLoggedin = require('../utils/isLoggedin');

const isAdmin = (request, callback, callback2) => {
	isLoggedin(request, () => {
		if (request.session.account_role == 'Admin') {
			callback();
		} else {
			callback2();
		}
	}, callback2);
};

module.exports = isAdmin;