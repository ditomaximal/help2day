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


// FLASH KEYS
// loginMessage
// mainMessage
// signupMessage
// forgotMessage




// app/routes.js
module.exports = function(app, passport, handlebars, masterkey, mastersalt )
{
    app.get('/contact', function(req, res)
    {
        res.render('contact');
    });
    app.get('/help', function(req, res)
    {
        res.render('help');
    });

    app.get('/error', function(req, res)
    {
        res.render('error');
    });
    app.get('/dataprotection', function(req, res)
    {
        res.render('dataprotection');
    });
    app.get('/imprint', function(req, res)
    {
        res.render('imprint');
    });
    app.get('/licenses', function(req, res)
    {
        res.render('licenses');
    });
    app.get('/opensource', function(req, res)
    {
        res.render('opensource');
    });



    
    
    /**
     * 
     * KIOSK ADMIN PAGE
     * 
     */    
    
    app.get( '/sig/session/admin', isLoggedIn, function(req, res)
    {
        var session_key= req.query.ks_key || 'standard';

        DB.knex('lm_sig_kiosk_session')
        .where('lm_sig_kiosk_session.ks_key', session_key )
        .then(function(data) 
        {
            var session= data[0];

            res.render('sig_kiosk',
            {
                session: session,
                message : req.flash('sigMessage')
            });

        })
        .catch(function (err) 
        {
            mainWithError ( req, res, err, 'Die Sessiondaten konnten nicht geladen werden.' );

            console.log('ERROR: failed to find/update session ' + err );
        });
    });
    
    app.get( '/sig/animation/:command', isLoggedIn, function(req, res)
    {
        var session_key= req.query.ks_key || 'standard';
        var command= req.params.command || 'stop';
        

        DB.knex('lm_sig_kiosk_session')
        .where('lm_sig_kiosk_session.ks_key', session_key )
        .then(function(data) 
        {
            var session= data[0];

            if ( session ){
                var animation= 0;
                
                if ( command === 'start' ){
                    animation= 1;
                }

                console.log('INFO: found session command ' + command );
                
                DB.knex('lm_sig_kiosk_session')
                .update('lm_sig_kiosk_session.ks_animation', animation )
                .where('lm_sig_kiosk_session.ks_key', session_key )
                .then(function(data) 
                {
                    res.redirect('/sig/session/admin?ks_key=' + session_key );
                });
            }
        })
        .catch(function (err) 
        {
            mainWithError ( req, res, err, 'Die Sessiondaten konnten nicht geladen werden.' );
            console.log('ERROR: failed to find/update session ' + err );
        });
    });
    
    
    
    
    
    

    
    
    // =====================================
    // MAIN SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/', function(req, res)
    {
        // render the page and pass in any flash data if it exists
        res.render('login',
        {
            message : req.flash('mainMessage')
        });
    });
    
    app.get('/main', isLoggedIn, function(req, res)
    {
        res.render('main',
        {
            user : req.user,
            message : req.flash('mainMessage')
        });
    });

    
    
    
    
    // =====================================
    // CUSTOMERS SECTION ===================
    // =====================================
    
    app.get('/customers', isLoggedIn, function(req, res)
    {
        if ( req.user.us_superadmin ){
                
            DB.knex('lm_customer')
            .where('lm_customer.cu_default_category', '=', config.strict_category )
            .then(function(data){
                
                var customers= data;

                for (var i=0; i < customers.length; i++) {
                    var customer= customers[i];
                    time= moment( customer.cu_created );
                    customer.cu_created_string= time.format('YYYY-MM-DD  HH:mm');
                }
                
                res.render('customers',
                {
                    user : req.user,
                    customers : customers
                });
            })
            .catch(function (err) 
            {
                console.log('failed to find customers ' + err );
                mainWithError ( req, res, err, 'Die Kundenliste konnten nicht geladen werden.' );
            });
            
        }
        else{
            console.log('failed to find privileges ' + err );
            mainWithNothing ( req, res, 'Diese Funktion erfordert erweiterte Rechte.' );
        }
    });
    
    

    app.get('/customer/validation', isLoggedIn, function(req, res)
    {
        var code= req.query.cv_code;
        var customerId= req.query.cv_customer_id;
        
        console.log('INFO: customer validation with code ' + code + ' for customer id ' + customerId + ' with user customer id ' + req.user.us_customer_id );

        if ( req.user.us_superadmin ){
                
            DB.knex('lm_customer')
            .where('lm_customer.cu_id', '=', customerId )
            .then(function(data){
                
                var customer= data[0];
                
                res.render('validation',
                {
                    user : req.user,
                    customer : customer,
                    code : code
                });
            })
            .catch(function (err) 
            {
                console.log('ERROR: failed to find customers ' + err );
                mainWithError ( req, res, err, 'Die Kundenliste konnten nicht geladen werden.' );
            });
            
        }
        else{
            console.log('INTRUSION: failed to find privileges ' );
            mainWithNothing ( req, res, 'Diese Funktion erfordert erweiterte Rechte.' );
        }
    });

    
    
    
    app.post('/customer/validation', isLoggedIn, function(req, res)
    {
        var code= req.body.cv_code;
        var customerId= req.body.cv_customer_id;
        var validatorComment= req.body.cv_comment || 'no comment';
        
        console.log('DEBUG: customer validation code ' + code + ' for customer id ' + customerId + ' with user customer id ' + req.user.us_customer_id );

        if ( req.user.us_superadmin ){
                
            DB.knex('lm_customer_validation')
            .insert({
                cv_customer_id: customerId,
                cv_code: code,
                cv_comment: validatorComment,
                cv_user_id: req.user.us_id,
                cv_nickname: req.user.us_nickname
            })
            .then(function(data){

                DB.knex('lm_customer_validation')
                .orderBy('lm_customer_validation.cv_code', 'asc')
                .where ('lm_customer_validation.cv_customer_id', customerId )
                .then(function(data){
                 
                    var validations= data;

                    var update={};
                    
                    var cu_confirmation1= 0;
                    var cu_confirmation2= 0;
                    var cu_data_confirmation= 0;
                    for (var i=0; i < validations.length; i++) 
                    {
                        var validation= validations[i];
                        
                        if ( validation ){
                            
                            if ( validation.cv_code == 'cv1' ){
                                
                                cu_confirmation1= 1;
                                update.cu_status= 'Prüfung';
                            }
                                
                            if ( validation.cv_code == 'cv2' ){
                                
                                update.cu_status= 'Begutachtung';
                                cu_confirmation2= 1;
                            }
                            
                            if ( validation.cv_code == 'cv3' ){
                                
                                update.cu_status= 'Vollständigkeit';
                                cu_data_confirmation= 1;
                            }
                        }
                    }

                    
                    var sendEmailToCustomer= false;
                    
                    if ( cu_confirmation1 && cu_confirmation2 && cu_data_confirmation && code == 'cv4' )                    {
                        
                        console.log('INFO: customer validation activating customer for customer id ' + customerId );

                        update.cu_validated= 1;
                        update.cu_status= 'aktiviert';
                        sendEmailToCustomer= true;
                        
                    }
                    else{
                        

                    }
                    
                    DB.knex('lm_customer')
                    .update( update )
                    .where('lm_customer.cu_id', customerId )
                    .then(function(data){

                        DB.knex('lm_customer')
                        .where('lm_customer.cu_id', customerId )
                        .then(function(data){
                            
                            var customer= data[0];
    
                            var data= { user : req.user, customer: customer, status: update.cu_status, comment: validatorComment };
                            
                            console.log( 'DEBUG: data for mail ' + JSON.stringify(data) );
                            
                            grex.sendMailByTemplateAsync ( data, 'validationstep', config.master_admin_receivers, config.internal_receivers_bcc, 'Validerung einer NGO' );
    
                            if ( sendEmailToCustomer ){
                                
                                grex.sendMailByTemplateAsync ( data, 'activation', customer.cu_email, config.master_admin_receivers, 'Aktivierung von help2day' );
                            }
    
                            res.redirect('/settings/customer?cu_id=' + customerId );
                        });
                    });
                });
            })
            .catch(function (err) 
            {
                console.log('ERROR: failed to find customers ' + err );
                mainWithError ( req, res, err, 'Die Kundenliste konnten nicht geladen werden.' );
            });
        }
        else{
            console.log('INTRUSION: failed to find privileges for api call.');
            mainWithNothing ( req, res, 'Diese Funktion erfordert erweiterte Rechte.' );
        }
    });
    
    
    
    
    // =====================================
    // SETTINGS SECTION ====================
    // =====================================
    
    app.post('/settings', isLoggedIn, function(req, res)
    {
        var localUser= null;
        var phone= req.body.us_phone;

        var encryptedPhone= grex.encrypt (phone,mastersalt,masterkey);
        
        new Model.User({'us_id' : req.user.us_id })
        .fetch({withRelated:['customer']})
        .then(function (user) 
        {
            user.save(
            {
                us_nickname: req.body.us_nickname || user.get('us_nickname'),
                us_phone_encrypted: encryptedPhone
            })
            .then(function () 
            {
                res.redirect('/main');
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user for store ' + err );
            mainWithError ( req, res, err, 'Die Einstellungen konnten nicht gespeichert werden.' );
        });
    });

    
    
    app.get('/settings', isLoggedIn, function(req, res)
    {
        var localUser= null;

        new Model.User({'us_id' : req.user.us_id })
        .fetch()
        .then(function (user) 
        {
            localUser= user.toJSON();
            
            DB.knex('lm_users')
            .select(['lm_roles.*','lm_customer.cu_full_name','lm_customer.cu_id'])
            .innerJoin('lm_user_role_map', 'lm_user_role_map.urm_user_id', 'lm_users.us_id')
            .innerJoin('lm_roles', 'lm_roles.ro_id', 'lm_user_role_map.urm_role_id')
            .innerJoin('lm_customer', 'lm_customer.cu_id', 'lm_roles.ro_customer_id')
            .where('lm_users.us_id', '=', localUser.us_id )
            .then(function(data) 
            {
                var localRoles= data;
                //console.log('found user with roles' + JSON.stringify(data) );
                
                for (var i=0; i < localRoles.length; i++) 
                {
                    var role= localRoles[i];
                    
                    if ( role.ro_customer_id == localUser.us_customer_id && role.ro_name == localUser.us_role )
                        role.ro_is_active= 1;
                    else
                        role.ro_is_active= 0;
                }
                
                //console.log('found user with settings ' + JSON.stringify(req.user) );
                
                res.render('settings',
                {
                    user : req.user,
                    roles : localRoles
                });
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
            mainWithError ( req, res, err, 'Die Einstellungen konnten nicht geladen werden.' );
        });
    });
    
    
    
    
    // =====================================
    // ROLES SECTION =======================
    // =====================================

    app.get('/settings/take/role', isLoggedIn, function(req, res)
    {
        var localUser= null;
        var localRoleId= req.query.ro_id;

        DB.knex('lm_roles')
        .leftJoin('lm_user_role_map', 'lm_user_role_map.urm_role_id', 'lm_roles.ro_id')
        .where('lm_roles.ro_id', '=', localRoleId )
        .where('lm_user_role_map.urm_user_id', '=', req.user.us_id )
        .then(function(data) 
        {
            var localRoles= data[0];
            
            console.log('INFO: update of user ' + req.user.us_id + ' with role ' + JSON.stringify(data) );

            if ( localRoles ){
                
                DB.knex('lm_users')
                .where ( 'lm_users.us_id', req.user.us_id )
                .update (
                {
                    us_customer_id: localRoles.ro_customer_id,
                    us_role: localRoles.ro_name 
                })
                .then(function()
                {
                    res.redirect('/settings');
                });
            }
            else{
                
                console.log('INTRUSION: failed to find role ' + localRoleId + ' for user ' + req.user.us_id );
                
                mainWithNothing ( req, res, 'Die Einstellungen konnten nicht geladen werden.' );
                
            }
        });
    });

    
    
    
    
    // =====================================
    // CUSTOMER SECTION ====================
    // =====================================
    
    app.post('/settings/customer', isLoggedIn, function(req, res)
    {
        var localUser= null;
        var localCustomerId= req.query.cu_id;

        isRoleOfCustomer ( req.user.us_id, localCustomerId, 'admin', function ( localUserId, localCustomerId )
        {
            DB.knex('lm_customer')
            .where('lm_customer.cu_id', '=', localCustomerId )
            .then(function(data) 
            {
                var localCustomer= data[0];
                
                if ( localCustomer )
                {
                    DB.knex('lm_customer')
                    .where ( 'lm_customer.cu_id', localCustomer.cu_id )
                    .update (
                    {
                        cu_tax_id: req.body.cu_tax_id || localCustomer.cu_tax_id || 'none',
                        cu_reference: req.body.cu_reference || localCustomer.cu_reference  || 'none',
                        cu_email: req.body.cu_email || localCustomer.cu_email || '',
                        cu_address: req.body.cu_address || localCustomer.cu_address || '',
                        cu_default_long: req.body.cu_default_long || localCustomer.cu_default_long || '0',
                        cu_default_lat: req.body.cu_default_lat || localCustomer.cu_default_lat || '0',
                        cu_default_category: req.body.cu_default_category || localCustomer.cu_default_category || 'none',
                        cu_full_name: req.body.cu_full_name || localCustomer.cu_full_name || 'nobody'
                    })
                    .then(function()
                    {
                        res.redirect('/settings');
                    });
                }
                else
                {
                    console.log('INTRUSION: failed to find customer ' );
                    mainWithError ( req, res, null, 'Die Einstellungen konnten nicht geladen werden.' );
                }
            })
            .catch(function(err)
            {
                console.log('ERROR: failed to store customer ' + err );
                mainWithError ( req, res, err, 'Die Einstellungen konnten nicht gespeichert werden.' );
            });
        }); 
    });

    
    
    
    
    app.get('/settings/customer', isLoggedIn, function(req, res)
    {
        var localUser= null;
        var requestedCustomerId= req.query.cu_id;

        new Model.User({'us_id' : req.user.us_id })
        .fetch()
        .then(function (user) 
        {
            localUser= user.toJSON();
            
            var customerId= req.user.us_customer_id;

            //console.log('DEBUG: found customer id ' + customerId + " and requested customer id " + requestedCustomerId + ' and user superadmin ' + req.user.us_superadmin );

            if ( req.user.us_superadmin &&  requestedCustomerId ){
                customerId= requestedCustomerId;
                console.log('INFO: using super admin credentials to edit customer ' + customerId + " by user " + req.user.us_id );
            }
            
            DB.knex('lm_customer')
            .select(['lm_customer.*'])
            .where('lm_customer.cu_id', '=', customerId )
            .then(function(data) 
            {
                var localCustomer= data[0];
                
                if ( localCustomer )
                {
                    DB.knex('lm_users')
                    .select(['lm_roles.*','lm_users.us_nickname','lm_users.us_email','lm_user_role_map.*','lm_customer.cu_id'])
                    .innerJoin('lm_user_role_map', 'lm_user_role_map.urm_user_id', 'lm_users.us_id')
                    .innerJoin('lm_roles', 'lm_roles.ro_id', 'lm_user_role_map.urm_role_id')
                    .innerJoin('lm_customer', 'lm_customer.cu_id', 'lm_roles.ro_customer_id')
                    .where('lm_customer.cu_id', '=', customerId )
                    .then(function(data) 
                    {
                        var localRoles= data;
                        
                        DB.knex('lm_image_cache')
                        .where('lm_image_cache.imc_customer_id', customerId )
                        .then(function(data)
                        {
                            var images= data;

                            DB.knex('lm_profile')
                            .leftJoin('lm_profile_image_map', 'lm_profile_image_map.pim_profile_id', 'lm_profile.pro_id')
                            .where('lm_profile.pro_application', 'help2day' )
                            .then(function(data)
                            {
                                var profiles= data;
                                
                                //console.log('found profile for admin user ' + JSON.stringify(data) );
                                
                                
                                DB.knex('lm_customer_validation')
                                .orderBy('lm_customer_validation.cv_code', 'asc')
                                .where ('lm_customer_validation.cv_customer_id', customerId )
                                .then(function(data){
                                 
                                    var validations= data;

                                    localCustomer.cu_confirmation1= 0;
                                    localCustomer.cu_confirmation2= 0;
                                    localCustomer.cu_data_confirmation= 0;
                                    
                                    localCustomer.cu_activation_block= 1;
                                    localCustomer.cu_confirmation1_block= 0;
                                    localCustomer.cu_confirmation2_block= 0;
                                    
                                    localCustomer.cu_confirmation1hint= 'offen';
                                    localCustomer.cu_confirmation2hint= 'offen';
                                    localCustomer.cu_data_confirmationhint= 'offen';
                                    localCustomer.cu_activationhint= 'offen';
                                    
                                    
                                    /** TODO: vier augen prinzip erzwingen */
                                    /** TODO: aktivierungsbutton erst öffnen, wenn die schritte vorher erfüllt sind */
                                    
                                    var userIdOfValidation1= 0;
                                    var userIdOfValidation2= 0;
                                    
                                    for (var i=0; i < validations.length; i++) 
                                    {
                                        var validation= validations[i];
                                        
                                        if ( validation ){
                                            
                                            if ( validation.cv_code == 'cv1' ){
                                                localCustomer.cu_confirmation1= 1;
                                                localCustomer.cu_confirmation1hint= validation.cv_nickname + ": " + validation.cv_comment;
                                                userIdOfValidation1= validation.cv_user_id;
                                            }
                                                
                                            if ( validation.cv_code == 'cv2' ){
                                                localCustomer.cu_confirmation2= 1;
                                                localCustomer.cu_confirmation2hint= validation.cv_nickname + ": " + validation.cv_comment;
                                                userIdOfValidation2= validation.cv_user_id;
                                            }
                                            
                                            if ( validation.cv_code == 'cv3' ){
                                                localCustomer.cu_data_confirmation= 1;
                                                localCustomer.cu_data_confirmationhint= validation.cv_nickname + ": " + validation.cv_comment;
                                            }
                                            if ( validation.cv_code == 'cv4' ){
                                                localCustomer.cu_activationhint= validation.cv_nickname+ ": " + validation.cv_comment;
                                            }
                                        }
                                    }

                                    /**
                                     * enforce 4-eye principle
                                     */
                                    if ( userIdOfValidation1 === req.user.us_id ){

                                        localCustomer.cu_confirmation2_block= 1;
                                        localCustomer.cu_confirmation2hint+= ' (4 Augen)';
                                    }
                                    
                                    if ( userIdOfValidation2 === req.user.us_id ){

                                        localCustomer.cu_confirmation1_block= 1;
                                        localCustomer.cu_confirmation1hint+= ' (4 Augen)';
                                    }

                                    /**
                                     * enforce handling of successor states before activation
                                     */
                                    if ( localCustomer.cu_confirmation1 && localCustomer.cu_confirmation2 && localCustomer.cu_data_confirmation ){
                                        
                                        localCustomer.cu_activation_block= 0;
                                    }
                                    else{
                                        
                                        localCustomer.cu_activationhint+= ' Prozess nicht erfüllt.';
                                    }
                                    
                                    
                                    
                                    res.render('customer',
                                    {
                                        user : req.user,
                                        customer : localCustomer,
                                        roles : localRoles,
                                        images : images,
                                        profiles : profiles
                                    });
                                    
                                });
                            });
                        });
                    });
                }
                else
                {
                    console.log('INTRUSION: failed to find customer ' );
                    mainWithError ( req, res, null, 'Die Einstellungen konnten nicht geladen werden.' );
                }
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user ' + err );
            mainWithError ( req, res, err, 'Die Einstellungen konnten nicht geladen werden.' );
        });
    });

    
    
    app.get('/profile', isLoggedIn, function(req, res)
    {
        var localUser= req.user;
        var profileId= req.query.pro_id;

        DB.knex('lm_profile')
        .where('lm_profile.pro_id', profileId )
        .then(function(data)
        {
            var profile= data[0];
            console.log('found profile for admin user ' + JSON.stringify(data) );
            
            DB.knex('lm_profile_image_map')
            .where('lm_profile_image_map.pim_profile_id', profileId )
            .where('lm_profile_image_map.pim_customer_id', localUser.us_customer_id )
            .then(function(data)
            {
                var profileMap= data[0];
            
                DB.knex('lm_image_cache')
                .where('lm_image_cache.imc_customer_id', req.user.us_customer_id )
                .then(function(data)
                {
                    var images= data;

                    res.render('profile',
                    {
                        user : req.user,
                        images : images,
                        profile : profile,
                        profilemap : profileMap
                    });
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find user ' + err );
            mainWithError ( req, res, err, 'Die Einstellungen konnten nicht geladen werden.' );
        });
    });
    
    
    
    
    
    
    
    // =====================================
    // ROLES SECTION =======================
    // =====================================

    app.get('/roles', isLoggedIn, function(req, res)
    {
        DB.knex('lm_users')
        .select(['lm_roles.*','lm_users.us_nickname','lm_users.us_email_encrypted','lm_user_role_map.*','lm_customer.cu_id'])
        .innerJoin('lm_user_role_map', 'lm_user_role_map.urm_user_id', 'lm_users.us_id')
        .innerJoin('lm_roles', 'lm_roles.ro_id', 'lm_user_role_map.urm_role_id')
        .innerJoin('lm_customer', 'lm_customer.cu_id', 'lm_roles.ro_customer_id')
        .where('lm_customer.cu_id', '=', req.user.us_customer_id )
        .then(function(data) 
        {
            var localRoles= data;
            
            
            
            
            for (var i=0; i < localRoles.length; i++) 
            {
                var role= localRoles[i];
                
                if ( role.us_email_encrypted ){
                    role.us_email= grex.decrypt ( role.us_email_encrypted, mastersalt, masterkey );
                }else{
                    role.us_email= '';
                }
            }
            
            res.render('roles',
            {
                user : req.user,
                roles : localRoles
            });
        });
    });


    
    app.get('/settings/create/role', isLoggedIn, function(req, res)
    {
        var localUser= null;
        var localCustomerId= req.query.cu_id;

        res.render('role',
        {
            user : req.user
        });
    });
    
    app.post('/settings/create/role', isLoggedIn, function(req, res)
    {
        var localUser= null;
        var localCustomerId= req.user.us_customer_id;
        var email= req.body.us_email;
        
        console.log('INFO: new role for user ' + req.user.us_id + ' with role ' + req.body.ro_name );
        
        var emailLower= email.toLowerCase();
        var encryptedEmail= grex.encrypt (emailLower,mastersalt,masterkey);
        
        
        DB.knex('lm_users')
        .select(['lm_users.*'])
        .where('lm_users.us_email_encrypted', '=', encryptedEmail )
        .then(function(data) 
        {
            var localUser= data[0];
            
            console.log('DEBUG: found user for new role ' + JSON.stringify(data) );
            
            if ( localUser )
            {
                DB.knex('lm_roles')
                .where('lm_roles.ro_name', req.body.ro_name)
                .where('lm_roles.ro_customer_id', localCustomerId )
                .then(function(data) 
                {
                    var localRole= data[0];
                    
                    DB.knex('lm_user_role_map')
                    .insert({ 
                        urm_role_id: localRole.ro_id, 
                        urm_user_id: localUser.us_id
                        })
                    .then(function(data) 
                    {
                        //console.log('insert returned  ' + JSON.stringify(data) );
                        res.redirect('/roles');
                    });
                });
            }
            else
            {
                req.flash ('roleMessage', 'Ein Benutzer mit der eMail ' + req.body.us_email + ' ist nicht registriert.' );
                res.render('role',
                {
                    message : req.flash('roleMessage')
                });
            }
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find user for role ' + err );
            
            req.flash ('roleMessage', 'Ein Benutzer mit der eMail ' + req.body.us_email + ' ist nicht registriert.' );
            res.render('role',
            {
                message : req.flash('roleMessage')
            });
        });
        
    });
    
    
    
    
    // =====================================
    // RECIPIENTS SECTION ==================
    // =====================================
    // parameters
    // page

    app.get('/recipients', isLoggedIn, function(req, res)
    {
        var localUserUID= req.user.us_uid;
        var localPage= parseInt(req.query.page || "0", 10);
        
        var localPageSize= config.pageSize || 10;
        var localPagination= {};
        var localCustomerId= req.user.us_customer_id || 0;
        
        if ( localPage < 0 )
        {
            localPage= 0;
            localPagination.page= localPage;
            localPagination.nextpage= localPage+1;
            localPagination.previouspage= 0;
        }
        else
        {
            localPagination.page= localPage;
            localPagination.nextpage= localPage+1;
            localPagination.previouspage= localPage-1;
        }

        
        console.log('DEBUG: loading recipients for ' + localCustomerId + ' at page ' + localPage );
        
        DB.knex('lm_recipients')
        .select(['lm_recipients.*', 'lm_users.us_nickname'])
        .leftJoin('lm_users', 'lm_users.us_id', 'lm_recipients.re_user_id')
        .where('lm_recipients.re_customer_id', '=', localCustomerId )
        .then(function(data) 
        {
            for ( var i= 0; i< data.length; i++ ){
                var recipient= data[i];
                
                prepareRecipient ( recipient, mastersalt, masterkey );
            }
            
            if ( !data )
            {
                localPagination.nextpage= 0;
            }
            
            res.render('recipients',
            {
                user : req.user,
                pagination : localPagination,
                recipients : data,
                message : req.flash('recipientsMessage')
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find receiver list ' + err );
            mainWithError ( req, res, err, 'Die Empfängerliste konnte nicht geladen werden.' );
        });
    });

    
    app.get('/recipient/create', isLoggedIn, function(req, res)
    {
        var localCustomerId= req.user.us_customer_id || 0;

        console.log('INFO: creating recipient for customer ' + localCustomerId );

        if ( localCustomerId < 1 )
        {
            console.log('ERROR: no default customer assigned ');
            mainWithError ( req, res, null, 'Es ist keine NGO zugeordnet.' );
        }
        else
        {
            new Model.Recipient(
            {
                re_customer_id : localCustomerId,
                re_group_id : 1
            })
            .save()
            .then(function(recipient) 
            {
                //console.log('created recipient %j' , recipient.toJSON() );
                res.render('recipient',
                {
                    user : req.user,
                    recipient : recipient.toJSON()
                });
            })
            .catch(function (err) 
            {
                console.log('ERROR: failed to create recipient ' + err );
                mainWithError ( req, res, err, 'Der Empfänger konnte nicht angelegt werden.' );
            });
        }
    });

    app.get('/recipient', isLoggedIn, function(req, res)
    { 
        var recipientID= req.query.re_id;
        
        console.log('INFO: loading recipient with id ' + recipientID );
        
        new Model.Recipient({'re_id' : recipientID })
        .fetch()
        .then(function (data) 
        {
            var recipient= data.toJSON()

            
            prepareRecipient ( recipient, mastersalt, masterkey );
            
            res.render('recipient',
            {
                user : req.user,
                recipient : recipient
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to load recipient ' + err );
            mainWithError ( req, res, err, 'Der Empfänger konnte nicht geladen werden.' );
        });
    });
    
    app.post('/recipient', isLoggedIn, function(req, res)
    { 
        var recipientID= req.query.re_id;
        var email= req.body.re_email;
        var phone= req.body.re_phone;
        
        
        var emailLower= email.toLowerCase();
        var encryptedEmail= grex.encrypt (emailLower,mastersalt,masterkey);
        var encryptedPhone= grex.encrypt (phone,mastersalt,masterkey);

        
        new Model.Recipient({'re_id' : recipientID })
        .fetch()
        .then(function (recipient) 
        {
            //console.log ('update of recipient ' + JSON.stringify( req.body ) )
            
            recipient.save(
            {
                re_email_encrypted: encryptedEmail,
                re_phone_encrypted: encryptedPhone
            })
            .then(function () 
            {
                res.redirect ( '/recipients' );
            });
        })
        .catch(function (err) 
        {
            console.log('failed to load recipient ' + err );
            mainWithError ( req, res, err, 'Der Empfänger konnte nicht geladen werden.' );
        });
    });
    
    
    app.get('/recipient/import', isLoggedIn, function(req, res)
    {
        var localCustomerId= req.user.us_customer_id || 0;

        //console.log('creating recipient for customer ' + localCustomerId );

        res.render('recipient_import',
        {
            user : req.user
        });
    });

    app.post('/recipient/import', isLoggedIn, function(req, res)
    { 
        var recipients= req.body.re_import;
        var localCustomerId= req.user.us_customer_id || 0;
        
        //console.log('storing recipient list ' + recipients );
        
        var splitRecipients= recipients.split(/[\s,; ]+/)
        
        //console.log('INFO: storing recipient array ' + splitRecipients );
        
        var duplicateCount= 0;
        var insertCount= 0;
        var invalidCount= 0;
        
        async.each ( splitRecipients, function(recipient, callback)
        {
            // Call an asynchronous function, often a save() to DB
            
            
            var emailLower= recipient.toLowerCase();
            var encryptedEmail= grex.encrypt (emailLower,mastersalt,masterkey);

            
            console.log('INFO: handling recipient for email ' + encryptedEmail );
            
            
            if ( validator.isEmail(recipient) )
            {
                DB.knex('lm_recipients')
                .where('lm_recipients.re_customer_id', '=', localCustomerId )
                .where('lm_recipients.re_email_encrypted', '=', encryptedEmail )
                .then(function(data) 
                {
                    //console.log('found recipient for email ' + JSON.stringify(data) );
                    
                    if ( !data[0] )
                    {
                        //console.log('storing recipient ' + recipient );
                        
                        DB.knex('lm_recipients')
                        .insert (
                        {
                            re_customer_id : localCustomerId,
                            re_group_id : 1,
                            re_email_encrypted: encryptedEmail
                        })
                        .then(function()
                        {
                            //console.log('stored recipient ' + recipient );
                            
                            callback();
                            
                        });
                        
                        insertCount++;
                    }
                    else
                    {
                        duplicateCount++;
                        callback();
                    }
                })
                .catch(function (err) 
                {
                    console.log('ERROR: failed to find recipient ' + err );
                    callback();
                });
            }
            else
            {
                invalidCount++;
                callback();
            }
        },
        // 3rd param is the function to call when everything's done
        function(err)
        {
            var message= "Import von Empfängern mit " + insertCount + " neuen Empfängern, " + duplicateCount + " Duplikaten " + " und " + invalidCount + " ungültigen eMail Adressen.";
            
            req.flash ('recipientsMessage', message );
            res.redirect ( '/recipients' );
        });
    });
    

    
    // =====================================
    // HOTSPOTS SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/hotspots', isLoggedIn, function(req, res)
    {
        var localUserUID= req.user.us_uid;
        
        //console.log('loading hotspots for customer ' + req.user.us_customer_id );

        DB.knex('lm_customer')
        .select(['lm_customer.*'])
        .where('lm_customer.cu_id', '=', req.user.us_customer_id )
        .then(function(data) 
        {
            var localCustomer= data[0];

            DB.knex('lm_like')
            .select('lm_like.*')
            .join('lm_users','lm_users.us_uid','lm_like.li_user')
            .where('lm_users.us_id', localCustomer.cu_user_id )
            .where('lm_like.li_strict_category', config.strict_category )
            .orderBy('li_comment','ASC')
            .then(function(hotspots) 
            {
                //console.log('found hotspots ' , JSON.stringify(hotspots) );
                res.render('hotspots',
                {
                    hotspots : hotspots,
                    user : req.user
                });
            })
        
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspots ' + err );
            mainWithError ( req, res, err, 'Die Standortliste konnte nicht geladen werden.' );
        });
    });

    
    
    app.get('/hotspot', isLoggedIn, function(req, res)
    {
        var hotspotId = req.query.li_id;

        //console.log('loading hotspot with id ' + hotspotId );

        // TODO promotions need translation
        
        new Model.Hotspot({ 'li_id': hotspotId })
        .fetch({withRelated:['promotions']})
        .then(function(hotspot) 
        {
            //console.log('found hotspot %j' , hotspot.toJSON() );
            res.render('hotspot',
            {
                user : req.user,
                hotspot : hotspot.toJSON()
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspot ' + err );
            mainWithError ( req,  res, err, 'Der Hotspot konnte nicht geladen werden.' );
        });
    });

    
    
    app.get( '/wir/brauchen/:pr_id', function(req, res)
    {
        var promotionId = req.params.pr_id;

        console.log('redirecting static ticket with id ' + promotionId );
        
        res.redirect( config.webapp + config.deeplinkinstance + '/'+promotionId);
    });
    
    app.get( config.deeplink + '/:pr_id', function(req, res)
    {
        var promotionId = req.params.pr_id;

        console.log('redirecting static ticket with id ' + promotionId );
        
        res.redirect( config.webapp + config.deeplinkinstance + '/'+promotionId);
    });
    
    
    
    app.get('/hotspot/create', isLoggedIn, function(req, res)
    {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        var localUser= req.user;
        var fromHotspotId= req.query.li_copy_id;
        
        console.log('DEBUG: creating hotspot for user '+ localUser + ' with copy id ' + fromHotspotId );
        console.log('DEBUG: found local user ' + JSON.stringify(localUser) );

        if ( localUser.us_admin )
        {
            DB.knex('lm_customer')
            .join('lm_users','lm_users.us_id','lm_customer.cu_user_id')
            .where('lm_customer.cu_id', '=', localUser.us_customer_id )
            .then(function(data) 
            {
                var localCustomer= data[0];
                
                console.log('DEBUG: found owning customer for hotspot create ' + JSON.stringify(localCustomer) );
                
                if ( localCustomer )
                {
                    if ( fromHotspotId )
                    {
                        new Model.Hotspot({'li_id' : fromHotspotId })
                        .fetch()
                        .then(function (hotspot) 
                        {
                            //console.log ('update of hotspot ' + JSON.stringify( req.body ) )
                            
                            new Model.Hotspot(
                            {
                                li_like:1.0,
                                li_user:localCustomer.us_uid,
                                li_ip: ip || 'undefined',
                                li_comment:  ( req.body.li_comment || hotspot.get('li_comment') ) + ' Kopie ',
                                li_detail: req.body.li_detail || hotspot.get('li_detail'),
                                li_category: req.body.li_category || hotspot.get('li_category'),
                                li_strict_category: config.strict_category || '',
                                li_long: req.body.li_long || hotspot.get('li_long'),
                                li_lat: req.body.li_lat || hotspot.get('li_lat'),
                                li_promotion: req.body.li_promotion || hotspot.get('li_promotion'),
                                li_special_url: req.body.li_special_url || hotspot.get('li_special_url'),
                                li_address: req.body.li_address || hotspot.get('li_address'),
                                li_phone: req.body.li_phone || hotspot.get('li_phone'),
                                li_image_ref: hotspot.get('li_image_ref') || localCustomer.cu_default_image_ref || 'smile',
                                li_marker_reference: hotspot.get('li_marker_reference') || localCustomer.cu_default_marker,
                                li_contact_name: req.body.li_contact_name || hotspot.get('li_contact_name')
                            })
                            .save()
                            .then(function(hotspot) 
                            {
                                //console.log('created hotspot %j' , hotspot.toJSON() );
                                res.render('hotspot',
                                {
                                    user : req.user,
                                    hotspot : hotspot.toJSON()
                                });
                            });
                        })
                    }
                    else
                    {
                        new Model.Hotspot(
                        {
                            li_long: localCustomer.cu_default_long || '16.37',
                            li_lat: localCustomer.cu_default_lat || '48.20',
                            li_like:1.0,
                            li_user:localCustomer.us_uid,
                            li_ip: ip || 'undefined',
                            li_comment:'Titel',
                            li_detail:'Beschreibung',
                            li_image_ref: localCustomer.cu_default_image_ref || 'smile',
                            li_marker_reference: localCustomer.cu_default_marker,
                            li_promotion:'www.help2day.org',
                            li_category: localCustomer.cu_default_category || 'none',
                            li_strict_category: config.strict_category || ''
                        })
                        .save()
                        .then(function(hotspot) 
                        {
                            //console.log('created hotspot %j' , hotspot.toJSON() );
                            res.render('hotspot',
                            {
                                user : req.user,
                                hotspot : hotspot.toJSON()
                            });
                        });
                    }
                }
                else
                {
                    console.log ( 'WARNING: user has no customer set to create a hotspot ' + localUser.cu_id )
                    mainWithNothing ( req, res, 'Der Hotspot konnte nicht angelegt werden. Fehler in NGO Daten.' );
                }
            })
            .catch(function (err) 
            {
                console.log('WARNING: failed to store hotspot ' + err );
                mainWithError ( req, res, err, 'Der Hotspot konnte nicht angelegt werden.' );
            });
        }
        else
        {
            console.log ( 'WARNING: rejected user to create a hotspot, user id ' + localUser.us_id )
            mainWithNothing ( req, res, 'Der Hotspot konnte nicht angelegt werden. Fehlende Rechte.' );
        }
    });
    
    
    app.post('/hotspot', isLoggedIn, function(req, res)
    {
        var hotspotID= req.query.li_id;
        //console.log('storing hotspot with id ' + hotspotID );
        
        new Model.Hotspot({'li_id' : hotspotID })
        .fetch()
        .then(function (hotspot) 
        {
            console.log ('update of hotspot ' + JSON.stringify( req.body ) )
            
            hotspot.save(
            {
                li_comment: req.body.li_comment || hotspot.get('li_comment'),
                li_detail: req.body.li_detail || hotspot.get('li_detail'),
                li_category: req.body.li_category || hotspot.get('li_category'),
                li_long: req.body.li_long || hotspot.get('li_long'),
                li_lat: req.body.li_lat || hotspot.get('li_lat'),
                li_promotion: req.body.li_promotion,
                li_special_url: req.body.li_special_url,
                li_address: req.body.li_address,
                li_phone: req.body.li_phone,
                li_contact_name: req.body.li_contact_name
            })
            .then(function () 
            {
                res.redirect('/hotspots#' + hotspotID);
            });
        })
        .catch(function (err) 
        {
            console.log('failed to load hotspot ' + err );
            mainWithError ( req, res, err, 'Der Hotspot konnte nicht gespeichert werden.' );
        });
    });
    
    
    
    app.get('/hotspot/location', isLoggedIn, function(req, res)
    {
        var hotspotID= req.query.li_id;
        console.log('loading hotspot location map for id ' + hotspotID );
        
        new Model.Hotspot({'li_id' : hotspotID })
        .fetch()
        .then(function (hotspot) 
        {
            //console.log('found hotspot for location %j' , hotspot.toJSON() );
            res.render('hotspot_location',
            {
                user : req.user,
                hotspot : hotspot.toJSON()
            });
        })
        .catch(function (err) 
        {
            console.log('failed to load hotspot ' + err );
            mainWithError ( req, res, err, 'Der Hotspot konnte nicht geladen werden.' );
        });
        
    });
    
    
    app.get('/hotspot/setlocation', isLoggedIn, function(req, res)
    {
        var hotspotID= req.query.li_id;
        console.log('setting hotspot location for id ' + hotspotID );
        
        new Model.Hotspot({'li_id' : hotspotID })
        .fetch()
        .then(function (hotspot) 
        {
            hotspot.save(
            {
                li_long: req.query.li_long || hotspot.get('li_long'),
                li_lat: req.query.li_lat || hotspot.get('li_lat'),
            })
            .then(function () 
            {
                console.log('rendering hotspot id ' + hotspotID );

                res.render('hotspot',
                {
                    user : req.user,
                    hotspot : hotspot.toJSON()
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to load hotspot ' + err );
            mainWithError ( req, res, err, 'Der Hotspot konnte nicht geladen werden.' );
        });
        
    });
    
    
    app.get('/hotspot/action', isLoggedIn, function(req, res)
    {
        var hotspotID= req.query.li_id;
        var action= req.query.action;
        
        console.log('hotspot id ' + hotspotID + ' action ' + action );
        
        new Model.Hotspot({'li_id' : hotspotID })
        .fetch()
        .then(function (hotspot) 
        {
            if ( action == 'start' || action == 'stop' )
            {
                var is_disactivated= ( action == 'start') ? 0 : 1;
                
                //console.log ('update of hotspot with action ' + action + ' is_disactivated ' + is_disactivated  )
                
                hotspot.save(
                {
                    li_is_deactivated: is_disactivated 
                })
                .then(function () 
                {
                    res.render('hotspot',
                    {
                        user : req.user,
                        hotspot : hotspot.toJSON()
                    });
                });
            }
        })
        .catch(function (err) 
        {
            console.log('failed to load hotspot ' + err );
            mainWithError ( req, res, err, 'Der Hotspot konnte nicht geändert werden.' );
        });
    });
    

    
    
    
    
    // =====================================
    // PROMOTIONS SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/promotions', isLoggedIn, function(req, res)
    {
        var localCustomerID= req.user.us_customer_id;
        
        //console.log('loading promotions for ' + req.user.us_id + ' and customer ' + req.user.us_customer_id );

        DB.knex('lm_promotion')
        .select(['lm_promotion.*', 'lm_promotion_instance.*','lm_like.*'])
        .leftJoin('lm_promotion_instance', 'lm_promotion.pr_instance_id', 'lm_promotion_instance.pi_id')
        .leftJoin('lm_like', 'lm_like.li_id', 'lm_promotion.pr_like_id')
        .where('lm_promotion.pr_customer_id',localCustomerID )
        .then(function(data) 
        {
            var localPromotions= data;
            
            //console.log('found promotions %j' , promotions.toJSON() );

            for (var i=0; i < localPromotions.length; i++) 
            {
                var promotion= localPromotions[i];
                preparePromotionShop (promotion);
            }
            
            res.render('promotions',
            {
                user : req.user,
                promotions : localPromotions
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find promotions ' + err );
            mainWithError ( req,  res, err, 'Die Ticketliste konnte nicht geladen werden.' );
        });
    });
    

    
    
    
    app.get('/promotion', isLoggedIn, function(req, res)
    {
        var promotionId = req.query.pr_id;

        //console.log('loading promotion with id ' + promotionId );

        
        DB.knex('lm_promotion')
        .join('lm_like', 'lm_like.li_id', 'lm_promotion.pr_like_id')
        .where('lm_promotion.pr_id', promotionId )
        .then(function(data) 
        {
            var promotion= data[0];

            //console.log('found promotion ' + JSON.stringify ( promotion ) );
            
            preparePromotionShop ( promotion );

            DB.knex('lm_promotion_instance')
            .join('lm_promotion', 'lm_promotion.pr_id', 'lm_promotion_instance.pi_promotion_id')
            .orderBy('lm_promotion_instance.pi_start_time', 'desc')
            .where('lm_promotion.pr_id', promotionId )
            .limit(10)
            .then(function(promotion_instances) 
            {
                for (var i=0; i < promotion_instances.length; i++) 
                {
                    var promotion_instance= promotion_instances[i];
                    preparePromotionInstance (promotion_instance);
                }
                
                DB.knex('lm_image_cache')
                .where('lm_image_cache.imc_customer_id', req.user.us_customer_id )
                .then(function(images)
                {
                    
                    DB.knex('lm_promotion_category_value_map')
                    .where('lm_promotion_category_value_map.pcam_promotion_id', promotionId )
                    .then(function(data)
                    {
                        var profileList= data;

                        promotion.pr_profile_id_list= [];
                        var profileIdListCount= 0;
                        
                        for (var i=0; i < profileList.length; i++) 
                        {
                            var valueID= profileList[i].pcam_category_value_id;
                            promotion.pr_profile_id_list[profileIdListCount++]= valueID;
                        }

                        console.log('DEBUG: found profile list ' + JSON.stringify(promotion.pr_profile_id_list) );
                        
                        res.render('promotion',
                        {
                            user : req.user,
                            promotion : promotion,
                            promotion_instance : promotion_instances,
                            images : images,
                            message : req.flash('promotionMessage')
                        });
                    });
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find promotion ' + err );
            mainWithError ( req, res, err, 'Die Hilfsanfrage konnte nicht geladen werden.' );
        });
    });

    app.get('/promotion_instance', isLoggedIn, function(req, res)
    {
        var promotionInstanceId = req.query.pi_id;

        //console.log('loading promotion instance  ' + promotionInstanceId );
        
        DB.knex('lm_promotion_instance')
        .join('lm_promotion', 'lm_promotion.pr_id', 'lm_promotion_instance.pi_promotion_id')
        .leftJoin('lm_promotion_profile_map', 'lm_promotion_profile_map.pp_promotion_id', 'lm_promotion.pr_id')
        .leftJoin('lm_profile', 'lm_promotion_profile_map.pp_promotion_id', 'lm_promotion.pr_id')
        .where('lm_promotion_instance.pi_id', promotionInstanceId )
        .then(function(data) 
        {
            var promotionInstance= data[0];
            preparePromotionInstance (promotionInstance);
            
            //console.log('loading promotion instance  ' + JSON.stringify ( data ) );

            DB.knex('lm_gift')
            .where('lm_gift.gi_promotion_instance_id', promotionInstanceId )
            .then(function(gifts) 
            {
                //console.log('loading promotion instance gifts ' + JSON.stringify ( gifts ) );
                
                for (var i=0; i < gifts.length; i++) 
                {
                    var gift= gifts[i];
                    prepareGift (gift);
                }

                res.render('promotion_instance',
                {
                    user : req.user,
                    promotion_instance : promotionInstance,
                    gifts : gifts
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find promotion ' + err );
            mainWithError ( req, res, err, 'Die Ticketausführung konnte nicht geladen werden.' );
        });
    });
            

    
    app.post('/promotion', isLoggedIn, function(req, res)
    {
        var promotionId= req.query.pr_id;
        
        var pr_profile_id_list= [].concat(req.body.pr_profile_id_list);
        pr_profile_id_list= pr_profile_id_list.concat (req.body.pr_profile_id_list_time);

        
        var pr_profile_id= 1;
        if ( pr_profile_id_list.indexOf( '3' )>= 0 )
            pr_profile_id= 3;
        else if ( pr_profile_id_list.indexOf( '2' )>= 0 )
            pr_profile_id= 2;
        
        console.log('DEBUG: storing promotion profile ' + pr_profile_id_list + ' with profile main id ' + pr_profile_id );
        
        DB.knex('lm_promotion')
        .where('lm_promotion.pr_id', promotionId )
        .then(function(data) 
        {
            var promotion= data[0];

            var end_time_offset= req.body.pr_end_time_offset_string || '8';
            var end_time_string= req.body.pr_end_time_string;
            
            var end_time= moment( end_time_string, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DD HH:mm');
            var start_time= moment().format('YYYY-MM-DD HH:mm');
            
            // TODO: remove hard coding of category
            var requires_registration= (pr_profile_id == 3)? 1:0;

            console.log ('INFO: promotion timing: start time ' + start_time + ' end time ' + end_time );
            //console.log ('update of promotion ' + JSON.stringify( req.body ) )

            DB.knex('lm_promotion')
            .where('lm_promotion.pr_id', promotionId )
            .update ({
                pr_gift_comment: req.body.pr_gift_comment || promotion.pr_gift_comment,
                pr_user_comment: req.body.pr_user_comment || promotion.pr_user_comment,
                pr_impact: req.body.pr_impact || promotion.pr_impact,
                pr_impact_long: req.body.pr_impact_long || promotion.pr_impact_long,
                pr_gift_count: req.body.pr_gift_count || promotion.pr_gift_count,
                pr_gift_units_per_count: req.body.pr_gift_units_per_count || promotion.pr_gift_units_per_count,
                pr_hint: req.body.pr_hint || promotion.pr_hint,
                pr_start_time: start_time,
                pr_end_time: end_time,
                pr_notification_phone: req.body.pr_notification_phone,
                pr_gift_phone: req.body.pr_gift_phone,
                pr_requires_registration: requires_registration,
                pr_allow_upcount: (req.body.pr_allow_upcount=='on')?1:0,
                pr_profile_id: pr_profile_id
            })
            .then(function () 
            {
                
                DB.knex('lm_promotion_category_value_map')
                .del()
                .where( 'lm_promotion_category_value_map.pcam_promotion_id', promotionId )
                .then(function(){
                
                    /**
                     * add profile map
                     */
                    var insertMap=[];
                    var insertMapCount= 0;
                    
                    for (var i=0; i < pr_profile_id_list.length; i++) 
                    {
                        var valueID= pr_profile_id_list[i];

                        if ( valueID ){
                            
                            var record={};
                            record.pcam_promotion_id= promotionId;
                            record.pcam_category_value_id= valueID;
                            insertMap[insertMapCount++]= record;
                        }
                    }
                    console.log('DEBUG: found profile add values ' + JSON.stringify(insertMap) );
                    
                    DB.knex('lm_promotion_category_value_map')
                    .insert( insertMap )
                    .then(function(){
                        
                        res.redirect('/promotion?pr_id=' + promotionId);
                        
                    });
                });
            });
        })
        .catch(function (err) 
        {
            console.log('failed to load promotion ' + err );
            mainWithError ( req, res, err, 'Die Anfrage konnte nicht gespeichert werden.' );
        });
    });

    
    app.get('/promotion/create', isLoggedIn, function(req, res)
    {
        console.log('creating promotion on hotspot ' + req.query.li_id + ' for user '+ req.user.us_id );
        var localUser= req.user;
        var fromPromotionId= req.query.pr_copy_id;

        
        DB.knex('lm_users')
        .join('lm_customer','lm_users.us_customer_id','lm_customer.cu_id')
        .where('lm_customer.cu_id', '=', localUser.us_customer_id )
        .then(function(data) 
        {
            var localCustomer= data[0];
            
            if ( localCustomer )
            {
                console.log('found customer %j' , localCustomer );
                
                if ( fromPromotionId )
                {
                    DB.knex('lm_promotion')
                    .where('lm_promotion.pr_id', fromPromotionId )
                    .then(function(data) 
                    {
                        var promotion= data[0];
                    
                        DB.knex('lm_promotion')
                        .insert ({
                            pr_like_id:promotion.pr_like_id,
                            pr_gift_image_reference: promotion.pr_gift_image_reference,
                            pr_customer_id: promotion.pr_customer_id,
                            pr_customer_nick: localCustomer.cu_full_name,
                            pr_gift_comment: promotion.pr_gift_comment + ' Kopie',
                            pr_user_comment: promotion.pr_user_comment,
                            pr_gift_count: promotion.pr_gift_count,
                            pr_gift_units_per_count: promotion.pr_gift_units_per_count,
                            pr_hint:  promotion.pr_hint,
                            pr_start_time: promotion.pr_start_time,
                            pr_end_time: promotion.pr_end_time,
                            pr_notification_phone: promotion.pr_notification_phone,
                            pr_allow_upcount: promotion.pr_allow_upcount,
                            pr_is_helping_ticket: 1
                        })
                        .then(function(data) 
                        {
                            var promotionId= data[0];
                            
                            console.log('INFO: user %d created promotion id %d' , localUser.us_id, promotionId );
                            
                            res.redirect('/promotion?pr_id=' + promotionId );
                        });
                    });
                }
                else
                {
                    DB.knex('lm_promotion')
                    .insert ({
                        pr_like_id:req.query.li_id,
                        pr_gift_image_reference: localCustomer.cu_default_image_ref || 'smile',
                        pr_customer_id: localCustomer.cu_id,
                        pr_customer_nick: localCustomer.cu_full_name,
                        pr_gift_comment: 'Bitte unterstütze uns. Wir brauchen noch EINHEITEN ...',
                        pr_user_comment: 'Ich bringe STÜCK ...',
                        pr_end_time: moment().add( 7, 'day' ).format('YYYY-MM-DD HH:mm'),
                        pr_is_helping_ticket: 1
                    })
                    .then(function(data) 
                    {
                        var promotionId= data[0];
                        console.log('created promotion id %d' , promotionId );
                        res.redirect('/promotion?pr_id=' + promotionId );
                    });
                }
            }
            else
            {
                console.log ( 'WARNING: rejected user to create a promotion, user id ' + localUser.us_id )
                mainWithError ( req, res, err, 'Das Ticket konnte nicht angelegt werden..' );
            }
        })
        .catch(function (err) 
        {
            console.log('failed to find user customer ' );
            mainWithError ( req, res, err, 'Das Ticket konnte nicht angelegt werden.' );
        });

    });
    
    
    
    

    app.get('/promotion/action', isLoggedIn, function(req, res)
    {
        var localUser= req.user;
        var customerId= req.user.us_customer_id;
        var promotionId= req.query.pr_id;
        var action= req.query.action;
        
        console.log('INFO: action for promotion id ' + promotionId + ' action ' + action );
        
        if ( localUser.us_mitarbeiter )
        {
            DB.knex('lm_promotion')
            .where('lm_promotion.pr_id', promotionId )
            .where('lm_promotion.pr_customer_id', customerId )
            .limit(1)        
            .select()
            .then(function(data) 
            {
                var promotion= data[0];
                
                if ( promotion.pr_customer_id == localUser.us_customer_id )
                {
                    var promotioninstanceid= promotion.pr_instance_id;

                    var end_time= moment().add( 7, 'day' );

                    if ( promotion.pr_end_time )
                        end_time= moment( promotion.pr_end_time );
                    
                    console.log('INFO: found promotion end time ' + end_time.format('YYYY-MM-DD HH:mm:ss') );
                    
                    var new_count= 0;

                    //console.log ('update of promotion %d with offset %d', promotion.pr_id, end_time_offset );
                    
                    if ( action == 'start' )
                    {
                        if ( moment().isBefore( end_time ) && promotion.pr_gift_count > 0 )
                        {
                            DB.knex('lm_promotion_instance')
                            .insert ({
                                pi_promotion_id : promotion.pr_id,
                                pi_gift_count : promotion.pr_gift_count,
                                pi_gift_image_reference : promotion.pr_gift_image_reference,
                                pi_name : promotion.pr_name,
                                pi_end_time : end_time.format('YYYY-MM-DD HH:mm:ss'),
                                pi_gift_comment : promotion.pr_gift_comment,
                                pi_user_comment : promotion.pr_user_comment,
                                pi_start_user_id : localUser.us_id
                            })
                            .then(function(data) 
                            {
                                var promotioninstanceid= data[0];
                                
                                console.log ('START to save of promotion with instance id %d', promotioninstanceid )
                                
                                
                                DB.knex('lm_promotion')
                                .where('lm_promotion.pr_id', promotionId )
                                .update ({
                                    pr_current_count: 0,
                                    pr_instance_id : promotioninstanceid
                                })
                                .then(function () 
                                {
                                    
                                    var profileLink= config.webapp + config.deeplinkinstance + '/' + promotioninstanceid;
                                    var profileMessage= 'Eine Hilfsanfrage, die auf dein Profil passen könnte, wurde gestartet.\nBitte schau nach unter ' + profileLink + ' ob du helfen kannst.\n\nLiebe Grüsse,\nhelp2day';
                                    var profileMessageHtml= 'Eine Hilfsanfrage, die auf dein Profil passen könnte, wurde gestartet.<br />Bitte schau nach unter <a href="'+ profileLink +'">' + profileLink + '</a> ob du helfen kannst.\n\nLiebe Grüsse,\nhelp2day';
                                    var profileTitle= 'Neue Hilfsanfrage auf help2day.org';

                                    console.log ('INFO: sending email to profile matches' );

                                    
                                    DB.knex ('lm_messaging')
                                    .insert({ 
                                        me_message:profileMessage,
                                        me_message_html:profileMessageHtml,
                                        me_title:profileTitle,
                                        me_promotion_instance: promotioninstanceid,
                                        me_recipients_group_id: 0,
                                        me_customer_id: req.user.us_customer_id,
                                        me_type: 'prfl',
                                        me_created : moment().format('YYYY-MM-DD HH:mm'),
                                        me_valid_until : moment().add ( 1, 'hours' ).format('YYYY-MM-DD HH:mm')
                                        })
                                    .then(function(data)
                                    {
                                    
                                        /** send out message to responsible manager */
                                        
                                        if ( promotion.pr_notification_phone )
                                        {
                                            var localLink= config.webapp + config.deeplinkinstance + '/' + promotioninstanceid;
                                            
                                            var localMessage= 'Eine Hilfsanfrage wurde gestartet.\nDetails unter ' + localLink + '\n';
                                            var localTitle= 'Hilfsanfrage gestartet';
    
                                            console.log ('INFO: sending SMS to manager %s', promotion.pr_notification_phone );
    
                                            DB.knex ('lm_messaging')
                                            .insert({ 
                                                me_message:localMessage,
                                                me_title:localTitle,
                                                me_phone_number: promotion.pr_notification_phone,
                                                me_promotion_instance: promotioninstanceid,
                                                me_recipients_group_id: 0,
                                                me_customer_id: req.user.us_customer_id,
                                                me_type: 'sms',
                                                me_created : moment().format('YYYY-MM-DD HH:mm'),
                                                me_valid_until : moment().add ( 1, 'hours' ).format('YYYY-MM-DD HH:mm')
                                                })
                                            .then(function(data)
                                            {
                                                var localMessage= 'Eine Hilfsanfrage wurde beended.\nDetails unter ' + localLink + '\n';
                                                var localTitle= 'Hilfsanfrage beended';
                                                
                                                DB.knex ('lm_messaging')
                                                .insert({ 
                                                    me_message:localMessage,
                                                    me_title:localTitle,
                                                    me_phone_number: promotion.pr_notification_phone,
                                                    me_promotion_instance: promotioninstanceid,
                                                    me_recipients_group_id: 0,
                                                    me_customer_id: req.user.us_customer_id,
                                                    me_type: 'sms',
                                                    me_status: '23',
                                                    me_created : moment().format('YYYY-MM-DD HH:mm'),
                                                    me_valid_until : end_time.format('YYYY-MM-DD HH:mm')
                                                })
                                                .then(function(data)
                                                {
                                                    
                                                    //console.log ('START to save of promotion with instance id %d', promotioninstanceid )
                                                    res.redirect('/promotion?pr_id=' + promotionId);
                                                });
                                            });
                                        }
                                        else
                                        {
                                            //console.log ('START to save of promotion with instance id %d', promotioninstanceid )
                                            res.redirect('/promotion?pr_id=' + promotionId);
                                        }
                                    });
                                });
                            });
                        }
                        else
                        {
                            console.log ('INFO: START failed due to end time' );
                            
                            if ( ! moment().isBefore( end_time ) )
                                req.flash ('promotionMessage', 'Ende Datum liegt in der Vergangenheit. Bitte ändern und speichern. Dann erneut aktivieren.' );
                            else
                                req.flash ('promotionMessage', 'Die Anzahl der EINHEITEN muss größer als 0 sein. Bitte ändern und speichern. Dann erneut aktivieren.' );
                                
                            res.redirect('/promotion?pr_id=' + promotionId);
                        }
                    }    
                    else if ( action == 'stop' )
                    {
                        console.log ('INFO: STOP: start to save of promotion with instance id %d', 0 )
                        
                        DB.knex('lm_promotion_instance')
                        .where('lm_promotion_instance.pi_id', promotion.pr_instance_id )
                        .update( { 
                            pi_end_user_id : localUser.us_id,
                            pi_end_time: moment().format('YYYY-MM-DD HH:mm:ss') 
                        } )
                        .then(function () 
                        {
                            DB.knex('lm_promotion')
                            .where('lm_promotion.pr_id', promotionId )
                            .update ({
                                pr_current_count: promotion.pr_gift_count,
                                pr_instance_id : 0
                            })
                            .then(function () 
                            {
                                //console.log ('STOP finished update of promotion with instance id %d', 0 )
                                res.redirect('/promotion?pr_id=' + promotionId);
                            });
                        });
                    }
                    else if ( action == 'push')
                    {
                        console.log ('PUSH: start to save of promotion with instance id %d', 0 )

                        preparePromotionShop ( promotion );
                        
                        var localLink= config.webapp + config.deeplinkinstance + '/' + promotion.pr_instance_id;
                        
                        var localMessage= 'Hallo,\n\n' + promotion.pr_gift_comment_string + 
                                          '\n\nFalls du uns unterstützen kannst, bitte folge dem Link ' + localLink + 
                                          ' und bestätige ein Ticket unserer Hilfsanfrage.\n\nDanke,\nDein Team ' +
                                          promotion.pr_customer_nick
                                          + '\n';
                        var localTitle= 'Hilfsanfrage auf help2day';

                        DB.knex ('lm_messaging')
                        .insert({ 
                            me_message:localMessage,
                            me_title:localTitle,
                            me_promotion_instance: promotioninstanceid,
                            me_recipients_group_id: 1,
                            me_customer_id: req.user.us_customer_id,
                            me_type: 'email',
                            me_created : moment().format('YYYY-MM-DD HH:mm'),
                            me_valid_until : moment().add ( 1, 'hours' ).format('YYYY-MM-DD HH:mm')
                            })
                        .then(function(data)
                        {
                            console.log ('created message from promotion with instance id %s', JSON.stringify(data) )
                            res.redirect('/promotion?pr_id=' + promotionId);
                        });
                    }
                    else
                    {
                        console.log('WARNING: failed to handle promotion action: action mismatch' );
                        mainWithNothing ( req, res, 'Die Anfrage konnte nicht gespeichert werden.' );
                    }
                }
                else
                {
                    console.log('WARNING: failed to handle promotion action: customer mismatch' );
                    mainWithNothing ( req, res, 'Die Anfrage konnte nicht gespeichert werden.' );
                }
            })
            .catch(function (err) 
            {
                console.log('failed to handle promotion action' + err );
                mainWithError ( req, res, err, 'Die Anfrage konnte nicht gespeichert werden.' );
            });
        }
        else
        {
            console.log('WARNING: failed to handle promotion action: invalid role' );
            mainWithNothing ( req, res, 'Die Anfrage konnte nicht gespeichert werden.' );
        }
    });
    
    
    
    
    
    
    
    // =====================================
    // IMAGES ==============================
    // =====================================

    app.get('/imagecache', function (req, res)
    {
        var localUser= req.user;
        var imageId= req.query.imc_id;
        
        DB.knex('lm_image_cache')
        .where('lm_image_cache.imc_id', imageId )
        .limit(1)        
        .select()
        .then(function(data) 
        {
            var image= data[0];

            res.render('imagecache',
            {
                user : req.user,
                image : image
            });
        })
        .catch(function (err) 
        {
            console.log('failed to handle promotion action' + err );
            mainWithError ( req, res, err, 'Die Anfrage konnte nicht gespeichert werden.' );
        });
    });

    app.post('/imagecache', isLoggedIn, function (req, res)
    {
        var localUser= req.user;
        var imageId= req.query.imc_id;
        
        //console.log('DEBUG: imagecache found profile ' + req.body.pim_profile_id + ' and image reference ' + req.body.imc_image_reference );
        
        DB.knex('lm_image_cache')
        .where('lm_image_cache.imc_id', imageId )
        .update ({
            imc_comment: req.body.imc_comment
        })
        .then(function () 
        {
            res.redirect('/imagecache?imc_id=' + imageId );
        })
        .catch(function (err) 
        {
            console.log('failed to handle promotion action' + err );
            mainWithError ( req, res, err, 'Die Anfrage konnte nicht gespeichert werden.' );
        });
    });
    
    
    
    
    app.get('/image/:file', function (req, res)
    {
        var pathhead= '/files/';
        file = req.params.file;
        
        //console.log('requesting image file ' + JSON.stringify(file) + ' is valid ' + isValidImageName (file) );
        
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

        //console.log('serving file ' + usepath );
        
        var img = fs.readFileSync( usepath );
        
        if ( usepath == '/files/null.gif' )
            res.setHeader("Cache-Control", "public, max-age=0"); // 0 days
        else
            res.setHeader("Cache-Control", "public, max-age=345600"); // 4 days
            
        res.setHeader("Expires", new Date(Date.now() + 345600000).toUTCString());
        res.writeHead(200, {'Content-Type': content_type });
        res.end(img, 'binary');
    });
    
    
    
    app.post('/upload/hotspotdefaultimage', isLoggedIn, upload.single('cu_default_image_ref'), function(req, res, next) 
    {
        //console.log('uploaded hotspot image file ' + JSON.stringify(req.file) );
        //console.log('found user ' + JSON.stringify(req.user) );
        
        if (req.file.path && req.user.us_id) 
        {
           compressAndResize( req.file, function()
           {
               var localUser= req.user;

               DB.knex('lm_users')
               .join('lm_customer','lm_users.us_customer_id','lm_customer.cu_id')
               .where('lm_customer.cu_id', '=', localUser.us_customer_id )
               .then(function(data) 
               {
                   var userCustomer= data[0];
                   
                   if ( userCustomer )
                   {
                        DB.knex('lm_customer')
                        .where ( 'lm_customer.cu_id', userCustomer.cu_id )
                        .update (
                        {
                            cu_default_image_ref: req.file.filename || userCustomer.get('cu_default_image_ref')
                        })
                        .then(function()
                        {
                            res.redirect('/settings/customer');
                        });
                   }
                   else            
                   {
                       console.log('WARNING: failed to store default image: null ' );
                       mainWithNothing ( req, res, 'Das Defaultbild konnte nicht gespeichert werden.' );
                   }
               })
               .catch(function (err) 
               {
                   console.log('WARNING: failed to store default image ' + err );
                   mainWithError ( req, res, err, 'Der Defaultmarker konnte nicht gespeichert werden.' );
               });
           });
        }
        else
        {
            console.log('WARNING: failed to upload default image ' + err );
            mainWithError ( req, res, err, 'Der Defaultmarker konnte nicht gespeichert werden.' );
        }
    });
    
    
    app.post('/upload/hotspotdefaultmarker', isLoggedIn, upload.single('cu_default_marker'), function(req, res, next) 
    {
        //console.log('uploaded hotspot marker file ' + JSON.stringify(req.file) );
        //console.log('found user ' + JSON.stringify(req.user) );
        
        if (req.file && req.file.path) 
        {
           var localUser= req.user;
           
           DB.knex('lm_users')
           .join('lm_customer','lm_users.us_customer_id','lm_customer.cu_id')
           .where('lm_customer.cu_id', '=', localUser.us_customer_id )
           .then(function(data) 
           {
               var userCustomer= data[0];
               if ( userCustomer )
               {
                    DB.knex('lm_customer')
                    .where ( 'lm_customer.cu_id', userCustomer.cu_id )
                    .update (
                    {
                        cu_default_marker: req.file.filename || userCustomer.get('cu_default_marker')
                    })
                    .then(function()
                    {
                        res.redirect('/settings/customer');
                    });
               }
               else            
               {
                   console.log('WARNING: failed to store default image: null ' );
                   mainWithNothing ( req, res, 'Das Defaultbild konnte nicht gespeichert werden.' );
               }
           })
           .catch(function (err) 
           {
               console.log('WARNING: failed to store default image ' + err );
               mainWithError ( req, res, err, 'Das Defaultbild konnte nicht gespeichert werden.' );
           });
        }
    });


    
    app.get('/set/profileimage', isLoggedIn, function(req, res, next) 
    {
        var pro_id= req.query.pro_id;
        var imc_id= req.query.imc_id;
        var localUser= req.user;

        //console.log('found profile id ' + pro_id );

        
        DB.knex('lm_profile_image_map')
        .where('lm_profile_image_map.pim_profile_id', pro_id )
        .where('lm_profile_image_map.pim_customer_id', localUser.us_customer_id )
        .then(function(data)
        {
            var profile= data[0];
            
            //console.log('found profile image map for admin user ' + JSON.stringify(data) );

            if ( profile && profile.pim_id )
            {
                DB.knex('lm_image_cache')
                .where('lm_image_cache.imc_id', imc_id )
                .limit(1)        
                .select()
                .then(function(data) 
                {
                    var image= data[0];
                    var imageReference= image.imc_image_reference || profile.pim_promotion_image_reference;
                
                    DB.knex('lm_profile_image_map')
                    .where('lm_profile_image_map.pim_id', profile.pim_id )
                    .update(
                    {
                        pim_promotion_image_reference : imageReference
                    })
                    .then(function () 
                    {
                        res.redirect('/settings/customer');
                    });
                });
            }
            else
            {
                DB.knex('lm_image_cache')
                .where('lm_image_cache.imc_id', imc_id )
                .limit(1)        
                .select()
                .then(function(data) 
                {
                    var image= data[0];
                    var imageReference= image.imc_image_reference || profile.pim_promotion_image_reference;
                
                    DB.knex('lm_profile_image_map')
                    .insert(
                    {
                        pim_profile_id : pro_id,
                        pim_customer_id : localUser.us_customer_id,
                        pim_promotion_image_reference : imageReference
                    })
                    .then(function () 
                    {
                        res.redirect('/settings/customer');
                    });
                });
            }
        })
        .catch(function (err) 
        {
            console.log('WARNING: failed to store profile image ' + err );
            mainWithError ( req, res, err, 'Das Profilbild konnte nicht gespeichert werden.' );
        });
    });

    
    
    
    
    app.get('/set/promotionimage', isLoggedIn, function(req, res, next) 
    {
        var pr_id= req.query.pr_id;
        var imc_id= req.query.imc_id;
    
        var localUser= null;

        new Model.Promotion({'pr_id' : pr_id })
        .fetch()
        .then(function (promotion) 
        {
            if ( promotion )
            {
                DB.knex('lm_image_cache')
                .where('lm_image_cache.imc_id', imc_id )
                .limit(1)        
                .select()
                .then(function(data) 
                {
                    var image= data[0];
                    var imageReference= image.imc_image_reference || promotion.get('pr_gift_image_reference');
                
                    promotion.save(
                    {
                        pr_gift_image_reference: imageReference
                    })
                    .then(function () 
                    {
                        res.redirect('/promotion?pr_id=' + pr_id );
                    });
                });
            }
            else
            {
                console.log('failed to store promotion image, promotion id not defined ' );
                mainWithNothing ( req, res, 'Das Anfragenbild konnte nicht gespeichert werden.' );
            }
        })
        .catch(function (err) 
        {
            console.log('failed to store promotion image ' + err );
            mainWithError ( req, res, err, 'Das Anfragenbild konnte nicht gespeichert werden.' );
        });
    });
    
    app.get('/set/promotionimpactimage', isLoggedIn, function(req, res, next) 
    {
        var pr_id= req.query.pr_id;
        var imc_id= req.query.imc_id;
    
        var localUser= null;

        new Model.Promotion({'pr_id' : pr_id })
        .fetch()
        .then(function (promotion) 
        {
            if ( promotion )
            {
                DB.knex('lm_image_cache')
                .where('lm_image_cache.imc_id', imc_id )
                .limit(1)        
                .select()
                .then(function(data) 
                {
                    var image= data[0];
                    var imageReference= image.imc_image_reference || promotion.get('pr_impact_image_ref');
                
                    promotion.save(
                    {
                        pr_impact_image_ref: imageReference
                    })
                    .then(function () 
                    {
                        res.redirect('/promotion?pr_id=' + pr_id );
                    });
                });
            }
            else
            {
                console.log('WARNING: failed to store promotion image, promotion id not defined ' );
                mainWithNothing ( req, res, 'Das Anfragenbild konnte nicht gespeichert werden.' );
            }
        })
        .catch(function (err) 
        {
            console.log('WARNING: failed to store promotion image ' + err );
            mainWithError ( req, res, err, 'Das Anfragenbild konnte nicht gespeichert werden.' );
        });
    });
    
    
    
    
    app.post('/upload/promotionimage', isLoggedIn, upload.single('pr_gift_image_reference'), function(req, res, next) 
    {
        var pr_id= req.params.pr_id || req.query.pr_id;
        //console.log('uploaded promotion image file ' + JSON.stringify(req.file) );
        //console.log('found promotion id ' +  pr_id );
        
        
        if (req.file && req.file.path) 
        {
            compressAndResize( req.file, function()
            {
                var localUser= null;

                new Model.Promotion({'pr_id' : pr_id })
                .fetch()
                .then(function (promotion) 
                {
                    var imageReference= req.file.filename || promotion.get('pr_gift_image_reference');
                    
                    promotion.save(
                    {
                        pr_gift_image_reference: imageReference
                    })
                    .then(function () 
                    {
                        DB.knex('lm_image_cache')
                        .insert(
                        { 
                            imc_image_reference:imageReference,
                            imc_customer_id:req.user.us_customer_id
                        })
                        .then(function(data)
                        {
                            res.redirect('/promotion?pr_id=' + pr_id );
                        });
                    });
                })
                .catch(function (err) 
                {
                    console.log('WARNING: failed to store promotion image ' + err );
                    mainWithError ( req, res, err, 'Das Anfragenbild konnte nicht gespeichert werden.' );
                });
            });
        }
        else            
        {
            console.log('WARNING: failed to store promotion image: null ' );
            mainWithNothing ( req, res, 'Das Anfragenbild konnte nicht gespeichert werden.' );
        }
    });
    
    app.post('/upload/promotionimpactimage', isLoggedIn, upload.single('pr_impact_image_ref'), function(req, res, next) 
    {
        var pr_id= req.params.pr_id || req.query.pr_id;
        //console.log('uploaded promotion image file ' + JSON.stringify(req.file) );
        //console.log('found promotion id ' +  pr_id );
        
        if (req.file && req.file.path) 
        {
            compressAndResize( req.file, function()
            {
                var localUser= null;

                new Model.Promotion({'pr_id' : pr_id })
                .fetch()
                .then(function (promotion) 
                {
                    var imageReference= req.file.filename || promotion.get('pr_impact_image_ref');
                    
                    promotion.save(
                    {
                        pr_impact_image_ref: imageReference
                    })
                    .then(function () 
                    {
                        DB.knex('lm_image_cache')
                        .insert(
                        { 
                            imc_image_reference:imageReference,
                            imc_customer_id:req.user.us_customer_id
                        })
                        .then(function(data)
                        {
                            res.redirect('/promotion?pr_id=' + pr_id );
                        });
                    });
                })
                .catch(function (err) 
                {
                    console.log('WARNING: failed to store promotion image ' + err );
                    mainWithError ( req, res, err, 'Das Anfragebild konnte nicht gespeichert werden.' );
                });
            });
        }
        else            
        {
            console.log('WARNING: failed to store promotion image: null ' );
            mainWithNothing ( req, res, 'Das Anfragebild konnte nicht gespeichert werden.' );
        }
    });
    
    
    app.post('/upload/hotspotimage', isLoggedIn, upload.single('li_image_ref'), function(req, res, next) 
    {
        var li_id= req.params.li_id || req.query.li_id;

        //console.log('uploaded hotspot image file ' + JSON.stringify(req.file) );
        //console.log('found hotspot id ' + li_id );
        
        if (req.file && req.file.path) 
        {
            compressAndResize( req.file, function()
            {
                var localUser= null;
                new Model.Hotspot({'li_id' : li_id })
                .fetch()
                .then(function (hotspot) 
                {
                    var imageReference= req.file.filename || hotspot.get('li_image_ref');

                    hotspot.save(
                    {
                        li_image_ref: imageReference
                    })
                    .then(function () 
                    {
                        DB.knex('lm_image_cache')
                        .insert(
                        { 
                            imc_image_reference:imageReference,
                            imc_customer_id:req.user.us_customer_id
                        })
                        .then(function(data)
                        {
                            res.render('hotspot',
                            {
                                user : req.user,
                                hotspot : hotspot.toJSON()
                            });
                        });
                        
                    });
                })
                .catch(function (err) 
                {
                    console.log('WARNING: failed to store hotspot image ' + err );
                    mainWithError ( req, res, err, 'Das Hotspotbild konnte nicht gespeichert werden.' );
                });
            });
        }
        else            
        {
            console.log('WARNING: failed to store hotspot image: null ' );
            mainWithNothing ( req, res, 'Das Hotspotbild konnte nicht gespeichert werden.' );
        }
    });
    
    
    app.post('/upload/hotspotmarker', isLoggedIn, upload.single('li_marker_reference'), function(req, res, next) 
    {
        var li_id= req.params.li_id || req.query.li_id;
        
        //console.log('uploaded hotspot marker file ' + JSON.stringify(req.file) + ' for hotspot ' + li_id );
        
        if (req.file.path) 
        {
           new Model.Hotspot({'li_id' : li_id })
           .fetch()
           .then(function (hotspot) 
           {
               hotspot.save(
               {
                   li_marker_reference: req.file.filename || ''
               })
               .then(function () 
               {
                   res.render('hotspot',
                   {
                       user : req.user,
                       hotspot : hotspot.toJSON()
                   });
               });

           })
           .catch(function (err) 
           {
               console.log('WARNING: failed to store hotspot marker ' + err );
               mainWithError ( req, res, err, 'Der Hotspot Marker konnte nicht gespeichert werden.' );
           });
        }
        else            
        {
            console.log('WARNING: failed to store hotspot marker: null ' );
            mainWithNothing ( req, res, 'Der Hotspot Marker konnte nicht gespeichert werden.' );
        }
    });
};





// =====================================
// FILE UPLOAD =========================
// =====================================


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

function prepareRecipient ( recipient, mastersalt, masterkey ){
    
    if ( recipient.re_email_encrypted ){
        var recipientDecrypted= grex.decrypt ( recipient.re_email_encrypted, mastersalt, masterkey );
        recipient.re_email= recipientDecrypted;
    }else{
        recipient.re_email= '';
    }

    if ( recipient.re_phone_encrypted ){
        var recipientDecrypted= grex.decrypt ( recipient.re_phone_encrypted, mastersalt, masterkey );
        recipient.re_phone= recipientDecrypted;
    }else{
        recipient.re_phone= '';
    }
    
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






// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next)
{
    
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
    
    // if they aren't redirect them to the home page
    res.redirect('/login');
}
