/**
 * periodic and one shot functions of impact graph
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
var async = require("async");
var truncate = require('truncate');


function start(session){
    return function(callback){
       callback(null, session);
    }
}


function handleStatistics( session, callback ){
  
    if ( ( session.phase % 5 ) == 0 ){
        return callback ( null, session );
    }
    
    DB.knex('lm_sig_static_dataset')
    .select(['lm_sig_static_dataset.ssd_category'])
    .groupBy('lm_sig_static_dataset.ssd_category' )
    .then(function(data) 
    {
        var datasets= data;
        
        var nextCategory= currentCategory= session.ks_statistic_category;
        var nextIndex= -1;
        
        for ( var index= 0; index < datasets.length; index++ ){
            
            var dataset= datasets[index];
            
            if ( dataset.ssd_category === currentCategory ){
                nextIndex= ( index + 1 ) % datasets.length;
            }
        }

        if ( nextIndex >= 0 && nextIndex < datasets.length ){
            
            console.log('INFO: animation updating statistics category to ' , datasets[nextIndex].ssd_category );

            nextCategory= datasets[nextIndex].ssd_category;
        }
        
        session.ks_statistic_category= nextCategory; 

        callback ( null, session );
        
    })
    .catch(function (err) 
    {
        console.log('ERROR: failed to find/update sessions ' + err );
        
        callback ("failed to read static dataset", session );
    });
};



function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}




function handleImages( session, callback ){ 

    if ( ( session.phase % 2 ) != 0 ){
        session.ks_center_image_ref= "";
        return callback ( null, session );
    }
    
    if ( ( session.phase ) >= 15 ){
        session.ks_center_image_ref= "";
        return callback ( null, session );
    }
    
    DB.knex('lm_sig_image')
    .where('lm_sig_image.si_key', session.ks_key )
    .then(function(data) 
    {
        var images= data;
    
        
        var nextImage= session.ks_center_image_ref;
        
        var nextIndex= -1;
        
        if ( images.length > 0 ){

            nextIndex= getRandomInt ( 0, images.length );
        }
        
        if ( nextIndex >= 0 && nextIndex < images.length ){
            
            console.log('INFO: animation updating image to ' , images[nextIndex].si_image_ref );

            nextImage= images[nextIndex].si_image_ref;
        }
        
        session.ks_center_image_ref= nextImage; 

        callback ( null, session );
        
    })
    .catch(function (err) 
    {
        console.log('ERROR: failed to find/update sessions ' + err );
        
        callback ("failed to read static dataset", session );
    });
};



function handleVideo( session, callback ){ 
    
    if ( ( session.phase ) != 15 ){
        session.ks_video_url= "";
        return callback ( null, session );
    }
    
    DB.knex('lm_sig_video')
    .where('lm_sig_video.sv_key', session.ks_key )
    .then(function(data) 
    {
        var videos= data;
        
        var nextVideo= session.ks_video_url;
        
        var nextIndex= -1;
        
        if ( videos.length > 0 ){

            nextIndex= getRandomInt ( 0, videos.length );
        }
        
        if ( nextIndex >= 0 && nextIndex < videos.length ){
            
            console.log('INFO: animation updating video to ' , videos[nextIndex].sv_url );
            nextVideo= videos[nextIndex].sv_url;
        }
        
        session.ks_video_url= nextVideo; 
        callback ( null, session );
        
    })
    .catch(function (err) 
    {
        console.log('ERROR: failed to read video sources ' + err );
        callback ("failed to read video sources", session );
    });

};

function handleTimeline( session, callback ){ 

    if ( ( session.phase % 10 ) != 4 ){
        return callback ( null, session );
    }
    

    /**
     * load list of all open promotions, select one randomly and add it to the timeline
     * 
     */
    
    DB.knex('lm_promotion')
    .join('lm_like','lm_promotion.pr_like_id','lm_like.li_id')
    .join('lm_customer','lm_customer.cu_id','lm_promotion.pr_customer_id')
    .join('lm_promotion_instance','lm_promotion_instance.pi_id','lm_promotion.pr_instance_id')
    .where('pr_instance_id', '<>', 0 )
    .andWhere( DB.knex.raw( 'pr_current_count < pr_gift_count AND pr_end_time > now()' ) )
    .orderBy('pr_end_time', 'asc')
    .then(function(data) 
    {
        var promotions= data;
        
        var nextIndex= -1;
        
        if ( promotions.length > 0 ){
            nextIndex= getRandomInt ( 0, promotions.length );
        }
        
        var nextPromotion= undefined;
        
        if ( nextIndex >= 0 && nextIndex < promotions.length ){
            
            console.log('INFO: animation adding event for help request ' , promotions[nextIndex].pr_gift_comment );

            nextPromotion= promotions[nextIndex];
        }

        if ( nextPromotion ){
            
            preparePromotion ( nextPromotion );
            
            var se_message= nextPromotion.pr_customer_nick + '<br />' + nextPromotion.pr_gift_comment + '<br />' + nextPromotion.li_address;
            var se_title= 'Aktuelle Hilfsanfrage';
            
            DB.knex ('lm_sig_event')
            .insert({ 
                se_message:se_message,
                se_title:se_title,
                se_sender_id: 1,
                se_marker: nextPromotion.li_marker_reference,
                se_image_ref: nextPromotion.pr_gift_image_reference,
                se_long: nextPromotion.li_long,
                se_lat: nextPromotion.li_lat,
                se_type: '',
                se_date : moment().format('YYYY-MM-DD HH:mm')
             })
            .then(function(data)
            {
            });
        }
        callback ( null, session );
    })
    .catch(function (err) 
    {
        console.log('failed to read timeline sources' + err );
        callback ("failed to read timeline sources", session );
    });
    
    
};

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

}




function handleAnimation(){
  
    
    /**
     * load all sessions with animation set on
     * advance statistics every minute
     * advance video/image every 2 minutes and show video or image (40 s)
     * simulate events every minute (select one request that is not in the timeline and create event for it)
     */

    
    var mmt = moment();
    var mmtMidnight = mmt.clone().startOf('day');
    var diffSeconds = mmt.diff(mmtMidnight, 'seconds');
    
    
    
    
    DB.knex('lm_sig_kiosk_session')
    .where('lm_sig_kiosk_session.ks_animation', 1 )
    .then(function(data) 
    {
        var sessions= data;

        if ( !sessions.length )
            return;
        
        //console.log('INFO: found sessions for animation ' , JSON.stringify ( data ) );
        
        async.each ( sessions, function ( session, callback ){

            session.diffSeconds= diffSeconds;
            session.step= Math.floor ( session.diffSeconds / 30 );
            session.phase= Math.floor ( session.step % 20 );
            
            console.log('INFO: found session for animation' , session.ks_key , ' step', session.step, ' phase', session.phase );
            
            async.waterfall([start(session),handleStatistics,handleImages,handleVideo,handleTimeline], function (error,session) {
                
                 if (error) {
                     console.log("ERROR: found error in waterfall ", error );
                 }
                 else
                 {
                     DB.knex('lm_sig_kiosk_session')
                     .update({
                         ks_statistic_category: session.ks_statistic_category,
                         ks_center_image_ref: session.ks_center_image_ref,
                         ks_video_url: session.ks_video_url
                     })
                     .where('lm_sig_kiosk_session.ks_id', session.ks_id )
                     .then(function(data){

                         //console.log("INFO: update of session with ", JSON.stringify(session) );
                     }); 
                 }
             });
        },
        function(err){
            console.log('ERROR: failed to each session ' + err );
        });
    })
    .catch(function (err)     {
        console.log('ERROR: failed to find/update sessions ' + err );
    });
    
}

module.exports = function () {
    
    var module = {};
    
    module.reverseGeocodeLocationsOneShot= function () {
        
        var googleMapsClient = require('@google/maps').createClient({            key: config.google_api_key          });        
        
        
        console.log('INFO: reverse geocode static impact graph data locations');

        DB.knex('lm_sig_static_dataset')
        .select(['lm_sig_static_dataset.*'])
        .orWhereNull('lm_sig_static_dataset.ssd_long' )
        .orWhereNull('lm_sig_static_dataset.ssd_lat' )
        .orWhereNull('lm_sig_static_dataset.ssd_radius' )
        .orWhere('lm_sig_static_dataset.ssd_long', 0.0 )
        .orWhere('lm_sig_static_dataset.ssd_lat', 0.0 )
        .limit(100)
        .then(function(data) 
        {
            var datasets= data;
            
            
            async.each ( datasets, function ( dataset, callback ){

                console.log('INFO: found dataset for reverse geocoding ' , JSON.stringify ( dataset ) );
                
                var location= dataset.ssd_region_nation;
                if ( dataset.ssd_region_province )
                    location= dataset.ssd_region_province+ ', ' + dataset.ssd_region_nation;
                if ( dataset.ssd_region_district )
                    location= dataset.ssd_region_district + ' district, ' + dataset.ssd_region_nation;
                if ( dataset.ssd_region_community )
                    location= dataset.ssd_region_community;
                if ( dataset.ssd_region_location )
                    location= dataset.ssd_region_location;
                
                console.log('INFO: using location ' , location );
                
                
                googleMapsClient.geocode({
                    address: location
                  }, function(err, response) {
                    if (!err) {
                        
                        var result= response.json.results[0];
                        
                        console.log('INFO: result ', JSON.stringify ( result ) );

                        
                        var long= result.geometry.location.lng;
                        var lat= result.geometry.location.lat;
                        var bounds= result.geometry.bounds || result.geometry.viewport;
                        
                        console.log('INFO: bounds ', JSON.stringify ( bounds ) );

                        var radiusKM= getDistanceFromLatLonInKm (bounds.northeast.lat, bounds.northeast.lng, bounds.southwest.lat, bounds.southwest.lng) / 2;
                        console.log('INFO: radius in KM ', radiusKM );
                        
                        
                        DB.knex('lm_sig_static_dataset')
                        .update( {'ssd_long' : long, 'ssd_lat': lat, 'ssd_radius': radiusKM } )
                        .where('ssd_id', dataset.ssd_id)
                        .then(function(){
                            
                        });
                    }
                  });
            },
            function(err){

                console.log('ERROR: failed to each datasets ' + err );
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find/update datasets ' + err );
        });
     };
     
     module.dailyStatus= function () {
         console.log('INFO: daily status');
     };

     
     
    module.perHalfMinute= function () {
        
        handleAnimation();
        
    };

    return module;
};


function getDistanceFromLatLonInKm (lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
  };

function deg2rad(deg) {
    return deg * (Math.PI/180)
}




