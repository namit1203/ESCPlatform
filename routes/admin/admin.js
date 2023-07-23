const express = require('express');
const path = require('path');
const isAdmin = require('../../utils/isAdmin');
const getSettings = require('../../utils/getSetting');
const timeElapsedString = require('../../utils/timeElapsedString');
const settingsFormatForm = require('../../utils/settingsFormatForm');
const settingsFormatTabs = require('../../utils/settingFormattTab');		
const app = express();
const cryptography = require('crypto');
const nunjucks = require('nunjucks');
const fs = require('fs');	
const connection = require('../../Controller/dbContext');
const env = nunjucks.configure('views', {
    autoescape: true,
    express: app
});
env.addFilter('formatNumber', num => String(num).replace(/(.)(?=(\d{3})+$)/g,'$1,'));
env.addFilter('formatDateTime', date => (new Date(date).toISOString()).slice(0, -1).split('.')[0]); 
// http://localhost:3000/admin/ - Admin dashboard page
app.get('/admin/', (request, response) => isAdmin(request, settings => {
	// Retrieve statistical data
	connection.query('SELECT * FROM accounts WHERE cast(registered as DATE) = cast(now() as DATE) ORDER BY registered DESC; SELECT COUNT(*) AS total FROM accounts LIMIT 1; SELECT COUNT(*) AS total FROM accounts WHERE last_seen < date_sub(now(), interval 1 month) LIMIT 1; SELECT * FROM accounts WHERE last_seen > date_sub(now(), interval 1 day) ORDER BY last_seen DESC; SELECT COUNT(*) AS total FROM accounts WHERE last_seen > date_sub(now(), interval 1 month) LIMIT 1', (error, results, fields) => {
		// Render dashboard template
		response.render('admin/dashboard.html', { selected: 'dashboard', accounts: results[0], accounts_total: results[1][0], inactive_accounts: results[2][0], active_accounts: results[3], active_accounts2: results[4][0], timeElapsedString: timeElapsedString });
	});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

// http://localhost:3000/admin/accounts - Admin accounts page
app.get(['/admin/accounts', '/admin/accounts/:msg/:search/:status/:activation/:role/:order/:order_by/:page'], (request, response) => isAdmin(request, settings => {
	// Params validation
	let msg = request.params.msg == 'n0' ? '' : request.params.msg;
	let search = request.params.search == 'n0' ? '' : request.params.search;
	let status = request.params.status == 'n0' ? '' : request.params.status;
	let activation = request.params.activation == 'n0' ? '' : request.params.activation;
	let role = request.params.role == 'n0' ? '' : request.params.role;
	let order = request.params.order == 'DESC' ? 'DESC' : 'ASC';
	let order_by_whitelist = ['id','username','email','activation_code','role','registered','last_seen'];
	let order_by = order_by_whitelist.includes(request.params.order_by) ? request.params.order_by : 'id';
	// Number of accounts to show on each pagination page
	let results_per_page = 20;
	let page = request.params.page ? request.params.page : 1;
	let param1 = (page - 1) * results_per_page;
	let param2 = results_per_page;
	let param3 = '%' + search + '%';
	// SQL where clause
	let where = '';
	where += search ? 'WHERE (username LIKE ? OR email LIKE ?) ' : '';
	// Add filters
	if (status == 'active') {
		where += where ? 'AND last_seen > date_sub(now(), interval 1 month) ' : 'WHERE last_seen > date_sub(now(), interval 1 month) ';
	}
	if (status == 'inactive') {
		where += where ? 'AND last_seen < date_sub(now(), interval 1 month) ' : 'WHERE last_seen < date_sub(now(), interval 1 month) ';
	}
	if (activation == 'pending') {
		where += where ? 'AND activation_code != "activated" ' : 'WHERE activation_code != "activated" ';
	}
	if (role) {
		where += where ? 'AND role = ? ' : 'WHERE role = ? ';
	}
	// Params array and append specified params
	let params = [];
	if (search) {
		params.push(param3, param3);
	}
	if (role) {
		params.push(role);
	}
	// Fetch the total number of accounts
	connection.query('SELECT COUNT(*) AS total FROM accounts ' + where, params, (error, results) => {
		// Accounts total
		let accounts_total = results[0]['total'];
		// Append params to array
		params.push(param1, param2);
		// Retrieve all accounts from the database
		connection.query('SELECT * FROM accounts ' + where + ' ORDER BY ' + order_by + ' ' + order + ' LIMIT ?,?', params, (error, accounts) => {
			// Determine the URL
			let url = '/admin/accounts/n0/' + (search ? search : 'n0') + '/' + (status ? status : 'n0') + '/' + (activation ? activation : 'n0') + '/' + (role ? role : 'n0');
			// Determine message
			if (msg) {
				if (msg == 'msg1') {
					msg = 'Account created successfully!';
				} else if (msg == 'msg2') { 
					msg = 'Account updated successfully!';
				} else if (msg == 'msg3') {
					msg = 'Account deleted successfully!';
				}
			}
			// Render accounts template
			response.render('admin/accounts.html', { selected: 'accounts', selectedChild: 'view', accounts: accounts, accounts_total: accounts_total, msg: msg, page: parseInt(page), search: search, status: status, activation: activation, role: role, order: order, order_by: order_by, results_per_page: results_per_page, url: url, timeElapsedString: timeElapsedString, Math: Math });
		});
	});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

// http://localhost:3000/admin/account - Admin edit/create account
app.get(['/admin/account', '/admin/account/:id'], (request, response) => isAdmin(request, settings => {
	// Default page (Create/Edit)
    let page = request.params.id ? 'Edit' : 'Create';
	// Current date
	let d = new Date();
    // Default input account values
    let account = {
        'username': '',
        'password': '',
        'email': '',
        'activation_code': '',
        'rememberme': '',
        'role': 'Member',
		'registered': (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1).split('.')[0],
		'last_seen': (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1).split('.')[0]
    };
    let roles = ['Member', 'Admin'];
    // GET request ID exists, edit account
    if (request.params.id) {
		connection.query('SELECT * FROM accounts WHERE id = ?', [request.params.id], (error, accounts) => {
			account = accounts[0];
			response.render('admin/account.html', { selected: 'accounts', selectedChild: 'manage', page: page, roles: roles, account: account });
		});
	} else {
		response.render('admin/account.html', { selected: 'accounts', selectedChild: 'manage', page: page, roles: roles, account: account });
	}
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

// http://localhost:3000/admin/account - Admin edit/create account
app.post(['/admin/account', '/admin/account/:id'], (request, response) => isAdmin(request, settings => {
    // GET request ID exists, edit account
    if (request.params.id) {
        // Edit an existing account
        page = 'Edit'
        // Retrieve account by ID with the GET request ID
		connection.query('SELECT * FROM accounts WHERE id = ?', [request.params.id], (error, accounts) => {
			// If user submitted the form
			if (request.body.submit) {
				// update account
				let password = accounts[0]['password']
				// If password exists in POST request
				if (request.body.password) {
					password = cryptography.createHash('sha1').update(request.body.password).digest('hex');
				}
				// Update account details
				connection.query('UPDATE accounts SET username = ?, password = ?, email = ?, activation_code = ?, rememberme = ?, role = ?, registered = ?, last_seen = ? WHERE id = ?', [request.body.username, password, request.body.email, request.body.activation_code, request.body.rememberme, request.body.role, request.body.registered, request.body.last_seen, request.params.id]);
				// Redirect to admin accounts page
				response.redirect('/admin/accounts/msg2/n0/n0/n0/n0/ASC/id/1');
			} else if (request.body.delete) {
				// delete account
				response.redirect('/admin/account/delete/' + request.params.id);
			}
		});
	} else if (request.body.submit) {
		// Hash password
		let password = cryptography.createHash('sha1').update(request.body.password).digest('hex');
		// Create account
		connection.query('INSERT INTO accounts (username,password,email,activation_code,rememberme,role,registered,last_seen) VALUES (?,?,?,?,?,?,?,?)', [request.body.username, password, request.body.email, request.body.activation_code, request.body.rememberme, request.body.role, request.body.registered, request.body.last_seen]);
		// Redirect to admin accounts page
		response.redirect('/admin/accounts/msg1/n0/n0/n0/n0/ASC/id/1');
	}
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

// http://localhost:3000/admin/account/delete/:id - Delete account based on the ID param
app.get('/admin/account/delete/:id', (request, response) => isAdmin(request, settings => {
    // GET request ID exists, delete account
    if (request.params.id) {
		connection.query('DELETE FROM accounts WHERE id = ?', [request.params.id]);
		response.redirect('/admin/accounts/msg3/n0/n0/n0/n0/ASC/id/1');
	}
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
app.get(['/admin/tournaments', '/admin/tournaments/:msg/:search/:status/:activation/:order/:order_by/:page'], (request, response) => {
    // Params validation
    let msg = request.params.msg == 'n0' ? '' : request.params.msg;
    let search = request.params.search == 'n0' ? '' : request.params.search;
    let status = request.params.status == 'n0' ? '' : request.params.status;
    let activation = request.params.activation == 'n0' ? '' : request.params.activation;
    let order = request.params.order == 'DESC' ? 'DESC' : 'ASC';
    let order_by_whitelist = ['id', 'name', 'type', 'game_type', 'start_date', 'end_date', 'tournament_format', 'creator_id', 'total_team', 'description', 'prize_total', 'prize_1', 'prize_2', 'prize_3', 'prize_4'];
    let order_by = order_by_whitelist.includes(request.params.order_by) ? request.params.order_by : 'id';
    // Number of tournaments to show on each pagination page
    let results_per_page = 20;
    let page = request.params.page ? request.params.page : 1;
    let param1 = (page - 1) * results_per_page;
    let param2 = results_per_page;
    let param3 = '%' + search + '%';
    // SQL where clause
    let where = '';
    where += search ? 'WHERE (name LIKE ? OR game_type LIKE ?) ' : '';
    // Add filters
    if (status == 'active') {
        where += where ? 'AND end_date >= CURDATE() ' : 'WHERE end_date >= CURDATE() ';
    }
    if (status == 'inactive') {
        where += where ? 'AND end_date < CURDATE() ' : 'WHERE end_date < CURDATE() ';
    }
    if (activation == 'pending') {
        where += where ? 'AND approved = 0 ' : 'WHERE approved = 0 ';
    }
    // Params array and append specified params
    let params = [];
    if (search) {
        params.push(param3, param3);
    }
    // Fetch the total number of tournaments
    connection.query('SELECT COUNT(*) AS total FROM tournament ' + where, params, (error, results) => {
        // Tournaments total
        let tournaments_total = results[0]['total'];
        // Append params to array
        params.push(param1, param2);
        // Retrieve all tournaments from the database
        connection.query('SELECT * FROM tournament ' + where + ' ORDER BY ' + order_by + ' ' + order + ' LIMIT ?,?', params, (error, tournaments) => {
            // Determine the URL
            let url = '/admin/tournaments/n0/' + (search ? search : 'n0') + '/' + (status ? status : 'n0') + '/' + (activation ? activation : 'n0');
            // Determine message
            if (msg) {
                if (msg == 'msg1') {
                    msg = 'Tournament created successfully!';
                } else if (msg == 'msg2') { 
                    msg = 'Tournament updated successfully!';
                } else if (msg == 'msg3') {
                    msg = 'Tournament deleted successfully!';
                }
            }
            // Render tournaments template
            response.render('admin/tournaments.html', { selected: 'tournaments', tournaments: tournaments, tournaments_total: tournaments_total, msg: msg, page: parseInt(page), search: search, status: status, activation: activation, order: order, order_by: order_by, results_per_page: results_per_page, url: url });
        });
    });
});

app.get('/admin/tournament/:id', (request, response) => {
    let tournamentId = request.params.id;
    // Retrieve tournament details from the database
    connection.query('SELECT * FROM tournament WHERE id = ?', [tournamentId], (error, tournaments) => {
        if (error || tournaments.length === 0) {
            response.redirect('/admin/tournaments');
        } else {
            // Render tournament details template
            response.render('admin/tournament.html', { tournaments: tournaments });
        }
    });
});
app.get('/admin/tournament/approve/:id', (request, response) => {
    let tournamentId = request.params.id;
    // Update tournament approval status in the database
    connection.query('UPDATE tournament SET approved = 1 WHERE id = ?', [tournamentId], (error, results) => {
        if (error || results.affectedRows === 0) {
            response.redirect('/admin/tournaments');
        } else {
            // Send a notification to the user indicating successful approval
            response.send(`
                <script>
                    alert('Tournament already approved!');
                    window.location.href = '/admin/tournaments/';
                </script>
            `);
        }
    });
});




// http://localhost:3000/admin/roles - View accounts roles
app.get('/admin/roles', (request, response) => isAdmin(request, settings => {
	// Roles list
	let roles_list = ['Member', 'Admin'];
	// Select and group roles from the accounts table
    connection.query('SELECT role, COUNT(*) as total FROM accounts GROUP BY role; SELECT role, COUNT(*) as total FROM accounts WHERE last_seen > date_sub(now(), interval 1 month) GROUP BY role; SELECT role, COUNT(*) as total FROM accounts WHERE last_seen < date_sub(now(), interval 1 month) GROUP BY role', (error, roles) => {
		// Roles array
		let new_roles = {};
		// Update the structure
		for (const role in roles[0]) {
			new_roles[roles[0][role]['role']] = roles[0][role]['total'];
		}
		for (const role in roles_list) {
			if (!new_roles[roles_list[role]]) new_roles[roles_list[role]] = 0;
		}
		// Get the total number of active roles
		 let new_roles_active = {};
		for (const role in roles[1]) {
			new_roles_active[roles[1][role]['role']] = roles[1][role]['total'];
		}
		// Get the total number of inactive roles
		let new_roles_inactive = {};
		for (const role in roles[2]) {
			new_roles_inactive[roles[2][role]['role']] = roles[2][role]['total'];
		}
		// Render roles template
		response.render('admin/roles.html', { selected: 'roles', roles: new_roles, roles_active: new_roles_active, roles_inactive: new_roles_inactive });
	});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
app.get(['/admin/settings', '/admin/settings/:msg'], (request, response) => isAdmin(request, settings => {
	// Output message
	let msg = request.params.msg;
	// Determine message
	if (msg == 'msg1') {
		msg = 'Settings updated successfully!';
	} else {
		msg = '';
	}
	// Retrieve settings
	getSettings(settings => {
		// Render settings template
		response.render('admin/settings.html', { selected: 'settings', msg: msg, settings: settings, settingsFormatTabs: settingsFormatTabs, settingsFormatForm: settingsFormatForm });
	});
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

// http://localhost:3000/admin/settings - Update settings (POST)
app.post(['/admin/settings', '/admin/settings/:msg'], (request, response) => isAdmin(request, settings => {
	// Update settings
	for (let item in request.body) {
		let key = item;
		let value = request.body[item];
		if (value.includes('true')) {
			value = 'true';
		}
		connection.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
	}
	// Redirect and output message
	response.redirect('/admin/settings/msg1');
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
app.get(['/admin/emailtemplate', '/admin/emailtemplate/:msg'], (request, response) => isAdmin(request, settings => {
	// Output message
	let msg = request.params.msg;
	// Read template files
	const activation_email_template = fs.readFileSync(path.join(__dirname,'../../views/activation-email-template.html'), 'utf8');
	const twofactor_email_template = fs.readFileSync(path.join(__dirname,'../../views/twofactor-email-template.html'), 'utf8');
	// Determine message
	if (msg == 'msg1') {
		msg = 'Email templates updated successfully!';
	} else {
		msg = '';
	}
	// Render emails template
	response.render('admin/emailtemplates.html', { selected: 'emailtemplate', msg: msg, activation_email_template: activation_email_template, twofactor_email_template: twofactor_email_template });
}, () => {
	// Redirect to login page
	response.redirect('/');
}));

// http://localhost:3000/admin/emailtemplate - Update email templates (POST)
app.post(['/admin/emailtemplate', '/admin/emailtemplate/:msg'], (request, response) => isAdmin(request, settings => {
	// If form submitted
	if (request.body.activation_email_template && request.body.twofactor_email_template) {
		// Update the template files
		fs.writeFileSync(path.join(__dirname, '../../views/activation-email-template.html'), request.body.activation_email_template);
		fs.writeFileSync(path.join(__dirname, '../../views/twofactor-email-template.html'), request.body.twofactor_email_template);
		// Redirect and output message
		response.redirect('/admin/emailtemplate/msg1');
	}
}, () => {
	// Redirect to login page
	response.redirect('/');
}));
module.exports = app;