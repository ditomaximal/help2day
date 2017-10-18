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
var grex = require('../app/helpers.js');
var truncate = require('truncate');
var multer = require('multer');
var upload = multer({ dest: '/files' })
var path = require('path');



/**
 * A) POST event (DONE)
 * A) POST image for event (DONE)
 * A) POST statistics
 * A) animate statistics (DONE)
 * A) animate events. Event fake generator. (OPEN)
 * A) video display and animation (DONE)
 * B) API authentication: http://blog.slatepeak.com/refactoring-a-basic-authenticated-api-with-node-express-and-mongo/ (DONE)
 * B) removing all keys outside configuration.js (OPEN)
 * 
 */


module.exports = function(app,passport,masterkey,mastersalt)
{
    
/**
 * 
 * MAIN PAGE
 * 
 */    
    app.get( '/sig', function(req, res)
    {
        var session_key= req.query.ks_key || 'none';
        
        DB.knex('lm_sig_kiosk_session')
        .where('lm_sig_kiosk_session.ks_key', session_key )
        .then(function(data) 
        {
            var session= data[0];

            session.ks_api_key= '***';

            //console.log('session ' + JSON.stringify(session) )
            
            res.render('sig_kiosk',
            {
                session: session,
                message : req.flash('sigMessage')
            });
        })
        .catch(function (err) 
        {
            console.log('ERROR: failed to find/update datasets ' + err );
        });
    });

    
    app.get( '/sig/session', function(req, res)
    {
        var session_key= req.query.ks_key || 'none';

        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
        DB.knex('lm_sig_kiosk_session')
        .where('lm_sig_kiosk_session.ks_key', session_key )
        .then(function(data) 
        {
            var session= data[0];
            session.ks_api_key= '***';

            jsonData= session;
            jsonData.status= 'ok';
            res.json( jsonData );
        })
        .catch(function (err) 
        {
            jsonData.status= 'nok';
            
            res.json( jsonData );
            
            console.log('ERROR: failed to find/update datasets ' + err );
        });
    });

    
    app.get( '/sig/data', function(req, res)
    {
        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");

        
        var session_key= req.query.ks_key || 'none';
        
        DB.knex('lm_sig_kiosk_session')
        .where('lm_sig_kiosk_session.ks_key', session_key )
        .then(function(data) 
        {
            var session= data[0];
            session.ks_api_key= '***';

            jsonData= session;
            
            jsonData.status= 'ok';
            jsonData.radiusDegree= jsonData.ks_radius / 110.54; // approximation
        
            //console.log('DEBUG: loading statistics with data ' + JSON.stringify ( jsonData ) );
        
            DB.knex('lm_sig_static_dataset')
            .join('lm_sig_source','lm_sig_static_dataset.ssd_source_id','lm_sig_source.ss_id')
            .where('lm_sig_static_dataset.ssd_category', session.ks_statistic_category )
            .where('lm_sig_static_dataset.ssd_long','>', session.ks_longitude - jsonData.radiusDegree )
            .where('lm_sig_static_dataset.ssd_long','<', session.ks_longitude + jsonData.radiusDegree )
            .where('lm_sig_static_dataset.ssd_lat','>', session.ks_latitude - jsonData.radiusDegree )
            .where('lm_sig_static_dataset.ssd_lat','<', session.ks_latitude + jsonData.radiusDegree )
            .orderBy('lm_sig_static_dataset.ssd_long','desc')
            .limit(100)
            .then(function(data) 
            {
                var datasets= data;

                //console.log('DEBUG: loading statistics found data ' + JSON.stringify ( datasets ) );
    
                jsonData.data= [];
                
                for ( var i= 0; i< datasets.length; i++ ){
    
                    var dataset= datasets[i];
                    
                    dataset.ssd_title= dataset.ssd_title || dataset.ssd_region_province;
                    dataset.ssd_message= dataset.ssd_message || ( dataset.ssd_hours + " Stunden Freiwilligenarbeit in " + dataset.ssd_year );

                    jsonData.data.push( dataset );
                }
                
                res.json( jsonData );
                
            });
        })
        .catch(function (err) 
        {
            jsonData.status= 'nok';
            res.json( jsonData );
            
            console.log('ERROR: failed to find/update datasets ' + err );
        });
    });
    
    
    app.get('/sig/map/data', function(req, res)
    {
        var limit = req.query.limit || '42';
        var longitude = req.query.longitude || config.longitude;
        var latitude = req.query.latitude || config.latitude;
        var zoom = req.query.range || config.zoom;

        //console.log('DEBUG: loading help requests at ' + longitude + ',' + latitude + ',' + zoom );
        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
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
            res.send(JSON.stringify(promotions));
        })
        .catch(function (err) 
        {
            jsonData.status= 'nok';
            res.json( jsonData );

            console.log('failed to find map data ' + err );
        });
    });

    
    
    
    
    app.get('/sig/events/iframe', function(req, res)
    {
        var limit = req.query.limit || '10';
        var long= req.query.long || 14.520360; // defaults to austria
        var lat= req.query.lat || 47.667257;
        var radiusKM= req.query.radiusKM || 600.0;
        var radiusDegree= radiusKM / 110.54; // approximation
        var category= req.query.ssd_category || 'overall';
        var customerId= req.query.ssd_customer_id || 0;
        
        DB.knex('lm_sig_event')
        //.where('lm_sig_event.se_category', category )
        .where('lm_sig_event.se_long','>', long - radiusDegree )
        .where('lm_sig_event.se_long','<', long + radiusDegree )
        .where('lm_sig_event.se_lat','>', lat - radiusDegree )
        .where('lm_sig_event.se_lat','<', lat + radiusDegree )
        .orderBy('lm_sig_event.se_long')
        .limit(100)
        .then(function(data) 
        {
            var events= data;
            
            
            //console.log('found ' + JSON.stringify(events) )
            
            res.render('iframe_events',
            {
                events : events 
            });
        })
        .catch(function (err) 
        {
            console.log('failed to find hotspots ' + err );
            
            res.render('iframe_events',
            {
                events : undefined
            });
        });
    });
    
    
    app.get('/sig/events/data', function(req, res)
    {
        var limit = req.query.limit || '10';
        var long= req.query.long || 14.520360; // defaults to austria
        var lat= req.query.lat || 47.667257;
        var radiusKM= req.query.radiusKM || 600.0;
        var radiusDegree= radiusKM / 110.54; // approximation
        var category= req.query.ssd_category || 'overall';
        var customerId= req.query.ssd_customer_id || 0;
        
        //console.log ("DEBUG: found query ", JSON.stringify(req.query), " limit ", limit );
        
        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");

        DB.knex('lm_sig_event')
        .where('lm_sig_event.se_long','>', long - radiusDegree )
        .where('lm_sig_event.se_long','<', long + radiusDegree )
        .where('lm_sig_event.se_lat','>', lat - radiusDegree )
        .where('lm_sig_event.se_lat','<', lat + radiusDegree )
        .orderBy('lm_sig_event.se_date','desc')
        .limit(limit)
        .then(function(data) 
        {
            var events= data;
            
            for ( var i= 0; i< events.length; i++ ){

                var event= events[i];
                
                if ( !event.se_marker )
                    event.se_marker= "grex";
                event.se_age= moment( event.se_date ).locale('de-at').fromNow();
            }
            

            jsonData.status= 'ok';
            jsonData.events= data;

            res.json( jsonData );
        })
        .catch(function (err) 
        {
            console.log('failed to find events ' + err );
            
            jsonData.status= 'nok';
            res.json( jsonData );
        });
    });
    
    
    
    
    
    
    
    
    
    /**
     * POST statistics information
     * 
     */
    app.post('/sig/statistic', isValidTokenJson, upload.none(), function(req, res)    {
        
        var ssd_source_id= req.body.ssd_source_id || req.query.ssd_source_id;
        var ssd_hours= req.body.ssd_hours || req.query.ssd_hours;
        var ssd_year= req.body.ssd_year || req.query.ssd_year;
        var ssd_category= req.body.ssd_category || req.query.ssd_category;
        var ssd_customer_id= req.body.ssd_customer_id || req.query.ssd_customer_id;
        var ssd_user_id= req.body.ssd_user_id || req.query.ssd_user_id;
        var ssd_region_nation= req.body.ssd_region_nation || req.query.ssd_region_nation;
        var ssd_region_province= req.body.ssd_region_province || req.query.ssd_region_province;

        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
        DB.knex ('lm_sig_static_dataset')
        .insert({ 
            ssd_source_id:ssd_source_id,
            ssd_hours:ssd_hours,
            ssd_year: ssd_year,
            ssd_category: ssd_category,
            ssd_date : moment().format('YYYY-MM-DD HH:mm'),
            ssd_customer_id: ssd_customer_id,
            ssd_user_id: ssd_user_id,
            ssd_region_nation: ssd_region_nation,
            ssd_region_province: ssd_region_province
        })
        .then(function(data)
        {
            jsonData.status= 'ok';
            jsonData.ssd_id= data;

            res.json( jsonData );
        })
        .catch(function (err) 
        {
            jsonData.status= 'nok';
            res.json( jsonData );
            
            console.log('ERROR: failed to find/update datasets ' + err );
        });
    });


    
    /**
     * POST source information
     * 
     */
    app.post('/sig/statistic/source', isValidTokenJson, upload.none(), function(req, res)    {
        
        var ss_user_id= req.body.ss_user_id || req.query.ss_user_id;
        var ss_url= req.body.ss_url || req.query.ss_url;
        var ss_date= req.body.ss_date || req.query.ss_date;
        var ss_year= req.body.ss_year || req.query.ss_year;
        var ss_description= req.body.ss_description || req.query.ss_description;
        
        console.log('DEBUG: post source found ' + JSON.stringify(req.body) )
        
        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
        DB.knex ('lm_sig_source')
        .insert({ 
            ss_user_id:ss_user_id,
            ss_url:ss_url,
            ss_year: ss_year,
            ss_description: ss_description,
            ss_date : moment().format('YYYY-MM-DD HH:mm')
            })
        .then(function(data)
        {
            jsonData.status= 'ok';
            jsonData.ss_id= data;

            res.json( jsonData );
        })
        .catch(function (err) 
        {
            jsonData.status= 'nok';
            res.json( jsonData );
            
            console.log('ERROR: failed to find/update datasets ' + err );
        });
    });
    
    
    
    
    /**
     * POST event information
     * 
     */
    app.post('/sig/event', upload.none(), isValidTokenJson, function(req, res)    {
        
        var se_sender_id= req.body.se_sender_id || req.query.se_sender_id;
        var se_title= req.body.se_title || req.query.se_title;
        var se_message= req.body.se_message || req.query.se_message;
        var se_image_ref= req.body.se_image_ref || req.query.se_image_ref;
        var se_long= req.body.se_long || req.query.long || 16.0;
        var se_lat= req.body.se_lat || req.query.se_lat || 48.0;
        
        //console.log('DEBUG: post event found ' + JSON.stringify(req.body) )
        
        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
        DB.knex ('lm_sig_event')
        .insert({ 
            se_message:se_message,
            se_title:se_title,
            se_sender_id: se_sender_id,
            se_image_ref: se_image_ref,
            se_long: se_long,
            se_lat: se_lat,
            se_type: '',
            se_date : moment().format('YYYY-MM-DD HH:mm')
            })
        .then(function(data)
        {
            jsonData.status= 'ok';
            jsonData.se_id= data;

            res.json( jsonData );
        })
        .catch(function (err) 
        {
            jsonData.status= 'nok';
            res.json( jsonData );
            
            console.log('ERROR: failed to find/update datasets ' + err );
        });
    });
    

    /**
     * POST event image
     * 
     */
    
    app.post( '/sig/event/image', upload.single('file'), isValidTokenJson, function(req, res, next) {
        
        console.log('INFO: uploading event image file ' + JSON.stringify(req.file) );

        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
        if ( req.file ) 
        {
            compressAndResize( req.file, function(){

                var filesrc= req.file.path
                var fileparts= path.parse(filesrc);
                
                jsonData.status= 'ok';
                jsonData.se_image_ref= fileparts.name;
                res.json( jsonData );
            });
        }
        else
        {
            console.log('ERROR: failed to store image ' );
            
            jsonData.status= 'noko';
            res.json( jsonData );
        }
    });

    
    
    
    /**
     * POST image
     * 
     */
    
    app.post( '/sig/image', upload.single('file'), isValidTokenJson, function(req, res, next) {
        
        console.log('INFO: uploading image file ' + JSON.stringify(req.file) );

        var jsonData= {};
        res.header("Content-Type", "application/json; charset=utf-8");
        
        if ( req.file ) 
        {
            var key= req.body.ks_key;
            var apiKey= req.body.ks_api_key;
            
            compressAndResize( req.file, function(){

                var filesrc= req.file.path
                var fileparts= path.parse(filesrc);
                
                jsonData.status= 'ok';
                jsonData.si_image_ref= fileparts.name;
                
                DB.knex('lm_sig_image')
                .insert( { 
                    si_image_ref: fileparts.name,
                    si_key: key 
                } )
                .then(function(data) 
                {
                    res.json( jsonData );
                })
                .catch(function (err) 
                {
                    console.log('ERROR: failed to find/update sessions ' + err );
                    
                    jsonData.status= 'nok';
                    res.json( jsonData );
                });
            });
        }
        else
        {
            console.log('ERROR: failed to store image ' );
            
            jsonData.status= 'nok';
            res.json( jsonData );
        }
    });
    
    
    
    
    
    
    
    
    
    
    
    
    
};


var editor = path.resolve(__dirname, 'image_handler.js');

function compressAndResize (imageUrl,callback) 
{
    // We need to spawn a child process so that we do not block
    // the EventLoop with cpu intensive image manipulation
    var childProcess = require('child_process').fork(editor);
    
    childProcess.on('message', function(message) 
    {
        console.log('INFO: ', message);
    });
    childProcess.on('error', function(error) 
    {
        console.error('ERROR:', error.stack)
        callback ();
    });
    childProcess.on('exit', function() 
    {
        console.log('INFO: process exited');
        
        callback ();
    });
    
    
    childProcess.send(imageUrl);
}



function isValidTokenJson(req, res, next)
{
    // check database for API token in header
    
    var session_key= req.body.ks_key || req.query.ks_key || 'none';
    var api_key= req.body.ks_api_key || req.query.ks_api_key || '';

    var jsonData= {};
    jsonData.status= 'noki';
    
    console.log('INFO: found key ', session_key, ' api ', api_key );
    
    
    DB.knex('lm_sig_kiosk_session')
    .where('lm_sig_kiosk_session.ks_key', session_key )
    .where('lm_sig_kiosk_session.ks_api_key', api_key)
    .then(function(data) 
    {
        var session= data[0];

        if ( session )
        {
            session.ks_api_key= '***';
            
            console.log('INFO: found valid session ', JSON.stringify(session) );
            res.locals.session= session;
            return next();
        }
    })
    .catch(function (err) 
    {
        console.log('ERROR: failed to find/update datasets ' + err );
    });
}

