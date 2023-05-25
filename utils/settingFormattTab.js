// Format settings tabs
const settingsFormatTabs = tabs => {
	let html = '';
	html += '<div class="tabs">';
	html += '<a href="#" class="active">General</a>';
	for (let tab in tabs) {
		html += '<a href="#">' + tabs[tab] + '</a>';
	}
	html += '</div>';
	return html;
};

module.exports = settingsFormatTabs;