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
var Model = require('../config/model');
var moment = require('moment');
var config = require('../config/configuration.js');
const fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var mailer = require('nodemailer');
var grex = require('../app/helpers.js');
var truncate = require('truncate');

var multer = require('multer');
var upload = multer({ dest: '/files' })
var path = require('path');


// https://tonicdev.com/npm/anytime



// app/webapp.js
module.exports = function(app, passport,masterkey,mastersalt)
{
    
/**
 * 
 * ROOT PAGE
 * 
 */    
    
    app.get('/', function(req, res)
    {
        //console.log('webapp main page with user ' + req.user );
        
        res.redirect('/hilfsanfragen');
    });

    app.get('/contact', function(req, res)
    {
        res.render('webapp_contact');
    });
    
    app.get('/opensource', function(req, res)
    {
        res.render('webapp_opensource');
    });
    
    app.get('/help', function(req, res)
    {
        res.render('webapp_help');
    });
    
    app.get('/imprint', function(req, res)
    {
        res.render('webapp_imprint');
    });
    
    app.get('/dataprotection', function(req, res)
    {
        res.render('webapp_dataprotection');
    });
    
    app.get('/tutorial', function(req, res)
    {
        var tutorialId= req.query.id || '1';
        
        if ( tutorialId < 1 || tutorialId > 3 )
            tutorialId= 1;
        
        var view= 'webapp_tutorial' + tutorialId;
        res.render(view);
    });

    
    
    
    /**
     * 
     * LOGIN
     * 
     */    
    app.get('/login', function(req, res)
    {
        //console.log('login get route' + req);
        
        // render the page and pass in any flash data if it exists
        res.render('webapp_login',
        {
            message : req.flash('webappMessage')
        });
    });
    
    // process the login form
    app.post('/login', passport.authenticate('local-login',
    {
        successRedirect : '/', // redirect to the secure profile
        // section
        failureRedirect : '/login', // redirect back to the signup page if there
        // is an error
        failureFlash : true
    // allow flash messages
    }));

    
    // process the login form
    app.get('/preregister', 
            passport.authenticate('local-preregister'), 
            function(req, res) 
            {
                var id= req.query.pri_id;
                var count= req.query.pr_gift_units_per_count || '1';
                
                //console.log('preregister id ' + JSON.stringify ( req.query ) );
                
                if ( id )
                    res.redirect('/redir/preagree_static?pri_id=' + id + '&pr_gift_units_per_count=' + count );
                else
                    res.redirect('/');
            }
    );
    
    
    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res)
    {
        // render the page and pass in any flash data if it exists
        res.render('webapp_signup',
        {
            message : req.flash('signupMessage')
        });
    });
    
    
    
    // process the signup form
    // process the signup form
    app.post('/signup', passport.authenticate('local-signup',
    {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true
    }));

    
    
    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' } ) );

    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/clbk',
        passport.authenticate('facebook', 
        {
            successRedirect : '/',
            failureRedirect : '/login'
        }));

    
    
    // =====================================
    // CONFIRMATION ========================
    // =====================================
    app.get('/confirmation', function(req, res)
    {
        var key = req.query.key;

        new Model.Confirmation({'co_key':key})
        .fetch() 
        .then(function(confirmation)
        {
            //console.log('found confirmation record %j' , confirmation.toJSON() );
            //console.log('found confirmation user uid ' , confirmation.get('co_uid') );

            new Model.User(
            {
                'us_uid' : confirmation.get('co_uid')
            })
            .fetch()
            .then(function(new_user)
            {
                var confirmationEmailEncrypted= confirmation.get('co_email');
                
                new_user.save(
                {
                    us_email: '', /** checked */
                    us_email_encrypted: confirmationEmailEncrypted 
                })
                .then(function()
                {
                    req.flash ('loginMessage', 'Die eMail wurde bestätigt, bitte jetzt mit der eMail und Password einloggen.' );
                    res.render('webapp_login',
                    {
                        message : req.flash('loginMessage')
                    });
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to read confirmation record' + err );
            req.flash('signupMessage', 'Die eMail Adresse konnte nicht bestätigt werden.');
            res.render('webapp_signup',
            {
                message : req.flash('signupMessage')
            });
        });
    });
    
    
    
    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res)
    {
        req.logout();
        res.redirect('/');
    });
    
    
    
    
    
    // =====================================
    // RESET  ==============================
    // =====================================
    app.get('/forgot', function(req, res) 
    {
        res.render('webapp_forgot', 
        {
          message : req.flash('signupMessage')
        });
    });
    
    app.post('/forgot', function(req, res, next) 
    {
        var emailLower= req.body.email.toLowerCase();
        var email_encrypted= grex.encrypt ( emailLower, mastersalt, masterkey );

        console.log('INFO: resetting password for user ' );
        
        async.waterfall([
          function(done) 
          {
            crypto.randomBytes ( 22, function(err, buf) 
            {
              var token = buf.toString('hex');
              done(err, token);
            });
          },
          function(token, done) 
          {
              console.log('INFO: storing user with reset token ' + token );
              
              new Model.User({'us_email_encrypted': email_encrypted })
              .fetch()
              .then(function(user)
              {
                  if (!user) 
                  {
                    req.flash('signupMessage', 'Es ist leider kein Account mit dieser eMail vorhanden.');
                    return res.redirect('/forgot');
                  }
    
                  user.save(
                  {
                      us_reset_password_token: token,
                      us_reset_password_expires: moment().add( 1, 'hours' ).format('YYYY-MM-DD HH:mm:ss')
                  })
                  .then(function()
                  {
                      var userObject= user.toJSON();
                      
                      //console.log('stored user with reset token ' + token );
                      done ( null, token, userObject );
                  });
              });
          },
          function ( token, user, done) 
          {
              console.log('INFO: sending reset mail to user ' + user.us_id + ' with token ' + token );
              
              var link= config.server_url + '/reset?token=' + token;
              
              
              var mailData= { 'link': link };
              
              grex.sendMailByTemplateAsync ( mailData, 'reset', emailLower, configuration.internal_receivers_bcc, 'help2day Password Reset' );
              
              console.log("INFO: succeeded to send confirmation mail to " + user.us_id );
              
              req.flash('signupMessage', 'Die Reset eMail wurde an ' + mail.to + ' gesendet. Bitte dem Link in der eMail folgen und dann das Password zurücksetzen.');
              res.redirect('/forgot');
          }
        ], 
        function(err) 
        {
            console.log("INFO: finished resetting password procedure " + err );
            if (err) 
                return next(err);
          
          
            res.redirect('/forgot');
        });
    });
    
    app.get('/reset', function(req, res) 
    {
        console.log("INFO: get reset password with token " + req.query.token );
        
        // TODO: add timeout check here
        
        new Model.User({'us_reset_password_token': req.query.token })
        .fetch()
        .then(function(user)
        {
            if (!user) 
            {
              req.flash('signupMessage', 'Der Link wurde bereits verwendet. Für eine Änderung des Passwords bitte nochmal eine eMail anfordern.');
              return res.redirect('/forgot');
            }

            var userObject= user.toJSON();
            res.render('webapp_reset', 
            {
               user: userObject,
               token: req.query.token
            });
        });
    });
    
    app.post('/reset', function(req, res) 
    {
        console.log("INFO: post reset password with token " + req.query.token );
        
        async.waterfall([
          function(done) 
          {
              // TODO: add timeout check here
              
              new Model.User({'us_reset_password_token': req.query.token })
              .fetch()
              .then(function(user)
              {
                  if (!user) 
                  {
                      console.log("INTRUSION: post reset password failed to find token " + req.query.token );
                      
                      req.flash('signupMessage', 'Der Link wurde bereits verwendet. Für eine Änderung des Passwords bitte nochmal eine eMail anfordern.');
                      
                      return res.redirect('/forgot');
                  }
                  var userObject= user.toJSON();

                  console.log('INFO: update of user ' + user.us_id + ' with token ' + req.query.token );
                  
                  var password= req.body.us_pw;
                  var hash = crypto.createHmac('sha512', userObject.us_salt ); 
                  hash.update(password);
                  var password_hashed = hash.digest('hex');
                  
                  user.save(
                  {
                      us_pw: '',
                      us_pw_hashed: password_hashed,
                      us_reset_password_token: undefined,
                      us_reset_password_expires: undefined
                  })
                  .then(function()
                  {
                      done ( null, userObject );
                  });
              });
          },
          function(user, done) 
          {
              var emailLower= user.us_email.toLowerCase();

              console.log('INFO: sending reset confirmation mail to user ' + user.us_id );
              
              
              grex.sendMailByTemplateAsync ( mailData, 'resetconfirmation', emailLower, configuration.internal_receivers_bcc, 'help2day Password Reset' );

              console.log("INFO: succeeded to send confirmation mail to " + user.us_id );
              req.flash('signupMessage', 'Die Reset Bestätigungs eMail wurde an ' + mail.to + ' gesendet.');
              res.redirect('/login');
          }
        ], 
        
        function(err) 
        {
          res.redirect('/login');
        });
    });

    
    
    
    
    // =====================================
    // FEEDBACK SECTION ====================
    // =====================================
    
    
    app.get('/feedback', isWebappLoggedIn, function(req, res)
    {
        res.render('webapp_feedback',
        {
            message : req.flash('webappMessage'),
            user : req.user
        });
    });

    app.post('/feedback', function(req, res)
    {
        var localDetail= req.body.details;
        var localIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        console.log('found feedback ' + JSON.stringify(req.body) )

        DB.knex('lm_feedback')
        .insert(
        {
            fe_details:localDetail,
            fe_use:req.body.use,
            fe_ip:localIP,
            fe_user_id:req.user.us_id,
            fe_how:req.body.how
        })
        .then(function(current_tickets) 
        {
            req.flash ('webappMessage', 'Danke für dein Feedback. Damit schaffen wir es, help2day besser zu machen.' );
            res.redirect('/');
        })
        .catch(function (err) 
        {
            console.log('failed to find tickets ' + err );
            webappWithError ( req, res, err, 'Die Statusdaten konnten nicht geladen werden.' );
        });
        
    });

    
    
    
    // =====================================
    // SETTINGS SECTION =====================
    // =====================================
    
    app.get('/status', isWebappLoggedIn, function(req, res)
    {
        var localUser= null;

        DB.knex('lm_gift')
        .join('lm_promotion','lm_promotion.pr_id','lm_gift.gi_promotion_id')
        .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
        .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        .join('lm_promotion_instance','lm_promotion_instance.pi_id','lm_promotion.pr_instance_id')
        //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
        //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
        .where('gi_user_id', req.user.us_id )
        .orderBy('gi_end_time', 'desc')
        .limit(40)        
        .select()
        .then(function(current_tickets) 
        {
            //console.log('current tickets found ' + JSON.stringify(current_tickets) )
            
            for (var i=0; i < current_tickets.length; i++) 
            {
                var ticket= current_tickets[i];
                prepareTicket ( ticket );
            }
            
            res.render('webapp_status',
            {
                message : req.flash('webappMessage'),
                user : req.user,
                current_tickets : current_tickets
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find tickets ' + err );
            webappWithError ( req, res, err, 'Die Statusdaten konnten nicht geladen werden.' );
        });
    });

    
    
    app.get('/user/about', function(req, res)
    {
        var localUserId= req.query.us_id || req.user.us_id;
            
        DB.knex('lm_users')
        .where('us_id', '=', localUserId )
        .then(function(data) 
        {
            var localUser= data[0];

            if ( !localUser.us_image_ref ){
                localUser.us_image_ref= 'anonymous';
            }
            
            
            console.log('DEBUG: localUser found ' + JSON.stringify(localUser) )
            
            res.render('webapp_user_about',
            {
                user : req.user,
                other : localUser
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
            webappWithError ( req, res, err, 'Die Userdaten konnten nicht geladen werden.' );
        });
    });
    
    
    
    
    app.get('/settings', isWebappLoggedIn, function(req, res)
    {
        var open= req.query.open || req.user.us_settings_open || '0';

        console.log('DEBUG: GET settings with open ' + open )
        
        DB.knex('lm_users')
        .select(['lm_users.us_id', 'lm_category_value_name.*','lm_users.us_lat_radius','lm_users.us_long_radius'])
        .join('lm_user_category_value_map', 'lm_user_category_value_map.ucam_user_id', 'lm_users.us_id' )
        .join('lm_category_value_name', 'lm_category_value_name.cavn_category_value_id', 'lm_user_category_value_map.ucam_category_value_id' )
        .where('us_id', '=', req.user.us_id )
        .then(function(data) 
        {
            var localProfile= data;
            
            req.user.us_radius_km= grex.getDistanceFromLatLonInKm ( 0, 0, 0, Math.max ( req.user.us_lat_radius, req.user.us_long_radius ) ).toFixed(1);
            
            //console.log ( 'DEBUG: found profile ' + JSON.stringify(localProfile) );
            
            res.render('webapp_settings',
            {
                user : req.user,
                open : open,
                profile : localProfile
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find user ' + err );
            webappWithError ( req, res, err, 'Die Userdaten konnten nicht geladen werden.' );
        });
    });

    
    app.get('/settings/location', isWebappLoggedIn, function(req, res)
    {
        DB.knex('lm_users')
        .select(['lm_users.*'])
        .where('us_id', '=', req.user.us_id )
        .then(function(data) 
        {
            var localProfile= data[0];
            
            //console.log('DEBUG: localUser found ' + JSON.stringify(localProfile) )
            
            res.render('webapp_user_location',
            {
                user : req.user,
                profile : localProfile
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
            webappWithError ( req, res, err, 'Die Userdaten konnten nicht geladen werden.' );
        });
    });
    
    app.post('/settings/location', isWebappLoggedIn, function(req, res)
    {
        var us_long= req.body.us_long || req.user.us_long;
        var us_lat= req.body.us_lat || req.user.us_lat;
        var us_long_radius= req.body.us_long_radius || req.user.us_long_radius;
        var us_lat_radius= req.body.us_lat_radius || req.user.us_lat_radius;

        console.log('DEBUG: location found ' + JSON.stringify(req.body) )
        
        var maxDistanceKM= grex.getDistanceFromLatLonInKm ( 0, 0, 0, Math.max ( us_lat_radius, us_long_radius ) ).toFixed(3);
        console.log('DEBUG: settings location found ' + us_long + ', ' + us_lat + ', ' + us_long_radius + ', ' + us_lat_radius + ' maxDistanceKM ' + maxDistanceKM );
        
        DB.knex('lm_users')
        .update({ 
            us_long: us_long,
            us_lat: us_lat,
            us_long_radius: us_long_radius,
            us_lat_radius: us_lat_radius
        })
        .where('us_id', '=', req.user.us_id )
        .then(function(data) 
        {
            res.redirect( '/settings?open=7' );
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
        });
    });
    
    
    
    
    app.post('/settings', isWebappLoggedIn, function(req, res)
    {
        var open= req.body.open || req.user.us_settings_open;
        
        //console.log('DEBUG: POST settings with open ' + open )
        //TODO var phoneUtil = require('google-libphonenumber').phoneUtil;
        // https://www.sitepoint.com/working-phone-numbers-javascript/
        
        var phone= req.body.us_phone;
        var phoneEncrypted= grex.encrypt ( phone, mastersalt, masterkey );
        
        
        DB.knex('lm_users')
        .update({ 
            us_nickname: req.body.us_nickname,
            us_about_me: req.body.us_about_me,
            us_phone_encrypted: phoneEncrypted,
            us_allow_sms_notification: (req.body.us_allow_sms_notification=='on')?1:0,
            us_allow_email_notification: (req.body.us_allow_email_notification=='on')?1:0,
            us_settings_open: open
        })
        .where('lm_users.us_id', '=', req.user.us_id )
        .then(function(data) 
        {
            var cavIDFormMap= [];
            var idFormMapCount= 0;
            
            
            for (i = 0; i < config.maxProfileID; i++) { 

                var key= 'cbox' + i;
                if ( key in req.body ){
                    cavIDFormMap[idFormMapCount++]= i;
                }
            }
            console.log('DEBUG: found form map ' + JSON.stringify(cavIDFormMap) );

            
            DB.knex('lm_user_category_value_map')
            .del()
            .where( 'lm_user_category_value_map.ucam_user_id', req.user.us_id )
            .then(function(){
            
                /**
                 * add map is form map minus user map
                 */
                var insertMap=[];
                var insertMapCount= 0;
                
                for (var i=0; i < cavIDFormMap.length; i++) 
                {
                    var valueID= cavIDFormMap[i];

                    var record={};
                    record.ucam_user_id= req.user.us_id;
                    record.ucam_category_value_id= valueID;
                        
                    insertMap[insertMapCount++]= record;
                }
                console.log('DEBUG: found add values ' + JSON.stringify(insertMap) );
                
                DB.knex('lm_user_category_value_map')
                .insert( insertMap )
                .then(function(){
                    
                    res.redirect('/hilfsanfragen');
                    
                });
            });
            
            
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to store user profile image ' + err );
            webappWithError ( req, res, err, 'Die Einstellungen konnten nicht gespeichert werden.' );
        });
    });
    

    
    
    app.post( '/settings/profileimage', upload.single('us_image_ref'), isWebappLoggedIn, function(req, res, next) 
    {
        console.log('INFO: uploaded user image file ' + JSON.stringify(req.file) + ' for user ' + req.user.us_id );
        
        if ( req.file && req.user.us_id) 
        {
            compressAndResize( req.file, function(){
                
                var localUser= req.user;

                DB.knex('lm_users')
                .update({ us_image_ref : req.file.filename } )
                .where('lm_users.us_id', '=', localUser.us_id )
                .then(function(data) 
                {
                    res.redirect('/settings');
                })
                .catch(function (err) 
                {
                    console.log('ERROR: failed to store user profile image ' + err );
                    webappWithError ( req, res, err, 'Die Einstellungen konnten nicht gespeichert werden.' );
                });
            });
        }
        else
        {
            console.log('ERROR: failed to store user profile image ' );
            webappWithError ( req, res, null, 'Die Einstellungen konnten nicht gespeichert werden.' );
        }
    });
    
    
    app.post('/user/sorting', isWebappLoggedIn, function(req, res)
    {
        var sorting= req.query.us_sorting || req.body.us_sorting || 0;

        console.log('DEBUG: user sorting found ' + JSON.stringify(sorting) )
        
        
        DB.knex('lm_users')
        .update('lm_users.us_sorted', sorting )
        .where('us_id', '=', req.user.us_id )
        .then(function(data) 
        {
            //console.log('DEBUG: user sorted found ' + JSON.stringify(data) )
            
            res.json({us_sorting:sorting});
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
        });
    });
    
    
    
    
    
    app.get('/user/profile', isWebappLoggedIn, function(req, res)
    {
        DB.knex('lm_users')
        .select(['lm_users.us_id', 'lm_category_value_name.*'])
        .join('lm_user_category_value_map', 'lm_user_category_value_map.ucam_user_id', 'lm_users.us_id' )
        .join('lm_category_value_name', 'lm_category_value_name.cavn_category_value_id', 'lm_user_category_value_map.ucam_category_value_id' )
        .where('us_id', '=', req.user.us_id )
        .then(function(data) 
        {
            var localProfile= data;
            
            console.log('DEBUG: localUser found ' + JSON.stringify(localProfile) )
            
            res.render('webapp_user_profile',
            {
                user : req.user,
                profile : localProfile
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
            webappWithError ( req, res, err, 'Die Userdaten konnten nicht geladen werden.' );
        });
    });
    
    
    
    app.post( '/user/profile', isWebappLoggedIn, function(req, res, next) 
    {
        console.log('DEBUG: found form data ' + JSON.stringify(req.body) );

        var cavIDFormMap= [];
        var cavIDUserMap= [];
        var cavIDDeleteMap= [];
        var cavIDAddMap= [];
        
        var idFormMapCount= 0;
        var idUserMapCount= 0;
        var idDeleteMapCount= 0;
        var idAddMapCount= 0;

        for (i = 0; i < config.maxProfileID; i++) { 

            var key= 'cbox' + i;
            if ( key in req.body ){
                cavIDFormMap[idFormMapCount++]= i;
            }
        }
        console.log('DEBUG: found form map ' + JSON.stringify(cavIDFormMap) );

        
        
        /**
         * load general map of category values
         */
        DB.knex('lm_category_value')
        .then(function(data){
            
            console.log('DEBUG: found category values ' + JSON.stringify(data) );

            
            /**
             * load user map of category values
             */
            DB.knex('lm_user_category_value_map')
            .where('lm_user_category_value_map.ucam_user_id', req.user.us_id )
            .then(function(data){
                
                var userCategoryValues= data;
                console.log('DEBUG: found user values ' + JSON.stringify(userCategoryValues) );

                /**
                 * delete map is user map minus form map
                 */
                for (var i=0; i < userCategoryValues.length; i++) 
                {
                    var value= userCategoryValues[i];
                    var valueID= value.ucam_category_value_id;

                    cavIDUserMap[idUserMapCount++]= valueID;
                    if ( cavIDFormMap.indexOf(valueID) < 0 ){
                        cavIDDeleteMap[idDeleteMapCount++]= valueID;
                        
                    }
                }
                console.log('DEBUG: found delete values ' + JSON.stringify(cavIDDeleteMap) );

                
                DB.knex('lm_user_category_value_map')
                .del()
                .where( 'lm_user_category_value_map.ucam_user_id', req.user.us_id )
                .whereIn( 'lm_user_category_value_map.ucam_category_value_id', cavIDDeleteMap )
                .then(function(){
                    
                    /**
                     * add map is form map minus user map
                     */
                    var insertMap=[];
                    var insertMapCount= 0;
                    
                    for (var i=0; i < cavIDFormMap.length; i++) 
                    {
                        var valueID= cavIDFormMap[i];

                        if ( cavIDUserMap.indexOf(valueID) < 0 ){
                            cavIDAddMap[idAddMapCount++]= valueID;
                            
                            var record={};
                            record.ucam_user_id= req.user.us_id;
                            record.ucam_category_value_id= valueID;
                            
                            insertMap[insertMapCount++]= record;
                        }
                    }
                    console.log('DEBUG: found add values ' + JSON.stringify(cavIDAddMap) );
                    
                    DB.knex('lm_user_category_value_map')
                    .insert( insertMap )
                    .then(function(){
                        
                        res.redirect('/settings');
                        
                    });
                });
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user profile ' + err );
            webappWithError ( req, res, err, 'Die Userdaten konnten nicht geladen werden.' );
        });
    });
    
    
    // =====================================
    // NGO SECTION =========================
    // =====================================
    
    app.get('/ngos', function(req, res)    {
        var limit = req.query.limit || '200';

        
        DB.knex('lm_customer')
        .where('lm_customer.cu_default_category', config.strict_category )
        .where('lm_customer.cu_validated','=',1)
        .orderBy('lm_customer.cu_id', 'asc')
        .limit(limit)        
        .then(function(data) 
        {
            var ngos= data;
            
            res.render('webapp_ngos',
            {
                ngos : ngos,
                user : req.user
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find ngos ' + err );
            webappWithError ( req,  res, err, 'Die Liste der NGOs konnte nicht geladen werden.' );
        });
    });
    
    app.get('/ngo', function(req, res)    {
        
        var cu_id= req.query.cu_id;
        
        DB.knex('lm_customer')
        .where('lm_customer.cu_id', cu_id )
        .where('lm_customer.cu_validated','=',1)
        .then(function(data) 
        {
            var ngo= data[0];
            
            
            DB.knex('lm_like')
            .join('lm_users', 'lm_users.us_uid', '=', 'lm_like.li_user')
            .where('lm_like.li_is_deactivated','=',0)
            .where('lm_users.us_customer_id','=', cu_id )
            .where('lm_like.li_strict_category', config.strict_category )
            .orderBy('li_date_created', 'desc')
            .then(function(data) {
               
                var hotspots= data;
                res.render('webapp_ngo',
                {
                    ngo : ngo,
                    hotspots: hotspots,
                    user : req.user
                });
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find ngos ' + err );
            webappWithError ( req,  res, err, 'Die Liste der NGOs konnte nicht geladen werden.' );
        });
    });
    
    
    
    // =====================================
    // HOTSPOTS SECTION =====================
    // =====================================
    
    app.get('/list', function(req, res)
    {
        var limit = req.query.limit || '100';

        
        //console.log('loading latest hotspots for webapp' );

        
        DB.knex('lm_like')
        .join('lm_users', 'lm_users.us_uid', '=', 'lm_like.li_user')
        .where('lm_like.li_strict_category', config.strict_category )
        .where('lm_like.li_is_deactivated','=',0)
        .orderBy('li_date_created', 'desc')
        .limit(limit)        
        .select( 'lm_like.*', 'lm_users.us_nickname' )
        .then(function(hotspots) 
        {
            //console.log('keex found ' + JSON.stringify(hotspots) )
            //console.log('found hotspots %j' , hotspots.toJSON() );
            res.render('webapp_list',
            {
                hotspots : hotspots,
                user : req.user
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspots ' + err );
            webappWithError ( req,  res, err, 'Die Hotspotliste konnte nicht geladen werden.' );
        });
    });

    app.get('/hotspot', function(req, res)
    {
        var hotspotId = req.query.li_id;
        var userEmailEncrypted= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        //console.log('loading webapp hotspot with id ' + hotspotId );

        DB.knex('lm_like')
        .where('lm_like.li_id', hotspotId )
        .then(function(data) 
        {
            var hotspot= data[0];
            //console.log('found hotspot ' + JSON.stringify ( hotspot ) );
            
            DB.knex('lm_promotion')
            .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
            .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
            //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
            //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
            .where('pr_instance_id', '<>', 0 )
            .where('lm_like.li_id', '=', hotspotId )
            .andWhere( DB.knex.raw( 'pr_current_count < pr_gift_count AND pr_end_time > now()' ) )
            .orderBy('pr_end_time', 'desc')
            .then(function(data)
            {
                var promotions= data;
                //console.log('found promotions on hotspot ' + JSON.stringify ( promotions ) );
                
                DB.knex('lm_recipients')
                .select('lm_recipients.re_customer_id')
                .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
                .then(function(recipient)
                {
                    //console.log('keex found ' + JSON.stringify(recipient) )
                    
                    
                    for (var i=0; i < promotions.length; i++) 
                    {
                        var ticket= promotions[i];
                        preparePromotion ( ticket, recipient );
                    }
                    
                    DB.knex('lm_like')
                    .where('li_id', '=', hotspotId )
                    .update({
                        'li_view_count': DB.knex.raw('li_view_count + 1')
                    })
                    .then(function() 
                    {
                        DB.knex('lm_like')
                        .where('lm_like.li_id',hotspotId )
                        .then(function(data) 
                        {
                            var hotspot= data[0];
                            
                            //console.log('rendering hotspot ' + JSON.stringify ( hotspot ) );

                            res.render('webapp_hotspot',
                            {
                                message : req.flash('webappMessage'),
                                hotspot : hotspot,
                                promotions : promotions,
                                user : req.user
                            });
                        });
                    });
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspot ' + err );
            webappWithError ( req,  res, err, 'Der Hotspot konnte nicht geladen werden.' );
        });
    });
    
    
    
    app.get('/hotspot/like', isWebappLoggedIn, function(req, res)
    {
        var hotspotId = req.query.li_id;
        var localUserUID= req.user.us_uid;
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        //console.log('liking webapp hotspot with id ' + hotspotId + " by uid " + localUserUID );

        // check reagree
        DB.knex('lm_agree')
        .whereRaw('ag_user = ? AND ag_like_id = ? AND ag_date > date_sub(NOW(), INTERVAL ? SECOND)', [localUserUID,hotspotId,config.GREX_CONFIG_REAGREE_BLOCK_SECONDS])
        .then(function(data) 
        {
            //console.log('found resent agree' + JSON.stringify(data) );
            
            if ( data[0] )
            {
                var agree= data[0];
                var blocking_time= moment ( agree.ag_date ).add ( config.GREX_CONFIG_REAGREE_BLOCK_SECONDS, 's' );
                
                //console.log('agree time    ' + JSON.stringify(agree.ag_date) );
                //console.log('blocking time ' + JSON.stringify(blocking_time) );
                //console.log('now time      ' + JSON.stringify(moment()) );
                
                var blocking_time_string= moment().locale('de').to(blocking_time, true) || '';
                
                new Model.Hotspot({ 'li_id': hotspotId }).fetch()
                .then(function(hotspot) 
                {
                    return res.redirect('/hotspot?li_id=' + hotspotId,
                    {
                        message : 'Eine weiter Zustimmung ist noch ' + blocking_time_string + ' blockiert.',
                        hotspot : hotspot.toJSON()
                    });
                });
            }
            else
            {
                //console.log( 'adding agree ' + hotspotId );
                
                // add agree record
                new Model.Agree({ ag_long:0,ag_lat:0,ag_agree:1,ag_comment:'',ag_user:localUserUID,ag_ip:ip,ag_like_id:hotspotId,ag_hwref:'webapp'})
                .save().then(function(hotspot){})
                .catch(function (err) { console.log('failed to safe agree ' + err ); });
                
                
                // update agree counters
                DB.knex('lm_like')
                .where('li_id', '=', hotspotId )
                .update({
                    'li_agree': DB.knex.raw('li_agree + 1'),
                    'li_agree_short': DB.knex.raw('li_agree_short + 1'),
                    'li_vitality': DB.knex.raw('li_vitality + 1')
                })
                .then(function() 
                {
                    new Model.Hotspot({ 'li_id': hotspotId }).fetch()
                    .then(function(hotspot) 
                    {
                        res.redirect('/hotspot?li_id=' + hotspotId );
                    });
                })
                .catch(function (err) 
                {
                    console.log('failed to find hotspot ' + err );
                    webappWithError ( req,  res, err, 'Der Hotspot konnte nicht geladen werden.' );
                });
            }
        });
    });
    
    
    // =====================================
    // PROMOTIONS MAP  =====================
    // =====================================

    app.get('/map', isWebappLoggedIn, function(req, res)
    {
        res.render('webapp_map',
        {
            user : req.user
        });
    });

    
    // parameters:
    // longitude (decimal)
    // latitude (decimal)
    // range (km)
    app.get('/map/data', function(req, res)
    {
        var limit = req.query.limit || '42';
        var longitude = req.query.longitude || config.longitude;
        var latitude = req.query.latitude || config.latitude;
        var zoom = req.query.range || config.zoom;

        //console.log('DEBUG: loading promotions at ' + longitude + ',' + latitude + ',' + zoom );
        
        DB.knex('lm_like')
        .leftJoin('lm_promotion','lm_promotion.pr_like_id','lm_like.li_id')
        .where('lm_like.li_strict_category', config.strict_category )
        .where('pr_instance_id', '<>', 0 )
        .where( DB.knex.raw( 'lm_promotion.pr_current_count < lm_promotion.pr_gift_count AND lm_promotion.pr_end_time > now()' ) )
        .count('lm_promotion.pr_id as pr_count')
        .groupBy('lm_like.li_id')
        .select('lm_like.*')
        .then(function(promotions)
        {
            //console.log('found promotions on hotspot ' + JSON.stringify ( promotions ) );
            
            DB.knex('lm_users')
            .where('us_id', '=', req.user.us_id )
            .update({
                'us_lat' : latitude,
                'us_long' : longitude,
                'us_zoom' : zoom
            })
            .then(function() 
            {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(promotions));
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspot ' + err );
        });
    });
    
    
    
    
    
            
            

    
    
    
    
    
    
    
    
    
    
    // =====================================
    // PROMOTIONS SECTION =====================
    // =====================================
    
    
    app.get('/api/hilfsanfragen', function(req, res)
    {
        var limit = req.query.limit || '10';
        
        DB.knex('lm_promotion')
        .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
        .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        .join('lm_promotion_instance','lm_promotion_instance.pi_id','lm_promotion.pr_instance_id')
        //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
        //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
        .where('pr_instance_id', '<>', 0 )
        .andWhere( DB.knex.raw( 'pr_current_count < pr_gift_count AND pr_end_time > now()' ) )
        .orderBy('pr_end_time', 'asc')
        .limit(limit)        
        .select()
        .then(function(data) 
        {
            var promotions= data;
            
            //console.log('found ' + JSON.stringify(promotions) )
            
            for (var i=0; i < promotions.length; i++) 
            {
                var ticket= promotions[i];
                preparePromotion ( ticket, undefined );
            }
            
            res.render('iframe_promotions',
            {
                promotions : promotions 
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspots ' + err );
            
            res.render('iframe_promotions',
            {
                promotions : undefined
            });
        });
    });
    
    
    app.get('/hilfsanfragen', function(req, res)
    {
        var limit = req.query.limit || '80';
        var userEmailEncrypted= '-';
        var us_sorted= 0;
        var userID= 0;
        
        if ( req.user ){
            
            //console.log('DEBUG: found user ' + JSON.stringify(req.user) )
            
            userEmailEncrypted= req.user.us_email_encrypted;
            us_sorted= req.user.us_sorted || 0;
            userID= req.user.us_id;
        }

        
        var categoryValueId= 0;
        if ( us_sorted == 1 ){
            /**
             * goods
             */
            categoryValueId= 1;
        }
        else if ( us_sorted == 2 ){
            /**
             * time
             */
            categoryValueId= 2;
        }

        
        //console.log('DEBUG: loading promotions with order ' + us_sorted + ' and category value ' + categoryValueId )

        
        
        var subqueryPromotionsWithMatch= 
            DB.knex
            .select (['lm_promotion.pr_id as pr_id_sub','lm_promotion_category_value_map.pcam_category_value_id'])
            .count ( '* as pr_weight' )
            .from('lm_promotion')
            .leftOuterJoin('lm_promotion_category_value_map', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
            .where('lm_promotion_category_value_map.pcam_category_value_id', categoryValueId )
            .where('lm_promotion.pr_instance_id', '<>', 0 )
            .groupBy('pr_id_sub')
            .as("promotionsWithMatch");
        
        
        
          //subqueryPromotionsWithMatch.then(function(data){
          //    console.log('found data %j' , JSON.stringify (data) );
          //});
        
        
        if ( us_sorted == 3 ){
            /**
             * profile
             */
            
            subqueryPromotionsWithMatch= 
                DB.knex
                .select (['lm_promotion.pr_id as pr_id_sub','lm_user_category_value_map.ucam_category_value_id'])
                .count ( '* as pr_weight' )
                .from('lm_promotion')
                .leftOuterJoin('lm_promotion_category_value_map', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
                .join('lm_user_category_value_map', 'lm_user_category_value_map.ucam_category_value_id', 'lm_promotion_category_value_map.pcam_category_value_id' )
                .where('lm_user_category_value_map.ucam_user_id', userID )
                .where('lm_promotion.pr_instance_id', '<>', 0 )
                .groupBy('pr_id_sub')
                .as("promotionsWithMatch");
            
        }else if ( us_sorted == 4 ){
            /**
             * distance
             */
            
            var longitude= req.user.us_long || 16.3;
            var lat= req.user.us_lat || 48.2;

            var calculationRaw= '(64800- (POW((lm_like.li_long-'+longitude+'),2) + POW((lm_like.li_lat-'+lat+'),2))) as pr_weight';
            
            subqueryPromotionsWithMatch= 
                DB.knex
                .select (['lm_promotion.pr_id as pr_id_sub', DB.knex.raw(calculationRaw) ])
                .from('lm_promotion')
                .join('lm_like','lm_like.li_id','lm_promotion.pr_like_id')
                .where('lm_promotion.pr_instance_id', '<>', 0 )
                .groupBy('pr_id_sub')
                .as("promotionsWithMatch");
            
            subqueryPromotionsWithMatch.then(function(data){
                console.log ( JSON.stringify(data) );
            });
            
            
        }else if ( us_sorted == 5 ){
            /**
             * remaining time
             */
            
            var calculationRaw= '(now() - lm_promotion.pr_end_time) as pr_weight';
            
            subqueryPromotionsWithMatch= 
                DB.knex
                .select (['lm_promotion.pr_id as pr_id_sub', DB.knex.raw(calculationRaw) ])
                .from('lm_promotion')
                .where('lm_promotion.pr_instance_id', '<>', 0 )
                .groupBy('pr_id_sub')
                .as("promotionsWithMatch");
            
            subqueryPromotionsWithMatch.then(function(data){
                console.log ( JSON.stringify(data) );
            });
        }
        
        
        DB.knex('lm_promotion')
        .select(['lm_promotion.*', 'lm_like.*', 'promotionsWithMatch.*', 'lm_customer.cu_full_name'])
        .leftJoin('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
        .leftJoin('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        .leftJoin('lm_promotion_instance','lm_promotion_instance.pi_id','lm_promotion.pr_instance_id')
        .leftOuterJoin( subqueryPromotionsWithMatch, 'lm_promotion.pr_id', 'promotionsWithMatch.pr_id_sub' )
        .where('lm_promotion.pr_instance_id', '<>', 0 )
        .andWhere( DB.knex.raw( 'lm_promotion.pr_current_count < lm_promotion.pr_gift_count AND lm_promotion.pr_end_time > now()' ) )
        .orderBy('promotionsWithMatch.pr_weight', 'desc')
        .orderBy('lm_promotion.pr_end_time', 'asc')
        .limit(limit)        
        .then( function(data) 
        {
            var promotions= data;
            
            //console.log('DEBUG: found promotions ' + JSON.stringify(promotions) )
            
            for ( i= 0; i< promotions.length; i++ ){
                
                var promotion= promotions[i];
                //console.log ( 'DEBUG: promotion ' + promotion.pr_id + ' with profile ' + promotion.pr_profile_id + ' weight ' + promotion.pr_weight + ',' + promotion.pr_current_count );
            }
            
            
            DB.knex('lm_recipients')
            .select('lm_recipients.re_customer_id')
            .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
            .then(function(recipient)
            {
                //console.log('keex found ' + JSON.stringify(recipient) )
                
                
                for (var i=0; i < promotions.length; i++) 
                {
                    var ticket= promotions[i];
                    preparePromotion ( ticket, recipient );
                }
                
                if ( req.user )
                {
                    res.render('webapp_promotions',
                    {
                        user : req.user,
                        message : req.flash('webappMessage'),
                        promotions : promotions 
                    });
                }
                else
                {
                    res.render('webapp_promotions_static',
                    {
                        message : req.flash('webappMessage'),
                        promotions : promotions 
                    });
                }
            });
        }) 
        .catch(function (err) 
        {
            console.log('ERROR: failed to find hotspots ' + err );
            webappWithError ( req,  res, err, 'Die aktuellen Anfragen konnten nicht geladen werden.' );
        });

        
        
    });


    app.get('/hilfsanfrage', function(req, res)
    {
        var promotionId = req.query.pr_id;
        var userEmail= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        //console.log('webapp loading promotion with id ' + promotionId );

        DB.knex('lm_promotion')
        .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
        .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
        //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
        .where('lm_promotion.pr_id', promotionId )
        .limit(1)        
        .select()
        .then(function(data) 
        {
            var promotion= data[0];
            
            DB.knex('lm_recipients')
            .select('lm_recipients.re_customer_id')
            .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
            .then(function(recipient)
            {
                preparePromotion ( promotion, recipient );
                
                if ( promotion.pr_is_hidden )
                {
                    req.flash ('webappMessage', 'Diese Hilfsanfrage ist nur für registrierte Helfer sichtbar. Die Art der Hilfsleistung erfordert, dass dich die Leute am Standort kennen. Du kannst dich gerne am Standort informieren.' );
                    return res.redirect('/hotspot?li_id=' + promotion.li_id );
                }
                else
                {
                    res.render('webapp_promotion',
                    {
                        user : req.user,
                        message : req.flash('webappMessage'),
                        promotion : promotion
                    });
                }
            });
            
        })
        .catch(function (err) 
        { 
            console.log('failed to find promotion ' + err );
            webappWithError ( req, res, err, 'Die Hilfsanfrage konnte nicht geladen werden.' );
        });
    });
    
    

    
    
    app.get('/redir/preagree_static', isWebappLoggedIn, function(req, res)
    {
        var promotionInstanceId = req.query.pri_id;
        var promotionMultiplier= '1';
        var userEmailEncrypted= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        DB.knex('lm_promotion')
        .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
        .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
        //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
        .where('lm_promotion.pr_instance_id', promotionInstanceId )
        .limit(1)        
        .select()
        .then(function(data) 
        {
            var promotion= data[0];
            promotion.pr_multiplier= promotionMultiplier;

            //console.log('found promotion multiplier' , promotion.pr_multiplier );

            
            DB.knex('lm_recipients')
            .select('lm_recipients.re_customer_id')
            .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
            .then(function(recipient)
            {
                preparePromotion ( promotion, recipient );

                res.render('webapp_promotion_agree',
                {
                    user : req.user,
                    message : req.flash('webappMessage'),
                    promotion : promotion
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find promotion ' + err );
            webappWithError ( req, res, err, 'Die Anfrage konnte nicht geladen werden.' );
        });
    });

    
    app.get('/hilfsanfrage/preagree', isWebappLoggedIn, function(req, res)
    {
        var promotionId = req.query.pr_id;
        var promotionMultiplier= req.body.pr_multiplier || '1';
        var userEmailEncrypted= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        console.log('DEBUG: preagree promotion ' , promotionId );

        DB.knex('lm_promotion')
        .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
        .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
        //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
        .where('lm_promotion.pr_id', promotionId )
        .limit(1)        
        .select()
        .then(function(data) 
        {
            var promotion= data[0];
            promotion.pr_multiplier= promotionMultiplier;

            console.log('DEBUG: found promotion ' , JSON.stringify(promotion) );

            
            DB.knex('lm_recipients')
            .select('lm_recipients.re_customer_id')
            .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
            .then(function(recipient)
            {
                preparePromotion ( promotion, recipient );

                res.render('webapp_promotion_agree',
                {
                    user : req.user,
                    message : req.flash('webappMessage'),
                    promotion : promotion
                });
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find promotion ' + err );
            webappWithError ( req, res, err, 'Die Anfrage konnte nicht geladen werden.' );
        });
    });
    
    
    app.get('/hilfsanfrage/agree', isWebappLoggedIn, function(req, res)
    {
        var promotionId = req.query.pr_id;
        var userId= req.user.us_id;
        var multiplier= req.query.pr_multiplier||'1';
        var increment= req.query.pr_gift_units_per_count||'1';
        var count= increment * multiplier;
        
        var userEmailEncrypted= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        console.log('INFO: agreeing promotion with id ' + promotionId + " and count " + count );

        DB.knex('lm_promotion')
        .where('pr_id', '=', promotionId )
        .andWhere( DB.knex.raw( 'pr_current_count < pr_gift_count' ) ) 
        .increment ( 'pr_current_count', count )
        .then(function(data) 
        {
            //console.log ('promotion agree %s', JSON.stringify(data) )
            
            if ( data )
            {
                DB.knex('lm_promotion')
                .join('lm_like','lm_like.li_id', 'lm_promotion.pr_like_id')
                .where('pr_id', '=', promotionId )
                .select()
                .then(function(innerData) 
                {
                    var promotion= innerData[0];
                    promotion.pr_multiplier= multiplier;

                    DB.knex('lm_recipients')
                    .select('lm_recipients.re_customer_id')
                    .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
                    .then(function(recipient)
                    {
                        preparePromotion ( promotion, recipient );
                        
                        var code= promotion.pr_code + '' + promotion.pr_current_count;
                        var end_time= promotion.pr_end_time || moment().add( 24, 'hours').format('YYYY-MM-DD HH:mm:ss');
                        var warn_time= moment( end_time ).subtract ( 3, 'hours').format('YYYY-MM-DD HH:mm:ss'); 

                        var linkToStatus= config.server_url + '/status';
                        var message= 'Hallo ' + req.user.us_nickname + ',\n\ndie Hilfsanfrage zu deiner Zusage\n\n' + promotion.pr_user_comment + '\n\nläuft in drei Stunden ab.\nDen akuellen Status kannst du hier ' + linkToStatus + ' ansehen.\n\nDein help2day Team';

                        var title= 'Ablauf der Hilfsanfrage';
                        
                        // create ticket
                        new Model.Gift({ 
                            'gi_user_id': userId, 
                            'gi_code': code,
                            'gi_promotion_id':promotion.pr_id, 
                            'gi_image_reference':promotion.pr_gift_image_reference,
                            'gi_comment':promotion.pr_gift_comment,
                            'gi_end_time':promotion.pr_end_time,
                            'gi_user_nick':req.user.us_nickname,
                            'gi_user_comment':promotion.pr_user_comment,
                            'gi_hint':promotion.pr_hint,
                            'gi_count': count,
                            'gi_warn_time': warn_time,
                            'gi_warn_message': message,
                            'gi_warn_title': title,
                            'gi_promotion_instance_id':promotion.pr_instance_id 
                            })
                        .save(); 
        
                        console.log ('promotion agree counts %d %d', promotion.pr_current_count, promotion.pr_gift_count )
                        
                        DB.knex('lm_users')
                        .where('us_id', '=', userId )
                        .increment ( 'us_gift_count', 1 )
                        .then(function () 
                        {
                            if ( !promotion.pr_gift_phone ){
                                
                                req.flash('webappMessage','Danke für dein Engagement. Du findest die Hilfsanfrage jetzt in deinem Status.');
                                res.redirect('/status' );
                            }
                            else{
                                
                                console.log ('INFO: sending agree SMS to manager %s', promotion.pr_gift_phone );

                                var localLink= config.webapp + config.deeplinkinstance + '/' + promotion.pr_instance_id;
                                var localMessage= 'Hilfe wurde von zugesagt von ' + req.user.us_nickname + '.\nDetails unter ' + localLink + '\n';
                                var localTitle= 'Hilfe zugesagt';

                                DB.knex ('lm_messaging')
                                .insert({ 
                                    me_message:localMessage,
                                    me_title:localTitle,
                                    me_phone_number: promotion.pr_gift_phone,
                                    me_promotion_instance: promotion.pr_instance_id,
                                    me_promotion_id: promotion.pr_id,
                                    me_recipients_group_id: 0,
                                    me_customer_id: req.user.us_customer_id,
                                    me_type: 'sms',
                                    me_sms: 1,
                                    me_chat: 1,
                                    me_created : moment().format('YYYY-MM-DD HH:mm'),
                                    me_valid_until : moment().add ( 1, 'hours' ).format('YYYY-MM-DD HH:mm')
                                    })
                                .then(function(data)
                                {
                                    req.flash('webappMessage','Danke für dein Engagement. Du findest die Hilfsanfrage jetzt in deinem Status.');
                                    res.redirect('/status' );

                                });
                            }
                            var impact= promotion.pr_impact || ' mehr Menschen helfen.'
                            var localEventMessage= 'Hilfe für ' + promotion.pr_customer_nick + ' wurde von ' + req.user.us_nickname + ' zugesagt. Damit kann die Hilfsorganisation ' + impact + '\n';
                            var localEventTitle= 'Hilfeleistung zugesagt';
                            
                            DB.knex('lm_sig_event')
                            .insert({
                                se_title: localEventTitle,
                                se_message: localEventMessage,
                                se_image_ref: promotion.pr_gift_image_reference,
                                se_marker: promotion.li_marker_reference,
                                se_category: 'allgemein',
                                se_long: promotion.li_long,
                                se_lat: promotion.li_lat,
                                se_date: moment().format('YYYY-MM-DD HH:mm:ss')
                            })
                            .then(function(){

                                console.log ('INFO: sending event message to sig ' + localEventMessage );
                                
                            });
                        });
                    });
                });
            }
            else
            {
                //console.log('did not update promotion ' + JSON.stringify(promotion) )

                // XXX: link zu standort oder NGO einbauen
                
                req.flash('webappMessage','Die Anfrage ist schon abgelaufen. Danke, dass du dich engagieren wolltest. Es gibt sicher noch andere Standorte mit Hilfsanfragen in deiner Nähe.');
                res.redirect('/hilfsanfragen' );
            }
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Die Hilfsanfrage konnte nicht angenommen werden.' );
        });
    });
    

    /**
     * depricated way to link requests in facebook and other tools
     * promotions may be reused and an old link would confuse users
     * 
     */

    app.get( config.deeplink + '/:pr_id', function(req, res)
    {
        var promotionId = req.params.pr_id;
        var userEmailEncrypted= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        //console.log('loading static promotion with id ' + promotionId );
        
        if ( promotionId && !isNaN(parseInt(promotionId)) ) 
        {
            DB.knex('lm_promotion')
            .join('lm_like', 'lm_like.li_id','lm_promotion.pr_like_id')
            .where('pr_id', '=', promotionId )
            .where( DB.knex.raw( 'pr_current_count < pr_gift_count AND pr_end_time > now()' ) )
            .limit(1)        
            .select( 'lm_promotion.*', 'lm_like.*' )
            .then(function(data) 
            {
                promotion= data[0];
                //console.log('found promotion %j' , promotion );
                if ( promotion )
                {
                    
                    DB.knex('lm_recipients')
                    .select('lm_recipients.re_customer_id')
                    .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
                    .then(function(recipient)
                    {
                        preparePromotion ( promotion, recipient );
                        
                        if ( req.isAuthenticated() )
                        {
                            res.render('webapp_promotion',
                            {
                                user : req.user,
                                promotion : promotion
                            });
                        }
                        else
                        {
                            res.render('webapp_promotion_static',
                            {
                                promotion : promotion
                            });
                        }
                    });
                }
                else
                {
                    req.flash ('webappMessage', 'Diese Anfrage ist leider nicht mehr aktiv. Suche in der App nach anderen Hilfsanfragen. Es gibt sicher etwas in der Nähe zu tun.' );
                    res.redirect('/hilfsanfragen' );
                }
            })
            .catch(function (err) 
            {
                req.flash ('webappMessage', 'Diese Anfrage ist leider nicht mehr aktiv. Suche in der App nach anderen Hilfsanfragen. Es gibt sicher etwas in der Nähe zu tun.' );
                res.redirect('/hilfsanfragen' );
            });
        }
        else
        {
            req.flash ('webappMessage', 'Diese Anfrage ist leider nicht mehr aktiv. Suche in der App nach anderen Hilfsanfragen. Es gibt sicher etwas in der Nähe zu tun.' );
            res.redirect('/hilfsanfragen' );
        }
    });


    
    
    
    /**
     * current way to link requests in facebook and other tools
     * 
     */
    app.get( config.deeplinkinstance + '/:pi_id', function(req, res)
    {
        var promotionInstanceId = req.params.pi_id;
        var userEmailEncrypted= '-';
        
        if ( req.user )
            userEmailEncrypted= req.user.us_email_encrypted;

        console.log('INFO: loading static promotion instance with id ' + promotionInstanceId );
        
        if ( promotionInstanceId && !isNaN(parseInt(promotionInstanceId)) ) 
        {
            DB.knex('lm_promotion')
            .join('lm_like', 'lm_like.li_id','lm_promotion.pr_like_id')
            .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
            //.join('lm_promotion_profile_map','lm_promotion_profile_map.pp_promotion_id','lm_promotion.pr_id')
            //.join('lm_profile','lm_promotion_profile_map.pp_profile_id','lm_profile.pro_id')
            .where('pr_instance_id', '=', promotionInstanceId )
            .where( DB.knex.raw( 'pr_current_count < pr_gift_count AND pr_end_time > now()' ) )
            .limit(1)        
            .select( 'lm_promotion.*', 'lm_like.*' )
            .then(function(data) 
            {
                promotion= data[0];
                //console.log('found promotion %j' , promotion );
                if ( promotion )
                {
                    
                    DB.knex('lm_recipients')
                    .select('lm_recipients.re_customer_id')
                    .where('lm_recipients.re_email_encrypted', userEmailEncrypted )
                    .then(function(recipient)
                    {
                        preparePromotion ( promotion, recipient );
                        
                        if ( req.isAuthenticated() )
                        {
                            res.render('webapp_promotion',
                            {
                                user : req.user,
                                promotion : promotion
                            });
                        }
                        else
                        {
                            res.render('webapp_promotion_static',
                            {
                                promotion : promotion
                            });
                        }
                    });
                }
                else
                {
                    req.flash ('webappMessage', 'Diese Anfrage ist leider nicht mehr aktiv. Suche in der App nach anderen Hilfsanfragen. Es gibt sicher etwas in der Nähe zu tun.' );
                    res.redirect('/hilfsanfragen' );
                }
            })
            .catch(function (err) 
            {
                req.flash ('webappMessage', 'Diese Anfrage ist leider nicht mehr aktiv. Suche in der App nach anderen Hilfsanfragen. Es gibt sicher etwas in der Nähe zu tun.' );
                res.redirect('/hilfsanfragen' );
            });
        }
        else
        {
            req.flash ('webappMessage', 'Diese Anfrage ist leider nicht mehr aktiv. Suche nach anderen Hilfsanfragen. Es gibt sicher etwas in der Nähe zu tun.' );
            res.redirect('/hilfsanfragen' );
        }
    });
    
    
    
    
    app.get('/danke/:gi_id', isWebappLoggedIn, function(req, res)
    {
        var ticketId = req.params.gi_id;

        
        console.log('DEBUG: loading webapp thanks page for gift with id ' + ticketId );

        
        DB.knex('lm_gift')
        .join('lm_promotion','lm_promotion.pr_id','lm_gift.gi_promotion_id')
        .join('lm_promotion_instance','lm_promotion_instance.pi_promotion_id','lm_gift.gi_promotion_id')
        .join('lm_like','lm_like.li_id','lm_promotion.pr_like_id')
        .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
        .limit(1)        
        .where('lm_gift.gi_id', '=', ticketId )
        .then(function(data)
        {
            ticket= data[0];
            
            prepareTicket ( ticket )

            //console.log('DEBUG: loading webapp ticket %j ',  ticket );
            
            
            DB.knex('lm_gift')
            .join('lm_promotion','lm_promotion.pr_instance_id','lm_gift.gi_promotion_instance_id')
            .join('lm_users','lm_users.us_id','lm_gift.gi_user_id')
            .limit(6)        
            .orderBy('gi_id', 'desc')
            .select(['lm_users.us_id', 'lm_users.us_image_ref','lm_users.us_nickname','lm_gift.gi_id','lm_promotion.pr_instance_id'])
            .where('lm_promotion.pr_instance_id', '=', ticket.pr_instance_id )
            
            .then(function(data)
            {
                var helpers= [];
                var helpersWithUser= data;
                
                //console.log('DEBUG: found helpers ' + JSON.stringify(helpers) );
                
                for ( i=0; i< helpersWithUser.length; i++ ){
                    var helper= helpersWithUser[i];
                    
                    if ( !helper.us_image_ref ){
                        helper.us_image_ref= 'anonymous';
                    }
                    
                    if ( helper.us_id != req.user.us_id ){
                        helpers.push(helper);
                    }
                }
                
                res.render('webapp_thank',
                        {
                            user : req.user,
                            ticket : ticket,
                            helpers : helpers,
                            message : req.flash('webappMessage')
                        });
            })
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Die Dankesseite konnte nicht geladen werden.' );
        });
    });
    
    
    
    
    /**
     * 
     * TICKETS
     * 
     */    
    
    
    app.get('/ticket/detail', isWebappLoggedIn, function(req, res)
    {
        var ticketId = req.query.gi_id;

        //console.log('loading webapp ticket with id ' + ticketId );

        
        DB.knex('lm_gift')
        .join('lm_promotion','lm_promotion.pr_id','lm_gift.gi_promotion_id')
        .join('lm_like','lm_like.li_id','lm_promotion.pr_like_id')
        .where('lm_gift.gi_id', '=', ticketId )
        .then(function(data)
        {
            ticket= data[0];
            
            prepareTicket ( ticket )

            //console.log('loading webapp ticket %j ',  ticket );
            
            res.render('webapp_ticket',
            {
                user : req.user,
                ticket : ticket,
                message : req.flash('webappMessage')
            });
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Das Ticket konnte nicht geladen werden.' );
        });
    });
    
    
    
    app.get('/ticket/redeem', isWebappLoggedIn, function(req, res)
    {
        var ticketId = req.query.gi_id;
        
        DB.knex('lm_gift')
        .where('lm_gift.gi_id', '=', ticketId )
        .update({
            'gi_is_redeemed' : 1,
            'gi_redeem_time' : moment().format('YYYY-MM-DD HH:mm:ss')
        })
        .then(function() 
        {
            req.flash ('webappMessage', 'Danke, dass du geholfen hast. Damit wird unsere Gesellschaft ein kleines Stück menschlicher und besser.');
            res.redirect('/status');

//            DB.knex('lm_gift')
//            .join('lm_promotion','lm_promotion.pr_id','lm_gift.gi_promotion_id')
//            .join('lm_like','lm_like.li_id','lm_promotion.pr_like_id')
//            .where('lm_gift.gi_id', '=', ticketId )
//            .then(function(data)
//            {
//                ticket= data[0];
//                
//                prepareTicket ( ticket )
//
//                //console.log('loading webapp ticket %j ',  ticket );
//                
//                res.render('webapp_ticket',
//                {
//                    user : req.user,
//                    ticket : ticket,
//                    message : 'Danke, dass du geholfen hast. Damit wird unsere Gesellschaft ein kleines Stück menschlicher und besser.',
//                });
//            });
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Das Ticket konnte nicht bestätigt werden.' );
        });
    });
    
    
    
    app.get('/ticket/cancel', isWebappLoggedIn, function(req, res)
    {
        var ticketId = req.query.gi_id;

        DB.knex('lm_gift')
        .where('lm_gift.gi_id', '=', ticketId )
        .update({
            'gi_is_redeemed' : 0,
            'gi_is_canceled' : 1,
            'gi_redeem_time' : moment().format('YYYY-MM-DD HH:mm:ss')
        })
        .then(function() 
        {
            DB.knex('lm_gift')
            .join('lm_promotion','lm_promotion.pr_id','lm_gift.gi_promotion_id')
            .join('lm_like','lm_like.li_id','lm_promotion.pr_like_id')
            .where('lm_gift.gi_id', '=', ticketId )
            .then(function(data)
            {
                var ticket= data[0];
                
                if ( !ticket )
                    throw new Error('invalid ticket');
                
                prepareTicket ( ticket )

                console.log('INFO: canceling ticket ' + ticketId + ' with count ' + ticket.gi_count );
                
                DB.knex('lm_promotion')
                .where('pr_id', '=', ticket.gi_promotion_id )
                .decrement ( 'pr_current_count', ticket.gi_count )
                .then(function()
                {
                    req.flash ('webappMessage', 'Dein Ticket wurde storniert und die zugesagten Hilfsleistungen zurückgestellt. Wir würden uns freuen, wenn du ein andermal helfen könntest.');
                    
                    DB.knex('lm_users')
                    .where('us_id', '=', req.user.us_id )
                    .decrement ( 'us_gift_count', 1 )
                    .then(function () {
                        
                        res.redirect('/status');
                        
                    });
                    
                });
            });
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Das Ticket konnte nicht storniert werden. Keine Sorge, es wird dadurch kein Problem entstehen.' );
        });
    });
    
    
    
    /**
     * 
     * MESSAGES
     * 
     */    
    
    app.get('/messages', isWebappLoggedIn, function(req, res)
    {
        var userId = req.user.us_id;

        console.log('DEBUG: loading messaages for user id ' + userId );

        DB.knex('lm_messaging')
        .select(['lm_messaging.*', 'sender.us_image_ref', 'sender.us_nickname'])
        .leftJoin('lm_users as sender','sender.us_id','lm_messaging.me_sender_id')
        .orderBy('lm_messaging.me_created','desc')
        .where('lm_messaging.me_user_id', '=', userId )
        .where('lm_messaging.me_chat',1)
        .limit(100)
        .then(function(data)
        {
            var messages= data;

            
            for ( i= 0; i< messages.length; i++ ){
                var message= messages[i];
                
                if ( !message.us_image_ref )
                    message.us_image_ref= 'anonymous';

                message.me_created_relative= moment( message.me_created ).locale('de-at').fromNow();
                if ( message.me_message )
                    message.me_message_html= '<p>' + message.me_message.replace(/\r?\n/g, '<br />') + '</p>' ;
                
                
            }
            
            
            //console.log('DEBUG: found messages %j ',  messages );
            
            
            
            res.render('webapp_messages',
            {
                user : req.user,
                messages : messages,
            });
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Die Nachrichten konnten nicht geladen werden.' );
        });
    });
    
    app.get('/message/form', isWebappLoggedIn, function(req, res)    {
        
        var userId = req.user.us_id;
        var recipientId= req.query.me_user_id;
        var title = req.query.me_title || 'Betreff';
        
        //console.log('DEBUG: loading messaages for user id ' + userId );

        DB.knex('lm_users')
        .where('lm_users.us_id', '=', recipientId  )
        .then(function(data)
        {
            var recipient= data[0];
            
            res.render('webapp_message_form',
            {
                user : req.user,
                recipient : recipient,
                title : title
            });
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Die Nachrichten konnten nicht geladen werden.' );
        });
    });

    
    app.post('/message', isWebappLoggedIn, function(req, res)    {
        
        var recipientId= req.body.me_user_id || 0;
        var me_title= req.body.me_title || 'Ohne Titel';
        var me_message= req.body.me_message || 'Leere Nachricht';
        
        console.log('DEBUG: post message found ' + me_title )
        
        DB.knex ('lm_messaging')
        .insert({ 
            me_message:me_message,
            me_title:me_title,
            me_recipients_group_id: 0,
            me_user_id: recipientId,
            me_sender_id: req.user.us_id,
            me_type: '',
            me_chat: 1,
            me_created : moment().format('YYYY-MM-DD HH:mm'),
            me_valid_until : moment().add ( 12, 'hours' ).format('YYYY-MM-DD HH:mm')
            })
        .then(function(data)
        {
            DB.knex('lm_users')
            .where('lm_users.us_id', '=', recipientId  )
            .then(function(data)
            {
                var recipient= data[0];
                
                if ( recipient && recipient.us_allow_email_notification ){

                    
                    DB.knex ('lm_messaging')
                    .insert({ 
                        me_message:'Hallo ' + recipient.us_nickname + '\n\nDu hast eine Nachricht von ' + req.user.us_nickname + ' erhalten.\nGehe auf ' + config.server_url + '/messages um die Nachricht zu lesen.',
                        me_title: 'Neue Nachricht von ' + req.user.us_nickname,
                        me_recipients_group_id: 0,
                        me_user_id: recipientId,
                        me_type: '',
                        me_email: 1,
                        me_created : moment().format('YYYY-MM-DD HH:mm'),
                        me_valid_until : moment().add ( 1, 'hours' ).format('YYYY-MM-DD HH:mm')
                        })
                    .then(function(data)
                    {
                        
                    });
                }
            
                req.flash('webappMessage','Deine Nachricht wurde gesendet. Du kannst benachrichtigt werden, wenn du eine Antwort bekommst. Gehe dazu zu den Berechtigungen für Nachrichten in den Einstellungen.');
                res.redirect('/messages' );
            });
        });
    });
    
    
    app.get('/message/remove', isWebappLoggedIn, function(req, res)    {
        
        var userId = req.user.us_id;
        var messageId= req.query.me_id;
        
        
        console.log('DEBUG: deleting message ' + messageId );

        DB.knex ('lm_messaging')
        .del()
        .where('lm_messaging.me_id', '=', messageId  )
        .then(function(data)
        {
            res.redirect('/messages' );
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Die Nachrichten konnten nicht geladen werden.' );
        });
    });
    
    app.get('/message/read', isWebappLoggedIn, function(req, res)    {
        
        var userId = req.user.us_id;
        var messageId= req.query.me_id;
        
        console.log('DEBUG: read message ' + messageId );

        DB.knex ('lm_messaging')
        .update({me_read:1})
        .where('lm_messaging.me_id', '=', messageId  )
        .then(function(data)
        {
            res.redirect('/messages' );
        })
        .catch(function (err) 
        {
            webappWithError ( req,  res, err, 'Die Nachrichten konnten nicht geladen werden.' );
        });
    });
    
    
    
    
    
    
    
    
    
    
    
    /**
     * 
     * IMAGES
     * 
     */    

    app.get('/image/:file', function (req, res)
    {
        var pathhead= '/files/';
        file = req.params.file;
        
        //console.log('DEBUG: requesting image file ' + JSON.stringify(file) + ' is valid ' + isValidImageName (file) );
        
        usepath= '/files/null.gif';
        content_type= 'image/gif';

        
        fullpath= pathhead + file + '.jpg';
        if ( existsSync( fullpath ) )
        {
            content_type= 'image/jpg';
            usepath= fullpath;
        }
        else
        {
            fullpath= pathhead + file + '.jpeg';
            if ( existsSync( fullpath ) )
            {
                content_type= 'image/jpg';
                usepath= fullpath;
            }
            else
            {
                fullpath= pathhead + file + '.png';
                if ( existsSync( fullpath ) )
                {
                    content_type= 'image/png';
                    usepath= fullpath;
                }
                else
                {
                    fullpath= pathhead + file + '.gif';
                    if ( existsSync( fullpath ) )
                    {
                        content_type= 'image/gif';
                        usepath= fullpath;
                    }
                    else
                    {
                        fullpath= pathhead + file + '.svg';
                        if ( existsSync( fullpath ) )
                        {
                            content_type= 'image/svg+xml';
                            usepath= fullpath;
                        }
                        else
                        {
                            fullpath= pathhead + file;
                            if ( existsSync( fullpath ) )
                            {
                                content_type= 'image/jpg';
                                usepath= fullpath;
                            }
                        }
                    }
                }
            }
        }

        //console.log('DEBUG: serving image file ' + usepath );
        
        var img = fs.readFileSync( usepath );
        
        if ( usepath == '/files/null.gif' )
            res.setHeader("Cache-Control", "public, max-age=0"); // 0 days
        else
            res.setHeader("Cache-Control", "public, max-age=345600"); // 4 days
            
        res.setHeader("Expires", new Date(Date.now() + 345600000).toUTCString());
        res.writeHead(200, {'Content-Type': content_type });
        res.end(img, 'binary');
    });

    
    
    
    
    
};



//require the image editing file
var editor = path.resolve(__dirname, 'image_handler.js');

function compressAndResize (imageUrl,callback) 
{
    // We need to spawn a child process so that we do not block
    // the EventLoop with cpu intensive image manipulation
    var childProcess = require('child_process').fork(editor);
    
    childProcess.on('message', function(message) 
    {
        console.log(message);
    });
    childProcess.on('error', function(error) 
    {
        console.error(error.stack)
        callback ();
    });
    childProcess.on('exit', function() 
    {
        console.log('process exited');
        
        callback ();
    });
    childProcess.send(imageUrl);
}





// =====================================
// LOCALS ==============================
// =====================================


function existsSync(filePath)
{
    try
    {
      fs.statSync(filePath);
    }
    catch(err)
    {
      if (err.code == 'ENOENT') 
          return false;
    }
    return true;
};

function isValidImageName ( name )
{
    return name.indexOf(".") < 0;
}


function prepareTicket ( ticket )
{
    if ( ! ticket )
        return;
    
    ticket.gi_is_active= ticket.gi_is_canceled == false && ticket.gi_is_redeemed == false && moment().isBefore(ticket.gi_end_time);     

    ticket.pro_icon= "icon_sachspende.png";
    if ( ticket.pro_id == 2 )
        ticket.pro_icon= "icon_zeitspende.png";
    if ( ticket.pro_id == 3 )
        ticket.pro_icon= "icon_zeitspende_mitglieder.png";

    ticket.pr_end_time_string= moment ( ticket.pr_end_time ).locale('de').format('L');

    
    ticket.pr_is_hidden= 0;
    var multiplier= ticket.pr_multiplier || 1;
    
    ticket.pr_open_count= ticket.pr_gift_count- ticket.pr_current_count;
    var comment= ticket.pr_gift_comment;
    if ( comment )
        ticket.pr_gift_comment= comment.replace("EINHEITEN", ticket.pr_open_count );
    
    var user= ticket.pr_user_comment;
    if ( user )
        ticket.pr_user_comment= user.replace("STÜCK", ticket.pr_gift_units_per_count * multiplier );

    
    if ( ! ticket.pr_impact )
        ticket.pr_impact= "diese Welt verbessern.";
    
    ticket.pr_gift_comment_short= truncate(ticket.pr_gift_comment,60);

    ticket.pr_duration_percentage= '73%';
    var duration= moment ( ticket.pr_end_time ) - moment ( ticket.pr_start_time );
    var already= moment() - moment ( ticket.pr_start_time );
    var percentage= parseInt ( ( duration / already ) * 98.0 );
    
    if ( percentage > 0 && percentage < 99 )
        ticket.pr_duration_percentage= percentage + '%';
    
    //console.log ('DEBUG: found times ' + duration + ',' + already + ',' + ticket.pr_duration_percentage );
    
    var start= moment ( ticket.pr_start_time ).valueOf();
    var end= moment ( ticket.pr_end_time ).valueOf();
    var now= moment().valueOf();

    var duration= +end- start;
    var already= now- start;
    var percentage= parseInt ( ( already / duration ) * 98.0 );
    
    if ( percentage >= 0 && percentage < 99 )
        ticket.pr_duration_percentage= percentage + '%';
}
  

function preparePromotion ( promotion, registerList )
{
    if ( ! promotion )
        return;
    
    promotion.pr_open_count= promotion.pr_gift_count- promotion.pr_current_count;
    
    if ( !promotion.pr_customer_nick )
        promotion.pr_customer_nick= "help2day";
    
    
    var conceile= 0;
    if ( promotion.pr_requires_registration )
    {
        conceile= 1;
        if ( registerList )
        {
            for (var i=0; i < registerList.length; i++) 
            {
                if ( registerList[i].re_customer_id == promotion.pr_customer_id )
                    conceile= 0;
            }
        }
    }
    
    if ( conceile )
    {
        promotion.pr_is_hidden= 1;
        promotion.pr_gift_comment= 'nur für registrierte Helfer offengelegt';
        promotion.pr_user_comment= 'nur für registrierte Helfer offengelegt';
        promotion.pr_gift_comment_short= 'nur für registrierte Helfer offengelegt';
    }
    else
    {
        promotion.pr_is_hidden= 0;
        var multiplier= promotion.pr_multiplier || 1;
        
        var comment= promotion.pr_gift_comment;
        if ( comment )
        {
            promotion.pr_gift_comment= comment.replace("EINHEITEN", promotion.pr_open_count );
            promotion.pr_gift_comment_short= truncate(promotion.pr_gift_comment,60);
            //console.log('truncation: ' + promotion.pr_gift_comment_short );
        }
        
        var user= promotion.pr_user_comment;
        if ( user )
            promotion.pr_user_comment= user.replace("STÜCK", promotion.pr_gift_units_per_count * multiplier );
    }
    
    
    promotion.pr_end_time_string= moment ( promotion.pr_end_time ).locale('de').format('L');

    
    if ( ! promotion.pr_impact )
        promotion.pr_impact= "diese Welt zu einem besseren Ort machen.";

    
    promotion.pro_icon= "icon_sachspende.png";
    if ( promotion.pr_profile_id == 2 )
        promotion.pro_icon= "icon_zeitspende.png";
    if ( promotion.pr_profile_id == 3 )
        promotion.pro_icon= "icon_zeitspende_mitglieder.png";
    
    
    promotion.pr_duration_percentage= '73%';
    
    var start= moment ( promotion.pr_start_time ).valueOf();
    var end= moment ( promotion.pr_end_time ).valueOf();
    var now= moment().valueOf();

    var duration= +end- start;
    var already= now- start;
    var percentage= parseInt ( ( already / duration ) * 98.0 );
    
    //console.log ('DEBUG: found times ' + duration + ',' + already + ',' + ' now ' + now + ' in %' + percentage + ' start ' + start + ' end ' + end );
    
    if ( percentage >= 0 && percentage < 99 )
        promotion.pr_duration_percentage= percentage + '%';
    
    //console.log ('DEBUG: found percentage string ' + promotion.pr_duration_percentage );
}


function isWebappLoggedIn(req, res, next)
{
    
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
    
    req.flash ('webappMessage', 'Bitte melde dich bei uns an um alle Funktionen von help2day.org zu nutzen.');
    res.redirect('/login');
}


function webappWithError ( req, res, err, text )
{
    if ( !err )
        err= " unknown ";
    
    console.log('webapp error: ' + err + ' and message ' + text );

    req.flash ('webappMessage', text );
    res.render('webapp_promotions',
    {
        message : req.flash('webappMessage')
    });
}
