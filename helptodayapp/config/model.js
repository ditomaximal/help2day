
var DB = require('./database').db;


var User = DB.Model.extend(
{
    tableName : 'lm_users',
    idAttribute : 'us_id',
    'customer' : function()
    {
        return this.hasOne(Customer, 'cu_user_id' );
    },
    'hotspots' : function()
    {
        return this.hasMany(Hotspots, 'li_user' );
    }
});


var Customer = DB.Model.extend(
{
    tableName : 'lm_customer',
    idAttribute : 'cu_id',
    'user': function () 
    {
        return this.belongsTo(User);
    },
    'promotions' : function()
    {
        return this.hasMany(Hotspots, 'li_user' );
    }
});

var Confirmation= DB.Model.extend(
{
    tableName : 'lm_confirmations',
    idAttribute : 'co_id'
});



var Hotspots = DB.Model.extend(
{
    tableName : 'lm_like',
    idAttribute : 'li_id',
    'user': function () 
    {
        return this.belongsTo(User);
    }
});

var Hotspot = DB.Model.extend(
{
    tableName : 'lm_like',
    idAttribute : 'li_id',
    'user': function () 
    {
        return this.belongsTo(User,'li_user');
    },
    'promotions' : function()
    {
        return this.hasMany(Promotions,'pr_like_id');
    }
});


var View = DB.Model.extend(
{
    tableName : 'lm_view',
    idAttribute : 'vw_id',
    'hotspot': function () 
    {
        return this.belongsTo(Hotspot);
    }
});

var Promotions = DB.Model.extend(
        {
            tableName : 'lm_promotion',
            idAttribute : 'pr_id',
            'customer': function () 
            {
                return this.belongsTo(Customer);
            }
        });

var Promotion = DB.Model.extend(
{
    tableName : 'lm_promotion',
    idAttribute : 'pr_id',
    'customer': function () 
    {
        return this.belongsTo(Customer);
    },
    'hotspot': function () 
    {
        return this.belongsTo(Hotspot,'pr_like_id');
    }
});

var PromotionInstance = DB.Model.extend(
{
    tableName : 'lm_promotion_instance',
    idAttribute : 'pi_id',
    'promotion': function () 
    {
        return this.belongsTo(Promotion, 'pi_promotion_id');
    }
});

var Gift = DB.Model.extend(
{
    tableName : 'lm_gift',
    idAttribute : 'gi_id',
    'user': function () 
    {
        return this.belongsTo(User,'gi_user_id');
    }
});

var Agree = DB.Model.extend(
{
    tableName : 'lm_agree',
    idAttribute : 'ag_id',
});

var Recipient = DB.Model.extend(
{
    tableName : 'lm_recipients',
    idAttribute : 're_id',
});



module.exports =
{
    User : User,
    Customer : Customer,
    Hotspots : Hotspots,
    Hotspot : Hotspot,
    Gift : Gift,
    Promotions : Promotions,
    Promotion : Promotion,
    Confirmation : Confirmation,
    PromotionInstance : PromotionInstance,
    View : View,
    Agree : Agree,
    Recipient : Recipient
};
