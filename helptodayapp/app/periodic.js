/**
 * application logic of help2day APP
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

/**
 * sets up required basic modules
 */
var DB = require('../config/database').db;
var crypto = require('crypto');
var config = require('../config/configuration.js');
var grex = require('../app/helpers.js');
var moment = require('moment');

var communication = require('../app/communication.js');


module.exports = function () {
    
    var module = {};
    
    module.encryptEmail= function ( masterkey, mastersalt ) {

        console.log('INFO: encrypting emails');

        DB.knex('lm_users')
        .select(['lm_users.us_id', 'lm_users.us_nickname', 'lm_users.us_email', 'lm_users.us_email_encrypted'])
        //.whereNull('lm_users.us_email_encrypted')
        .whereNotNull('lm_users.us_email' )
        .where('lm_users.us_dont_encrypt_email', 0 )
        .then(function(data) 
        {
            
            var unhashedUsers= data;
            
            for (var i=0; i < unhashedUsers.length; i++) 
            {
                var user= unhashedUsers[i];

                console.log('INFO: found user %j for update of email ' , JSON.stringify ( user ) );

                var email_encrypted= grex.encrypt ( user.us_email, mastersalt, masterkey );

                //console.log('INFO: found user ' , email_encrypted );
                
                DB.knex('lm_users')
                .update( {'us_email_encrypted' : email_encrypted } )
                .where('us_id', user.us_id)
                .then(function(){
                    
                });
            }
            
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find users ' + err );
        });
     };
    
    
    
    module.encryptPasswords= function ( masterkey, mastersalt ) {

        console.log('INFO: encrypt passwords');

        DB.knex('lm_users')
        .select(['lm_users.us_id', 'lm_users.us_nickname', 'lm_users.us_pw', 'lm_users.us_salt'])
        .whereNull('lm_users.us_pw_hashed')
        .whereNotNull('lm_users.us_pw')
        .then(function(data) 
        {
            var unhashedUsers= data;
            
            for (var i=0; i < unhashedUsers.length; i++) 
            {
                var user= unhashedUsers[i];

                console.log('INFO: found user %j for update of password ' , JSON.stringify (user) );

                var hash = crypto.createHmac('sha512', user.us_salt); 
                hash.update(user.us_pw);
                
                var password_hashed = hash.digest('hex');
                
                DB.knex('lm_users')
                .update( {'us_pw_hashed' : password_hashed } )
                .where('us_id', user.us_id)
                .then(function(){
                    
                	
                });
            }
            
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find users ' + err );
        });
     };

     module.dailyStatus= function () {
         console.log('INFO: daily status');
     };

     
     
    module.perHalfMinute= function (masterkey, mastersalt) {
        
        communication.communicationHandler (masterkey, mastersalt);
        
        //console.log('INFO: per minute cron job');
    };

    return module;
};
