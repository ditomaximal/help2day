var configuration = require('../config/configuration');

module.exports = {

    'facebookAuth' : {
        'clientID'      : ‘***’,                    // your fb ID
        'clientSecret'  : ‘***’,   // your fb Secret
        'callbackURL'   : configuration.server_url + '/auth/facebook/clbk'
    }
};