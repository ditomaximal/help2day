/**
 * application logic of help2day CRM
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

var DB = require('../config/database').db;
var Model = require('../config/model');
var User = Model.User;
var Hotspots = Model.Hotspots;
var multer = require('multer');
var upload = multer({ dest: '/files' })
var path = require('path');
const fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var moment = require('moment');
var config = require('../config/configuration.js');
var validator = require('validator');
var grex = require('../app/helpers.js');
var mailer = require('nodemailer');
var uuid = require('node-uuid');


// loginMessage
// signupMessage
// forgotMessage

module.exports = function(app, passport, handlebars, masterkey, mastersalt )
{
    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get( '/login', function(req, res)
    {
        // render the page and pass in any flash data if it exists
        res.render('login',
        {
            message : req.flash('loginMessage')
        });
    });
    
    // process the login form
    app.post( '/login', passport.authenticate('local-login',
    {
        successRedirect : '/main', // redirect to the secure profile
        // section
        failureRedirect : '/login', // redirect back to the signup page if there
        // is an error
        failureFlash : true
    // allow flash messages
    }));
    
    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res)
    {
        // render the page and pass in any flash data if it exists
        res.render('signup',
        {
            message : req.flash('signupMessage')
        });
    });
    
    app.post('/signup', passport.authenticate('local-signup',
    {
        successRedirect : '/main', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true
    }));

    
    // =====================================
    // SIGNUP NGO ==========================
    // =====================================
    app.get('/signupngo', function(req, res)
    {
        // render the page and pass in any flash data if it exists
        res.render('signupngo',
        {
            message : req.flash('signupMessage')
        });
    });
    
    app.post('/signupngo', function(req,res){
        
        console.log( 'INFO: setting up ngo customer record with email ' + req.body.email );
        
        DB.knex('lm_customer')
        .where('lm_customer.cu_email', req.body.email )
        .then(function(data){

            var customer= data[0];
            
            //console.log( 'found customer ' + JSON.stringify ( customer ) );
            
            if ( !customer ){

                var uid= uuid.v4();
                var salt= uuid.v4();
                
                DB.knex('lm_users')
                .insert({
                    'us_pw' : 'yonosee', 
                    'us_uid':uid, 
                    'us_salt': salt, 
                    'us_nickname': req.body.ngo.substring(0,60)
                })
                .then(function(data){

                    var customerUserId= data[0];
                    
                    DB.knex('lm_customer')
                    .insert({
                        'cu_user_id': customerUserId,
                        'cu_address': req.body.address, 
                        'cu_full_name': req.body.ngo,
                        'cu_email': req.body.email,
                        'cu_status': 'signup',
                        'cu_phone': req.body.phone,
                        'cu_contact': req.body.contact,
                        'cu_webpage': req.body.webpage,
                        'cu_default_long': 16.373819,
                        'cu_default_lat': 48.208174,
                        'cu_default_marker': 'helpinghandsmarker',
                        'cu_default_category': 'help2day'
                    })
                    .then(function(data){
    
                        
                        var bodyValues= req.body;
                        
                        
                        
                        
                        // send internal message about registration
                        
                        grex.sendMailByTemplateAsync ( bodyValues, 'ngosignup', config.internal_receivers_bcc, config.internal_receivers_bcc, 'help2day NGO Registrierung' );
    
                        
                        // send thanks message to ngo
                        /** TODO: post signup with ngo email and request for registration */
                        
                        grex.sendMailByTemplateAsync ( bodyValues, 'ngosignupthank', req.body.email, config.internal_receivers, 'help2day NGO Registrierung' );
    
                        
                        req.flash('signupMessage', 'Danke für die Registrierung. Wir melden uns in Kürze. Bei Fragen schreibe uns bitte eine eMail an office@help2day.org, oder ruf uns an unter +43 676 6504586 (Dietmar) +43 664 3863386 (Manfred). Danke. ');
    
                        
                        console.log( 'INFO: created customer with id ' + data );
                        
                        var customerId= data[0];
                        
                        DB.knex('lm_roles')
                        .insert([{ ro_customer_id : customerId, ro_name: 'admin' }, { ro_customer_id : customerId, ro_name: 'mitarbeiter' }])
                        .then( function(data){
    
                            var adminRoleId= data[0];
                            
                            DB.knex('lm_user_role_map')
                            .insert([
                                     { urm_user_id : config.masterAdminId, urm_role_id: adminRoleId },
                                     { urm_user_id : config.masterAdminId1, urm_role_id: adminRoleId },
                                     { urm_user_id : config.masterAdminId2, urm_role_id: adminRoleId },
                                     { urm_user_id : config.masterAdminId3, urm_role_id: adminRoleId }
                                     ])
                            .then(function(data){
    
                                console.log( 'INFO: created customer aux data admin role id ' + adminRoleId + " user role map id " + data[0] );
                                
                            });
                        });
                        
                        res.render('signupngofinish',
                        {
                            message : req.flash('signupMessage')
                        });
                    });
                });
            }else{
                
                req.flash('signupMessage', 'Die eMail der NGO ist bereits bei help2day eingetragen. Bitte schreibe uns eine eMail an office@help2day.org, damit wir das Problem klären können.');
                return res.redirect('/signupngo');
            }
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to handle ngo registration ' + err );
            req.flash('signupMessage', 'Fehler bei der Registrierung einer NGO.');
            res.render('signupngo',
            {
                message : req.flash('signupMessage')
            });
        });

    });

    
    
    
    
    
    
    
    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' } ) );

    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/clbk',
        passport.authenticate('facebook', 
        {
            successRedirect : '/main',
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

            if ( confirmation == null )
            {
                console.log( 'ERROR: failed to read confirmation record' );
                req.flash('signupMessage', 'Die eMail konnte nicht bestätigt werden.');
                res.render('signup',
                {
                    message : req.flash('signupMessage')
                });
            }
            else
            {
                new Model.User({'us_uid' : confirmation.get('co_uid') })
                .fetch()
                .then(function(new_user)
                {
                    var confirmationEmailEncrypted= confirmation.get('co_email');
                    
                    new_user.save(
                    {
                        us_email: '', 
                        us_email_encrypted: confirmationEmailEncrypted 
                    })
                    .then(function()
                    {
                        req.flash ('loginMessage', 'Die eMail wurde bestätigt, bitte jetzt mit der eMail und Password einloggen.' );
                        res.render('login',
                        {
                            message : req.flash('loginMessage')
                        });
                    });
                });
            }
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to read confirmation record' + err );
            req.flash('signupMessage', 'Die eMail konnte nicht bestätigt werden.');
            res.render('signup',
            {
                message : req.flash('signupMessage')
            });
        });
    });
    
    
    // =====================================
    // RESET  ==============================
    // =====================================
    app.get('/forgot', function(req, res) 
    {
        res.render('forgot', 
        {
          user: req.user,
          message : req.flash('forgotMessage')
        });
    });
    
    app.post('/forgot', function(req, res, next) 
    {
        var emailLower= req.body.email.toLowerCase();
        var email_encrypted= grex.encrypt ( emailLower, mastersalt, masterkey );

        console.log('INFO: resetting password for user with email ' + email_encrypted );
        
        async.waterfall([
          function(done) 
          {
            crypto.randomBytes ( 20, function(err, buf) 
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
                    req.flash('forgotMessage', 'Es ist leider kein Account mit dieser eMail vorhanden.');
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
                      
                      console.log('INFO: stored user with reset token ' + token );
                      done ( null, token, userObject );
                  });
              });
          },
          function ( token, user, done) 
          {
              console.log('INFO: sending reset mail to user ' + user.us_id + ' with token ' + token );
              
              var link= config.server_url + '/reset?token=' + token;
              
              var transporter = mailer.createTransport(
              {
                  host : "smtp.gmail.com",
                  secure : true,
                  port: 465,
                  auth: {
                      user: config.mail_user,
                      pass: config.mail_password
                  }
              });
              
              var mail = 
              {
                  from: "help2day reset <confirmation@grex-app.com>",
                  to: user.us_email,
                  bcc: config.internal_receivers_bcc,
                  subject: "help2day CRM Reset eMail",
                  text: "Hallo,\n\nbitte folge dem Link um dein Password zurückzusetzen.\n\n" + link + "\n\nDanke,\nDein help2day Team",
                  html: "Hallo,<br><br>bitte folge dem Link um dein Password zurückzusetzen <br><br><a href=\"" + link + "\">Reset</a><br><br>Danke, Dein help2day Team"
              };

              transporter.sendMail(mail, function(error, response)
              {
                  if(error)
                  {
                      console.log('ERROR: failed to send confirmation' + error);
                      
                      req.flash('signupMessage', 'Die Reset eMail konnte nicht gesendet werden.');
                      res.redirect('/forgot');
                  }
                  else
                  {
                      console.log("INFO: succeeded to send confirmation mail to " + user.us_id );
                      req.flash('signupMessage', 'Die Reset eMail wurde an ' + mail.to + ' gesendet. Bitte dem Link in der eMail folgen und dann das Password zurücksetzen.');
                      res.redirect('/forgot');
                  }
                  transporter.close();
              });
          }
        ], 
        function(err) 
        {
            console.log("INFO: failed resetting password procedure " + err );
            if (err) 
                return next(err);
          
          
            res.redirect('/forgot');
        });
    });
    
    app.get('/reset', function(req, res) 
    {
        console.log("get reset password with token " + req.query.token );
        
        // TODO: add timeout check here
        
        new Model.User({'us_reset_password_token': req.query.token })
        .fetch()
        .then(function(user)
        {
            if (!user) 
            {
              req.flash('forgotMessage', 'Der Link wurde bereits verwendet. Für eine Änderung des Passwords bitte nochmal eine eMail anfordern.');
              return res.redirect('/forgot');
            }

            var userObject= user.toJSON();
            res.render('reset', 
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
                      
                      req.flash('forgotMessage', 'Der Link wurde bereits verwendet. Für eine Änderung des Passwords bitte nochmal anfordern.');
                      
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
              var transporter = mailer.createTransport(
              {
                  host : "smtp.gmail.com",
                  secure : true,
                  port: 465,
                  auth: {
                      user: config.mail_user,
                      pass: config.mail_password
                  }
              });
              
              var mail = 
              {
                  from: "help2day reset <confirmation@grex-app.com>",
                  to: user.us_email,
                  bcc: config.internal_receivers_bcc,
                  subject: "help2day CRM Reset eMail",
                  text: "Hallo, das Password für den Account " + user.us_email + " wurde geändert.\n\nDanke, Dein help2day Team",
                  html: "Hallo, das Password für den Account " + user.us_email + " wurde geändert.<br><br>Danke, Dein help2day Team"
              };

              transporter.sendMail(mail, function(error, response)
              {
                  if (error)
                  {
                      console.log('ERROR: failed to send reset confirmation ' + error);
                      return done(null, false, req.flash('loginMessage', 'Die Reset Bestätigungs eMail konnte nicht gesendet werden.'));
                  }
                  else
                  {
                      console.log("INFO: succeeded to send confirmation mail to " + mail.to );
                      return done(null, false, req.flash('loginMessage', 'Die Reset Bestätigungs eMail wurde an ' + mail.to + ' gesendet.'));
                  }
                  transporter.close();
              });
          }
        ], 
        
        function(err) 
        {
          res.redirect('/login');
        });
    });
    
    
    
    
    
    
    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res)
    {
        req.logout();
        
        res.redirect('/login');
    });
    
};





//=====================================
//FILE UPLOAD =========================
//=====================================


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


function mainWithError ( req, res, err, text )
{
 console.log( 'ERROR: main with error: ' + err + ' and message ' + text );
 
 req.flash ('mainMessage', text );
 
 res.render('main',
 {
     message : req.flash('mainMessage')
 });
}

function mainWithNothing ( req, res, text )
{
 console.log('ERROR: main with nothing: ' + text );
 
 req.flash ('mainMessage', text );
 res.render('main',
 {
     message : req.flash('mainMessage')
 });
}






function isValidImageName ( name )
{
 return name.indexOf(".") < 0;
}



function preparePromotionShop ( promotion )
{
 promotion.pr_open_count= promotion.pr_gift_count- promotion.pr_current_count;
 
 if ( promotion.pr_gift_comment )
     promotion.pr_gift_comment_string= promotion.pr_gift_comment.replace('EINHEITEN',promotion.pr_open_count);
 if ( promotion.pr_user_comment )
     promotion.pr_user_comment_string= promotion.pr_user_comment.replace('STÜCK',promotion.pr_gift_units_per_count);
 
 if ( promotion.pr_start_time )
     promotion.pr_start_time_string= moment(promotion.pr_start_time).format('YYYY-MM-DD HH:mm');
 else
     promotion.pr_start_time_string= moment().format('YYYY-MM-DD HH:mm');
     
 if ( promotion.pr_end_time )
     promotion.pr_end_time_string= moment(promotion.pr_end_time).format('YYYY-MM-DD HH:mm');
 else
     promotion.pr_end_time_string= moment().add( 7, 'day' ).format('YYYY-MM-DD HH:mm');
     
 
 promotion.pr_end_time_offset_string= moment(promotion.pr_end_time).diff(moment(promotion.pr_start_time), 'hours');
 
 //promotion.pr_remaining_time_string= moment().to(moment(promotion.pr_end_time));
 
 if ( promotion.pr_instance_id > 0 )
 {
     promotion.pr_remaining_time_string= moment(promotion.pi_end_time).format('YYYY-MM-DD HH:mm');
     promotion.pr_is_active= ( promotion.pr_open_count > 0 && moment().isBefore(promotion.pi_end_time) );
     //console.log('DEBUG: promotion ' + promotion.pr_id + ' is active ' + promotion.pr_is_active + ' end time ' + promotion.pi_end_time + ' after ' + moment().isBefore(promotion.pi_end_time) + ' count ' + promotion.pr_open_count + " instance id " + promotion.pr_instance_id );
 }
 else
 {
     promotion.pr_is_active= false;
     //console.log('DEBUG: promotion ' + promotion.pr_id + ' is not active ' + promotion.pr_is_active + ' end time ' + promotion.pi_end_time + ' after ' + moment().isBefore(promotion.pi_end_time) + ' count ' + promotion.pr_open_count );
 }
}


function prepareGift ( gift )
{
 gift.gi_redeem_time_string= moment(gift.gi_redeem_time).format('YYYY-MM-DD HH:mm');
 
}

function preparePromotionInstance ( promotion_instance )
{
 if ( promotion_instance.pi_start_time )
     promotion_instance.pi_start_time_string= moment(promotion_instance.pi_start_time).format('YYYY-MM-DD HH:mm');
     
 if ( promotion_instance.pr_end_time )
     promotion_instance.pi_end_time_string= moment(promotion_instance.pi_end_time).format('YYYY-MM-DD HH:mm');
}



function isRoleOfCustomer ( localUserId, localCustomerId, roleName, callback )
{
 var localUser= null;

 DB.knex('lm_users')
 .select(['lm_customer.cu_id'])
 .innerJoin('lm_user_role_map', 'lm_user_role_map.urm_user_id', 'lm_users.us_id')
 .innerJoin('lm_roles', 'lm_roles.ro_id', 'lm_user_role_map.urm_role_id')
 .innerJoin('lm_customer', 'lm_customer.cu_id', 'lm_roles.ro_customer_id')
 .where('lm_roles.ro_name', '=', roleName )
 .where('lm_users.us_id', '=', localUserId )
 .where('lm_customer.cu_id', '=', localCustomerId )
 .then(function(data) 
 {
     var localCustomer= data[0];
     
     //console.log('found customer for role check ' + JSON.stringify(data) );

     if ( localCustomer )
     {
         callback ( localUserId, localCustomerId );
     }
 });
}






//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next)
{
 
 // if user is authenticated in the session, carry on
 if (req.isAuthenticated())
     return next();
 
 // if they aren't redirect them to the home page
 res.redirect('/login');
}
   
    
