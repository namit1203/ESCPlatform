const settingsFormatKey = key => {
    key = key.toLowerCase().replaceAll('_', ' ').replace('url', 'URL').replace('db ', 'Database ').replace(' pass', ' Password').replace(' user', ' Username').replace(/\b\w/g, l => l.toUpperCase());
    return key;
};
module.exports = settingsFormatKey;