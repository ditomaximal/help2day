/**
 * authentication setup for help2day APP
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

/**
 * sets up required basic modules
 */

var DB = require('../config/database').db;
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var CustomStrategy = require('passport-custom').Strategy;
var Model = require('../config/model');
var User = Model.User;
var mailer = require('nodemailer');
var configuration = require('../config/configuration');
var uuid = require('node-uuid');
var moment = require('moment');
var crypto = require('crypto');
var validator = require("email-validator");
var configAuth = require('./auth');
var grex = require('../app/helpers.js');


module.exports = function(passport,masterkey,mastersalt)
{

//  =========================================================================
//  passport session setup ==================================================
//  =========================================================================
//  required for persistent login sessions
//  passport needs ability to serialize and unserialize users out of session

    //  used to serialize the user for the session
    passport.serializeUser(function(user, done)
    {
        //console.log('serializeUser' + user);
        //console.log(user);
        done(null, user.us_id);
    });

    //  used to deserialize the user
    passport.deserializeUser(function(id, done)
    {

        var subQueryUserAll= 
            DB.knex('lm_user_category_value_map')
            .count('*')
            .join('lm_users', 'lm_user_category_value_map.ucam_user_id', 'lm_users.us_id' )
            .as('us_profile_count');
        
        var subQueryMessageCount= 
            DB.knex('lm_messaging')
            .where('lm_messaging.me_chat',1)
            .where('lm_messaging.me_read',0)
            .where('lm_messaging.me_user_id',id)
            .count('*')
            .as('us_message_count');

        
        //console.log ( 'DEBUG: user category count ' + JSON.stringify( subQueryUserAll.then() ) );
        
        DB.knex('lm_users')
        .select(['lm_users.*', subQueryUserAll, subQueryMessageCount])
       .where('lm_users.us_id', '=', id )
        .then(function(data)
        {
            var user = data[0];
            
            if (user === undefined)
            {
                console.log('INTRUSION: passport fetch did not find user with id ' + id );
                return done(null, false);
            }
            else
            {
                if ( user.us_email_encrypted ){
                    user.us_email= grex.decrypt(user.us_email_encrypted,mastersalt, masterkey);
                }

                if ( user.us_phone_encrypted ){
                    user.us_phone= grex.decrypt(user.us_phone_encrypted,mastersalt, masterkey);
                }
                
                user.us_pw= '*';
                
                if ( user.us_role == 'admin' )
                {
                    user.us_admin= 1;
                    user.us_mitarbeiter= 1;
                }
                else  if ( user.us_role == 'mitarbeiter' )
                {
                    user.us_mitarbeiter= 1;
                    user.us_admin= 0;
                }
                else
                {
                    user.us_mitarbeiter= 0;
                    user.us_admin= 0;
                }
                
                if ( ! user.us_email_encrypted  && ! user.us_facebook_id )
                {
                    user.us_is_registered= false;
                }
                else
                {
                    user.us_is_registered= true;
                }
                
                user.us_long= user.us_long || configuration.longitude;
                user.us_lat= user.us_lat || configuration.latitude;
                user.us_zoom= user.us_zoom || configuration.zoom;
                
                if ( !user.us_image_ref )
                    user.us_image_ref= "anonymous";
                
                //console.log('DEBUG: fetch did find user' + JSON.stringify ( user ) );
                
                return done(null, user);
            }
        })
        .catch(function(err) 
        {
            console.log('ERROR: fetch failed to load user ' + err );
            return done(null, false,
            {
                message : 'Ungültige eMail oder das Password ist falsch.'
            });

        });
    });

    
    
    
    
    
    
    
//  =========================================================================
//  LOCAL SIGNUP ============================================================
//  =========================================================================
//  we are using named strategies since we have one for login and one for
//  signup
//  by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy(
    {
        // by default, local strategy uses username and password, we will
        // override with email
        // source: http://passportjs.org/docs/username-password
        //
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
        // allows us to pass back the entire request to the callback
    }, 
    function(req, email, password, done)
    {
        var context= req.grex_context;
        var emailLower= email.toLowerCase();

        
        process.nextTick(function()
        {
            var email_encrypted= grex.encrypt ( emailLower, mastersalt, masterkey );
            
            //console.log('DEBUG: registering encrypted email ' + email_encrypted + ' from ' + emailLower );
            
            console.log('INFO: passport registration for new user' );

            DB.knex('lm_users')
            .where('lm_users.us_email_encrypted', '=', email_encrypted )
            //.orWhere('lm_users.us_email', '=', emailLower )
            .then(function(data)
            {
                var user = data[0];

                //console.log( JSON.stringify(user) );
                
                if ( user === undefined )
                {
                    //console.log('INFO: register did not find user with encoded email ' + emailLower + ' which is fine.');
                    
                    var uid= uuid.v4();
                    var salt= uuid.v4();
                    
                    
                    var hash = crypto.createHmac('sha512', salt); 
                    hash.update(password);
                    var password_hashed = hash.digest('hex');
                    
                    
                    new Model.User({'us_pw' : 'yonosee', 'us_pw_hashed' : password_hashed, 'us_uid':uid, 'us_salt': salt, 'us_nickname':'Kurzname (bitte ändere mich)' })
                    .save()
                    .then(function(new_user) 
                    {
                        //console.log('INFO: created new user %j' , new_user.toJSON() );
                        
                        // create confirmation message
                        
                        var key= uuid.v4();
                        new Model.Confirmation({'co_uid':uid,'co_email':email_encrypted,'co_key':key})
                        .save()
                        .then(function(confirmation)
                        {
                            var link= configuration.server_url + '/confirmation?key=' + key
                            
                            // send out confirmation mail

                            var mailData= { 'link': link };
                            
                            grex.sendMailByTemplateAsync ( mailData, 'confirmation', emailLower, configuration.internal_receivers_bcc, 'Bestätigung der eMail für help2day' );

                            return done(null, false, req.flash('signupMessage', 'Die Bestätigungsmail wurde gesendet. Bitte mit Hilfe des Links bestätigen und dann neu einloggen.'));
                        })
                        .catch(function(err)
                        {
                            console.log('ERROR: failed to setup confirmation' + err );
                            return done(null, false, req.flash('signupMessage', 'Die Bestätigungsmail konnte nicht gesendet werden.'));
                        });
                    })
                    .catch(function (err) 
                    {
                        console.log('ERROR: failed to create user ' + email_encrypted );
                        return done(null, false, req.flash('signupMessage', 'Der Benutzer konnte nicht angelegt werden.'));
                    });
                }
                else
                {
                    console.log('INFO: fetch did find email already taken ' + email_encrypted );
                    return done(null, false, req.flash('signupMessage', 'Diese eMail Adresse ist bereits vergeben.'));
                }
            });
        });
    }));

    
    
//  =========================================================================
//  LOCAL LOGIN =============================================================
//  =========================================================================
//  we are using named strategies since we have one for login and one for
//  signup
//  by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy(
    {
        // by default, local strategy uses username and password, we will
        // override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    }, 
    function(req, email, password, done)
    {
        var emailLower= email.toLowerCase();

        var email_encrypted= grex.encrypt ( emailLower, mastersalt, masterkey );
        
        console.log('DEBUG: encrypted email ' + email_encrypted );

        DB.knex('lm_users')
        .where('lm_users.us_email_encrypted', '=', email_encrypted )
        //.orWhere('lm_users.us_email', '=', emailLower )
        .then(function(data)
        {
            var user = data[0];
            
            if (user == undefined )
            {
                console.log('ERROR: failed to login locally with ' + emailLower );
                
                return done(null, false, req.flash('webappMessage', 'Die eMail und Password passen nicht zusammen.'));
            }
            else
            {
                console.log('INFO: passport local-login: id %d', user.us_id );
                
                // create hash of password
                var hash = crypto.createHmac('sha512', user.us_salt ); 
                hash.update(password);
                var password_hashed = hash.digest('hex');

                //console.log('DEBUG: comparing hashed passwords ' + user.us_pw_hashed + ' with ' + password_hashed );
                
                if ( password_hashed !== user.us_pw_hashed || !user.us_pw_hashed )
                {
                    return done(null, false, req.flash('webappMessage', 'Die eMail und Password passen nicht zusammen.'));
                }
                else
                {
                    return done(null, user);
                }
            }
        });
    }));
    
    
    passport.use('local-preregister', new CustomStrategy ( function(req, done) 
    {
        var uid= uuid.v4();
        var salt= uuid.v4();
        
        new Model.User(
        {
            'us_uid':uid, 
            'us_salt': salt,
            'us_date_created': moment().format('YYYY-MM-DD HH:mm:ss'),
            'us_nickname': 'anonymer Helfer' 
        })
        .save()
        .then(function(new_user) 
        {
            console.log('INFO: created new user %j' , new_user.toJSON() );
            done(null, new_user.toJSON() );
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to create user' + err );
            done(null, false, req.flash('signupMessage', 'Der Benutzer konnte nicht angelegt werden.'));
        });
    }));
    
    
    
    
    
    
    
    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy(
    {
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL
    },

    // facebook will send back the token and profile
    function(token, refreshToken, profile, done) 
    {
        var localProfile= profile;
        
        console.log('INFO: passport facebook-login: id %s', localProfile.id );

        // asynchronous
        process.nextTick(function() 
        {
            new Model.User (
            {
                'us_facebook_id' : localProfile.id
            })
            .fetch()
            .then(function(data)
            {
                // if the user is found, then log them in
                if (user) 
                {
                    var user= data.toJSON();
                    return done(null, user); // user found, return that user
                } 
                else 
                {
                    // if there is no user found with that facebook id, create them
                    var newUser= new User();

                    console.log('INFO: found facebook profile ' + JSON.stringify( localProfile ) );

                    // set all of the facebook information in our user model
                    newUser.us_facebook_id = localProfile.id; // set the users facebook id                   
                    newUser.us_facebook_token_shop = token; // we will save the token that facebook provides to the user                    
                    newUser.us_nickname  = localProfile.name.givenName + ' ' + localProfile.name.familyName; // look at the passport user profile to see how names are returned
                    newUser.us_uid= uuid.v4();
                    newUser.us_salt= uuid.v4();
                    
                    // save our user to the database
                    newUser.save() 
                    .then(function(new_user) 
                    { 
                        console.log('INFO: created new user %j via facebook ' , new_user.toJSON() );
                        return done(null, newUser.toJSON() );
                    })
                    .catch(function (err) 
                    {
                        console.log('ERROR: failed to create user ' + err );
                        return done(null, false);
                    });
                }
            })
            .catch(function (err) 
            {
                console.log('ERROR: failed to find user'+err);
                return done(null, false);
            });
        });
    }
    ));
    
};