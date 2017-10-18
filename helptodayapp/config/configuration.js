var config = {};


//PRODUCTION
config.server_url= 'https://app.help2day.org';

//STAGE
//config.server_url= '****';

//DEV
//config.server_url= 'http://localhost:8082';



config.image_url= config.server_url + '/image';

config.strict_category= 'help2day';
config.deeplink='/help2day';
config.deeplinkinstance='/hilfsanfrage';

config.database_user= '****';
config.database_password= '****';
config.mail_user= 'confirmation@****';
config.mail_password= '****';

config.google_api_key= '****';

config.webapp=config.server_url;
config.facebook_app_id= '****';
config.facebook_secret= '****';
config.crm_url= 'https://crm.****.org';

config.longitude= '16.348';
config.latitude= '48.169';
config.zoom= '11';

config.dbhost= 'localhost';
config.dbport= 3306;
config.user= '****';
config.password= '*****';
config.database= '****';

config.maxProfileID= 50;

config.websmsUser= 'office@****';
config.websmsPassword= '****';
config.websmsUrl= 'https://api.websms.com/';
config.smsSimulation= false;

config.smsInternal= ['43676*****','43676*****'];

module.exports = config;

 

