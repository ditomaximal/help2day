var Bookshelf = require('bookshelf');
var config= require('../config/configuration');

var knex = require('knex')({
    client: 'mysql',
    connection: {
      host     : 'localhost',
      user     : config.database_user,
      password : config.database_password,
      database : 'likemap',
      charset  : 'UTF8_GENERAL_CI',
    }
  });


var bookshelf = require('bookshelf')(knex);

module.exports = 
{
   db: bookshelf
};
