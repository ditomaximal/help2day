/**
 * server.js for help2day CRM
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

/**
 * sets up required basic modules
 */
var express  = require('express');
var app      = express();

var port = parseInt(process.argv[2], 10) || 8083;
var env = process.argv[3] || process.env.NODE_ENV || 'development'
var development_passphrase= 'thisdevelopmentpasswordisawsome';
var passphrase = process.argv[4] || development_passphrase;
var interface = process.argv[5] || null;

var path = require('path');
var config = require('./config/configuration.js');
var moment = require('moment');
var cron = require('node-cron');
var periodic = require('./app/periodic.js');
var fs = require('fs');



/**
 * sets up template engine
 * 
 */
var exphbs  = require('express-handlebars');
var handlebars = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: 
    {
        google_api_key: function () { return config.google_api_key; },
        facebook_share_url: function (promotion) 
        { 
            return 'https://www.facebook.com/dialog/share?' + 
                    'app_id=' + config.facebook_app_id + 
                    '&href=' +  encodeURIComponent(config.webapp + config.deeplinkinstance+'/'+ promotion.pr_instance_id )  +
                    '&redirect_uri=' + encodeURIComponent(config.webapp + config.deeplinkinstance+'/'+ promotion.pr_instance_id) + 
                    '&display=popup'+
                    '&hashtag=help2day'; 
        }, 
        webapp_url: function () { return config.webapp; },
        deeplink_url: function () { return config.webapp + config.deeplinkinstance; },
        server_url: function () { return config.server_url; },
        image_url: function () { return config.image_url; },
        isAdmin: function (user) { return user.us_role == 'admin'; },
        version: function () { return '1.0'; },
        isActive : function (ticket) { if ( ticket.gi_is_redeemed || moment().isAfter(ticket.gi_end_time) ) return true; return false; },
        ticketStatus: function (ticket) 
        { 
            if ( !ticket ) return '';
            if ( moment().isAfter(ticket.gi_end_time) )
            { 
                return ((ticket.gi_is_redeemed)?"eingelöst":"abgelaufen") + " " + moment ( ticket.gi_end_time ).locale('de').fromNow(); 
            } 
            else 
            { 
                return ((ticket.gi_is_redeemed)?"eingelöst" + " " + moment( ticket.gi_redeem_time ).locale('de').fromNow() : "läuft ab" + " " + moment ( ticket.gi_end_time ).locale('de').fromNow() ) ; 
            }               
        },
        ticketAblauf: function (ticket) 
        { 
            if ( !ticket ) return '';
            if ( moment().isAfter(ticket.gi_end_time) )
            { 
                return ((ticket.gi_is_redeemed)?"eingelöst am":"abgelaufen am") + " " + moment ( ticket.gi_end_time ).locale('de').format('DD.MM.YYYY, H:mm'); 
            } 
            else 
            { 
                if ( ! moment(ticket.gi_end_time).isValid() )
                    return 'läuft bis es aus ist';
                return ((ticket.gi_is_redeemed)?"eingelöst am" + " " + moment ( ticket.gi_redeem_time ).locale('de').format('DD.MM.YYYY, H:mm')           :"läuft ab am" + " " + moment ( ticket.gi_end_time ).locale('de').format('DD.MM.YYYY, H:mm')         ) ; 
            }               
        },
        promotionAblauf: function (promotion) 
        { 
            if ( !promotion ) return '';
            if ( moment().isAfter(promotion.pr_end_time) )
            { 
                return "abgelaufen am" + " " + moment ( promotion.pr_end_time ).locale('de').format('DD.MM.YYYY, H:mm'); 
            } 
            else 
            { 
                if ( ! moment(promotion.pr_end_time).isValid() )
                    return 'läuft bis es aus ist';
                return "läuft ab am" + " " + moment ( promotion.pr_end_time ).locale('de').format('DD.MM.YYYY, H:mm'); 
            }               
        }
    },
    defaultLayout: 'layout', 
    extname: '.handlebars'
});

app.engine('handlebars', handlebars.engine );
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));



/**
 * further dependencies
 * 
 */
var passport = require('passport');
var flash    = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var favicon = require('serve-favicon');




/**
 * database connection
 * 
 */
var configDB = require('./config/database.js');



/**
 * authentication
 * 
 */

var production_passphrase = fs.readFileSync('/etc/pp.local').toString().trim();
var production_salt = fs.readFileSync('/etc/ps.local').toString().trim();


if ( env === 'production' ){

    if ( !production_passphrase ){
        
        console.log( 'ERROR: found missing passphrase for production environment. Terminating.' );
        process.exit(1);
    }
    passphrase= production_passphrase;
}




const master_salt= production_salt; 


//console.log( 'DEBUG: found master key <' + passphrase + '>' );
//console.log( 'DEBUG: found master salt <' + master_salt + '>' );

const crypto = require('crypto');

const key_buffer = crypto.pbkdf2Sync( passphrase, master_salt, 7000, 32, 'sha512');
const salt_buffer = crypto.pbkdf2Sync( passphrase, master_salt, 5000, 16, 'sha512');

//console.log( 'INFO: created master key ', key_buffer.toString('hex') );
//console.log( 'INFO: created salt key ', salt_buffer.toString('hex') );

require('./config/passport')(passport,key_buffer, salt_buffer); // pass passport for configuration





/**
 * routes and paths
 * 
 */
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.use(express.static(path.join(__dirname, 'public' ) , { maxAge: 172800000 } ));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));



/**
 * logging
 * 
 */
app.use(morgan('default')); // log every request to the console





/**
 * sessions and authentication
 * 
 */
app.use(session({ secret: '****' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); 



/**
 * routes
 * 
 */
require('./app/crm.js')(app, passport, handlebars, key_buffer, salt_buffer );
require('./app/login.js')(app, passport, handlebars, key_buffer, salt_buffer );



/**
 * periodic jobs
 * 
 */

//cron.schedule('0 * * * * *', function() { periodic.perMinute(); } );
//cron.schedule('*/10 * * * * *', function() { periodic.dailyStatus(); } );
cron.schedule('0 50 23 * * *', function() { periodic.dailyStatus(); } );

//periodic.debug();
//periodic.encryptRecipients(key_buffer, salt_buffer);
//periodic.encryptPhone(key_buffer, salt_buffer);




/**
 * error handling
 * 
 */
app.get('*', function(req, res)
{
    console.log('INTRUSION: failed to find page from request ' + req.originalUrl + ' from host ' + req.hostname + ' and IP '+ req.ip );
    
    res.status(404).render('login',    { message:'Diese Seite gibt es nicht. Bitte melde uns dieses Problem. Falls du dich für unsere API interessierst, schreib uns bitte eine eMail an office@help2day.org.'});
});




/**
 * launch
 * 
 */

app.listen(port,interface);

console.log('INFO: the server listens on port ' + port + ' and interface ' + interface + ' and environment ' + env + ' from folder ' + __dirname );



