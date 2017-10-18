var config = {};


// PRODUCTION
config.own_customer_id= 2;
config.server_url= 'https://crm.****.org';

// STAGE
//config.own_customer_id= 1;
//config.server_url= 'http://crm.****.com';

// DEV
//config.own_customer_id= 1;
//config.server_url= 'http://localhost:8083';


config.database_user= '****';
config.database_password= '****';
config.mail_user= 'confirmation@****';
config.mail_password= '****';

config.google_api_key= '****';

config.image_url= config.server_url + '/image';
config.GREX_CONFIG_REAGREE_BLOCK_SECONDS= 0;
config.strict_category= 'help2day';
config.deeplink='/help2day';
config.deeplinkinstance='/hilfsanfrage';
config.webapp='https://app.****.org';

config.pageSize= 40;
config.facebook_app_id= ‘****’;
config.facebook_secret= '****';


/** TODO: fixing of admins */
config.internal_receivers= 'office@***.org';
config.internal_receivers_bcc= ‘***’;

config.master_admin_receivers= ‘***’;
config.all_receivers= ‘***’;


// VALID for PRODUCTION ONLY
config.masterAdminId= 1209;
config.masterAdminId1= 136;
config.masterAdminId2= 1197;
config.masterAdminId3= 110;
config.masterAdminId4= 1191;


module.exports = config;



