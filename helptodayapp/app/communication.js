/**
 * application logic of help2day APP
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

/**
 * sets up required basic modules
 */
var crypto = require('crypto');
var path = require('path');
var mailer = require('nodemailer');
var email_template = require('email-templates').EmailTemplate;
var moment = require('moment');
var DB = require('../config/database').db;
var config = require('../config/configuration.js');
var grex = require('../app/helpers.js');
var async = require("async");



var exports = module.exports = {};

function sendMailByTemplateAsync ( data, template_name, receivers, bcc, subject ){
    
    var templatesDir = path.resolve(__dirname, '..', 'templates')
    var template = new email_template(path.join(templatesDir, template_name ))
    
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

    template.render ( data, function (err, results) {
      if (err) {
        return console.error( 'ERROR: template render error:' + err)
      }

      var mail = 
      {
          from: "help2day <confirmation@grex-app.com>",
          to: receivers,
          bcc: bcc,
          subject: subject,
          text: results.text,
          html: results.html
      };

      transporter.sendMail(mail, function(error, response)
      {
          if(error)
          {
              console.log('ERROR: failed to send mail' + error);
          }
          else
          {
              console.log("INFO: succeeded to send email to " + mail.to + ' with subject ' + subject );
          }
          transporter.close();
      });
    });
};


var websms = require("websmscom");

sendSMS = function ( receivers, message ){
    
    console.log ('DEBUG: attempt to send sms message with receivers ' + JSON.stringify (receivers) + ' and message ' + message );
    
    var smsClient = new websms.Client ( config.websmsUrl, config.websmsUser, config.websmsPassword );
    
    var smsMessage = new websms.TextMessage ( receivers, message, function (){
        console.log ('ERROR: failed to create sms message with receivers ' + JSON.stringify (receivers) + ' and message ' + message );
    });
    
    if ( !smsMessage)
        return;
    
    smsClient.send(smsMessage, 1, config.smsSimulation, function(response, message){

        console.log('INFO: sms api response ' + JSON.stringify(response) );
        
    }, function(error, messageObject){
        
        console.log('ERROR: sms api error ' + JSON.stringify(error) );
        
    });
    
};



const languageProfileElements= [ 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42];
const typeProfileElements= [1,2,3];
const targetProfileElements= [4,5,6,7,8,9];
const timeWorkProfileElements= [10,11,12,13,14,15];
const typeGoodsProfileElements= [16,17,18,19,20,21,22];
const timeOfDayProfileElements= [23,24,25,26,27];
const weekDayProfileElements= [28,29,30];



function match ( userProfile, promotionProfile, categoryProfile ){

    for (var index = 0; index < categoryProfile.length; index++) {
        
        var referenceId= categoryProfile[index];
        
        var isInUserProfile=  ( userProfile.indexOf ( referenceId ) >= 0 );
        var isInPromotionProfile=  ( promotionProfile.indexOf ( referenceId ) >= 0 );
        
        if( ( isInUserProfile && ! isInPromotionProfile ) || ( ! isInUserProfile && isInPromotionProfile ) ) {
            return false;
        }
    }
    
    return true;
}



exports.communicationHandler =  function ( masterkey, mastersalt ){
    
    DB.knex('lm_messaging')
    .where('lm_messaging.me_handled',0)
    .then(function(data){
        
        async.each ( data, function ( message, callback ){


            var me_handled= 0;
            
            if ( message.me_type == 'prfl'){
                
                console.log ( 'DEBUG: found profile message to handle ' + JSON.stringify(message) );
                
                /** message to profile matches between promotion and user profiles */
                /** https://docs.google.com/spreadsheets/d/11SwfixEH8pGU5kaW34AQGLEs-qpfcGo0JLDavxBHyoQ/edit#gid=1402999270 */
                /** RQ017 */
                
                /** details for matching algorithm specification */
                /** https://docs.google.com/spreadsheets/d/11SwfixEH8pGU5kaW34AQGLEs-qpfcGo0JLDavxBHyoQ/edit#gid=181132656 */
                /** PR19 */
                
                var promotionInstanceId= message.me_promotion_instance;
                
                /** load users with profile match */
                /** profile elements, at least one match per class 1 and class of target group, if time is given by user, also this */
                /** distance */
                /** NGO */

                /** promotion part */
                var subQueryProfile= DB.knex.raw('GROUP_CONCAT(??.??) as ??', [ 'lm_promotion_category_value_map', 'pcam_category_value_id', 'promotion_match_profile' ] );
                var subsubQueryProfile= DB.knex.raw('GROUP_CONCAT(??.??) as ??', [ 'lm_promotion_category_value_map', 'pcam_category_value_id', 'promotion_match_profile_list' ] );
                var subQueryProfileAll= 
                    DB.knex('lm_promotion_category_value_map')
                    .select(['lm_promotion.pr_id', subsubQueryProfile])
                    .join('lm_promotion', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
                    .join('lm_promotion_instance', 'lm_promotion_instance.pi_promotion_id','lm_promotion.pr_id')
                    .groupBy('lm_promotion.pr_id')
                    .where('lm_promotion_instance.pi_id', promotionInstanceId )
                    .as('promotion_profile_all');

                
                /** user part */
                var subQueryUser= DB.knex.raw('GROUP_CONCAT(??.??) as ??', [ 'lm_user_category_value_map', 'ucam_category_value_id', 'user_match_profile' ] );
                var subsubQueryUser= DB.knex.raw('GROUP_CONCAT(??.??) as ??', [ 'lm_user_category_value_map', 'ucam_category_value_id', 'user_profile_list' ] );
                var subQueryUserAll= 
                    DB.knex('lm_user_category_value_map')
                    .select(['lm_users.us_id', subsubQueryUser])
                    .join('lm_users', 'lm_user_category_value_map.ucam_user_id', 'lm_users.us_id' )
                    .groupBy('lm_users.us_id')
                    .as('user_profile_all');

                
                /** assemble it */
                DB.knex('lm_promotion_instance')
                .select(['lm_users.*', 'lm_promotion.pr_id', 'user_profile_all.user_profile_list', 'promotion_profile_all.promotion_match_profile_list', 'lm_like.li_long', 'lm_like.li_lat'])
                .join('lm_promotion','lm_promotion_instance.pi_promotion_id','lm_promotion.pr_id')
                .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
                .join('lm_promotion_category_value_map', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
                .join('lm_user_category_value_map', 'lm_user_category_value_map.ucam_category_value_id', 'lm_promotion_category_value_map.pcam_category_value_id' )
                .join('lm_users', 'lm_user_category_value_map.ucam_user_id', 'lm_users.us_id' )
                .join( subQueryProfileAll, 'promotion_profile_all.pr_id', 'lm_promotion.pr_id' ) 
                .join( subQueryUserAll, 'user_profile_all.us_id', 'lm_users.us_id' )
                .groupBy('lm_users.us_id')
                .where('lm_promotion_instance.pi_id', promotionInstanceId )
                .then( function(data) 
                {
                    var users= data;

                    
                    /** list of users that have at least one matching profile element */
                    
                    var eMailArray= [];
                    var smsArray= [];

                    
                    for ( var index= 0; index < users.length; index ++ ){
                        
                        var user= users[index];
                        
                        var promotionMatchProfileArray= user.promotion_match_profile_list.split(",");
                        var userMatchProfileArray= user.user_profile_list.split(",");
                        
                        
                        user.us_score= 1;

                        
                        /** Language 31 - 42 */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, languageProfileElements ) ){
                            user.us_score= 0;
                        }
                        
                    
                        /** type of volunteering 1 - 3 , goods, time, time for registered */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, typeProfileElements ) ){
                            user.us_score= 0;
                        }
                    
                        /** target group 4 - 9 */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, targetProfileElements ) ){
                            user.us_score= 0;
                        }
                    
                        /** type of time work 10 - 15 */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, timeWorkProfileElements ) ){
                            user.us_score= 0;
                        }
                    
                        /** type of goods 16 - 22 */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, typeGoodsProfileElements ) ){
                            user.us_score= 0;
                        }
                    
                        /** time of day 23 - 27 */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, timeOfDayProfileElements ) ){
                            user.us_score= 0;
                        }
                    
                        /** days of week 28 - 30 */
                        if ( ! match ( userMatchProfileArray, promotionMatchProfileArray, weekDayProfileElements ) ){
                            user.us_score= 0;
                        }
                        
                        
                        /** DISTANCE */
                        
                        var userLong= user.us_long;
                        var userLat= user.us_lat;

                        var promotionLong= user.li_long;
                        var promotionLat= user.li_lat;
                        
                        var maxDistanceKM= grex.getDistanceFromLatLonInKm ( 0, 0, 0, Math.max ( user.us_lat_radius, user.us_long_radius ) ).toFixed(3);
                        var distanceKM= grex.getDistanceFromLatLonInKm ( userLat, userLong, promotionLat, promotionLong ).toFixed(3);

                        
                        console.log ( 'DEBUG: found user ' + JSON.stringify (user) );
                        console.log ( 'DEBUG: found distance ' + distanceKM + ' and maxDistance ' + maxDistanceKM + ' for user ' + user.us_id );
                        
                        
                        
                        if ( user.us_score ){
                            
                            if ( user.us_allow_email_notification ){
                           
                                console.log ( 'DEBUG: sending email to user ' + user.us_id + ' with title ' + message.me_title );
                                
                                if ( !message.me_message_html )
                                    message.me_message_html= message.me_message.replace(/(?:\r\n|\r|\n)/g, '<br />'); 
                                
                                var email_decrypted= '';
                                if ( user.us_email_encrypted ){
                                    email_decrypted= grex.decrypt(user.us_email_encrypted,mastersalt, masterkey);
                                }
                                
                                var mailData= { 
                                        title: message.me_title,
                                        body_html: message.me_message_html,
                                        body_text: message.me_message,
                                };
                                
                                sendMailByTemplateAsync ( mailData, 'email', email_decrypted, '', message.me_title );

                            }
                            
                            
                            if ( user.us_allow_sms_notification ){
                                
                                var phone_decrypted= '';
                                if ( user.us_phone_encrypted ){
                                    
                                    console.log ( 'DEBUG: sending sms to user ' + user.us_id );

                                    phone_decrypted= grex.decrypt(user.us_phone_encrypted,mastersalt, masterkey);

                                    var receivers= [];
                                    
                                    receivers.push( phone_decrypted.replace ( '+', '' ) );
                                    
                                    sendSMS ( receivers, message.me_title );
                                }
                            }
                        }
                    }
                })
                .catch(function (err) 
                {
                    console.log('ERROR: failed to find profiles ' + err );
                });

                
                DB.knex('lm_messaging')
                .update({ 
                    me_handled: 1
                })
                .where('lm_messaging.me_id', message.me_id )
                .then();
                
            }

            
            
            if ( message.me_chat ){
                
                /** do nothing */
                DB.knex('lm_messaging')
                .update({ 
                    me_handled: 1
                })
                .where('lm_messaging.me_id', message.me_id )
                .then();
            }

            
            if ( message.me_email ){
                
                DB.knex('lm_users')
                .where('lm_users.us_id', '=', message.me_user_id  )
                .then(function(data)
                {
                    var recipient= data[0];

                    if ( !message.me_message_html )
                        message.me_message_html= message.me_message.replace(/(?:\r\n|\r|\n)/g, '<br />'); 

                    
                    var email_decrypted= '';
                    if ( recipient.us_email_encrypted ){
                        email_decrypted= grex.decrypt(recipient.us_email_encrypted,mastersalt, masterkey);
                    }
                    
                    var mailData= { 
                            title: message.me_title,
                            body_html: message.me_message_html,
                            body_text: message.me_message,
                    };
                    
                    sendMailByTemplateAsync ( mailData, 'email', email_decrypted, '', message.me_title );
                    
                    DB.knex('lm_messaging')
                    .update({ 
                        me_handled: 1
                    })
                    .where('lm_messaging.me_id', message.me_id )
                    .then();

                });
            }
            
            
            
            if ( message.me_sms ){
                
                DB.knex('lm_users')
                .where('lm_users.us_id', '=', message.me_user_id  )
                .then(function(data)
                {
                    var recipient= data[0];

                    var phone_decrypted= '';
                    if ( recipient.us_phone_encrypted ){
                        phone_decrypted= grex.decrypt(recipient.us_phone_encrypted,mastersalt, masterkey);

                        
                        var receivers= [];
                        receivers.push( phone_decrypted );
                        
                        sendSMS ( receivers, message.me_message );
                        
                    }
                    
                    DB.knex('lm_messaging')
                    .update({ 
                        me_handled: 1
                    })
                    .where('lm_messaging.me_id', message.me_id )
                    .then();

                });
            }
            
            
            if ( message.me_type == 'sms'){
            
                DB.knex('lm_messaging')
                .update({ 
                    me_handled: 1
                })
                .where('lm_messaging.me_id', message.me_id )
                .then();
            }
        },
        function(err){

            
            
        }
        
        );
    })
    .catch(function (err) 
    {
        console.log('ERROR: failed to find messages ' + err );
    });
    
};




