const settingsFormatForm = settings => {
	let html = '';
	html += '<div class="tab-content active">';
	let category = '';
	for (let setting in settings) {
		if (category != '' && category != settings[setting]['category']) {
			html += '</div><div class="tab-content">';
		}
		category = settings[setting]['category'];
		html += settingsFormatVarHtml(settings[setting]['key'], settings[setting]['value']);
	}
	html += '</div>';
	return html;
};
module.exports = settingsFormatForm;