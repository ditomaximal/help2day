/**
 * application logic of help2day CRM
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

/**
 * sets up required basic modules
 */
var DB = require('../config/database').db;
var config = require('../config/configuration.js');
var grex = require('../app/helpers.js');
var moment = require('moment');





var exports = module.exports = {};


exports.dailyStatus= function () {

    console.log('INFO: daily status');

    DB.knex('lm_promotion')
    .select(['lm_customer.cu_full_name'])
    .count('* as count')
    .leftJoin('lm_promotion_instance', 'lm_promotion.pr_instance_id', 'lm_promotion_instance.pi_id')
    .leftJoin('lm_customer','lm_promotion.pr_customer_id','lm_customer.cu_id')
    .where('cu_default_category','help2day')
    .whereNot('lm_promotion.pr_instance_id', 0 )
    .groupBy('lm_customer.cu_id')
    .orderBy('lm_customer.cu_full_name')
    .then(function(data) 
    {
        var activePromotions= data;
        
        console.log('found active ngos %j' , JSON.stringify (activePromotions) );

        
        DB.knex('lm_promotion')
        .select(['lm_customer.cu_full_name'])
        .leftJoin('lm_customer','lm_promotion.pr_customer_id','lm_customer.cu_id')
        .where('cu_default_category','help2day')
        .groupBy('lm_customer.cu_id')
        .orderBy('lm_customer.cu_full_name')
        .then(function(data) {
            
            var allCustomers= data;

            console.log('found all ngos %j' , JSON.stringify (allCustomers) );
            
            var values= {};
            values.customers= activePromotions;
            values.allCustomers= allCustomers;
            values.date= moment().format('YYYY-MM-DD');
            
            grex.sendMailByTemplateAsync ( values, 'dailyreport', config.all_receivers, config.internal_receivers_bcc, 'help2day Report' );
        })
    })
    .catch(function (err) 
    {
        console.log('failed to find promotions ' + err );
    });
};



exports.debug= function () {
  
    var userID= 136;
    
    var subquery = 
        DB.knex('lm_promotion')
        .join('lm_promotion_category_value_map', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
        .select (['lm_promotion.pr_id']);
    
//    subquery.then(function(data){
//        console.log('found data %j' , JSON.stringify (data) );
//    });
    
    
    var subqueryPromotionsWithMatch= 
        DB.knex
        .select (['lm_promotion.pr_id','lm_user_category_value_map.ucam_category_value_id'])
        .count ( '* as pr_weight' )
        .from('lm_promotion_category_value_map')
        .join('lm_promotion', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
        .join('lm_user_category_value_map', 'lm_user_category_value_map.ucam_category_value_id', 'lm_promotion_category_value_map.pcam_category_value_id' )
        .where('lm_user_category_value_map.ucam_user_id', userID )
        .as("promotionsWithMatch");

    subqueryPromotionsWithMatch.then(function(data){
        console.log('found subqueryPromotionsWithMatch data %j' , JSON.stringify (data) );
    });
    
    
    
    
    
    var subqueryPromotionWeightWithUser= 
        DB.knex
        .select (['lm_promotion.pr_id'])
        .count ( '* as pr_weight' )
        .from('lm_promotion_category_value_map')
        .join('lm_promotion', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
        .as("promotionWeightWithUser");
    
    //console.log('found data %s' , subqueryPromotionWeightWithUser.toString() );
    
    
    DB.knex('lm_promotion')

    //.select (['lm_promotion.pr_id'])
    //.count ( '* as pr_weight' )
    //.join('lm_promotion_category_value_map', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
    
    //.select(['lm_promotion.pr_id'])
    
    .select(['lm_promotion.pr_id', 'promotionWeightWithUser.*' ])
    .leftJoin( subqueryPromotionWeightWithUser, 'lm_promotion.pr_id', 'promotionWeightWithUser.pr_id' )
    
    //.select(['lm_promotion.pr_id', 'lm_category_value_name.*','lm_category_name.*', 'promotionWeightWithUser' ])
    //.join('lm_promotion_category_value_map', 'lm_promotion.pr_id', 'lm_promotion_category_value_map.pcam_promotion_id' )
    //.join('lm_category_value_name', 'lm_promotion_category_value_map.pcam_category_value_id', 'lm_category_value_name.cavn_category_value_id' )
    //.join('lm_category_name', 'lm_promotion_category_value_map.pcam_category_id', 'lm_category_name.can_category_id' )
    //.where('lm_category_value_name.cavn_language','de')
    
    .where('lm_promotion.pr_id', 'in', subquery )
    //.where('lm_promotion.pr_id', 101 )
    .then( function(data){
      
        console.log('found data %j' , JSON.stringify (data) );
        
        
        
    })
    .catch(function (err) 
    {
        console.log('failed to find promotions ' + err );
    });
    
    
    
};




exports.encryptPhone= function ( masterkey, mastersalt ) {

    console.log('INFO: encrypting user phone');

    DB.knex('lm_users')
    .whereNotNull('lm_users.us_phone' )
    .where('lm_users.us_dont_encrypt_email', 0 )
    .then(function(data) 
    {
        var unhashedUsers= data;
        
        for (var i=0; i < unhashedUsers.length; i++) 
        {
            var user= unhashedUsers[i];

            console.log('INFO: found user for update of phone ' , user.us_id );

            var phone_encrypted= grex.encrypt ( user.us_phone, mastersalt, masterkey );

            //console.log('INFO: found user ' , email_encrypted );
            
            DB.knex('lm_users')
            .update( {'us_phone_encrypted' : phone_encrypted } )
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




exports.encryptRecipients= function ( masterkey, mastersalt ) {

    console.log('INFO: encrypting recipients');

    DB.knex('lm_recipients')
    .whereNotNull('lm_recipients.re_email' )
    .then(function(data) 
    {
        var unhashedRecepients= data;
        
        for (var i=0; i < unhashedRecepients.length; i++) 
        {
            var recipient= unhashedRecepients[i];

            console.log('INFO: found recipient ' , recipient.re_id );

            var email_encrypted= grex.encrypt ( recipient.re_email, mastersalt, masterkey );
            var phone_encrypted= grex.encrypt ( recipient.re_phone, mastersalt, masterkey );

            //console.log('INFO: found user ' , email_encrypted );
            
            DB.knex('lm_recipients')
            .update( {
                re_email_encrypted : email_encrypted,
                re_phone_encrypted : phone_encrypted
            } )
            .where('re_id', recipient.re_id)
            .then(function(){
                
            });
        }
        
    })
    .catch(function (err) 
    {
        console.log('ERROR: failed to find recipients ' + err );
    });
};

exports.perMinute= function () {

    console.log('INFO: per minute cron job');
    
};
