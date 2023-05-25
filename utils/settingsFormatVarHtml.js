const settingsFormatVarHtml = (key, value) => {
	let html = '';
	let type = 'text';
	type = key == 'pass' ? 'password' : type;
	type = ['true', 'false'].includes(value.toLowerCase()) ? 'checkbox' : type;
	checked = value.toLowerCase() == 'true' ? ' checked' : '';
	html += '<label for="' + key + '">' + settingsFormatKey(key) + '</label>';
	if (type == 'checkbox') {
		html += '<input type="hidden" name="' + key + '" value="false">';
	}
	html += '<input type="' + type + '" name="' + key + '" id="' + key + '" value="' + value + '" placeholder="' + settingsFormatKey(key) + '"' + checked + '>';
	return html;
};
module.exports = settingsFormatVarHtml;