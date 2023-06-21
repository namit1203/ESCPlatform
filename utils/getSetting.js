
const connection = require('..\\Controller\\dbContext.js');
const getSettings = callback => {
	connection.query('SELECT * FROM settings ORDER BY id', (error, settings, fields) => {
		 let settings2 = {};
		for (let setting in settings) {
			settings2[settings[setting]['setting_key']] = { 'key': settings[setting]['setting_key'], 'value': settings[setting]['setting_value'], 'category': settings[setting]['category'] };
		}
		callback(settings2);	
	});
};
module.exports = getSettings;