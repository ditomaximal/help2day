var Bookshelf = require('bookshelf');
var config = require('./configuration.js');

var knex = require('knex')({
    client: 'mysql',
    connection: {
      host     : config.dbhost,
      user     : config.user,
      password : config.password,
      database : config.database,
      charset  : 'UTF8_GENERAL_CI',
    }
  });


var bookshelf = require('bookshelf')(knex);

module.exports = 
{
   db: bookshelf
};
