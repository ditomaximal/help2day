var crypto = require('crypto');
var path = require('path');
var mailer = require('nodemailer');
var email_template = require('email-templates').EmailTemplate;
var config= require('../config/configuration');

var algorithm = 'aes-256-ctr';

var exports = module.exports = {};

exports.encrypt= function (email,salt,key) {
    var salt_sized = salt;
    var key_sized = key;
    
    if ( !email )
        return '';
    
    var cipher = crypto.createCipheriv(algorithm, key_sized, salt_sized )
    var encrypted = cipher.update(email, 'utf8', 'hex')
    encrypted += cipher.final('hex');
    return encrypted;
};

exports.decrypt= function (encrypted,salt,key) {
    
    try {
        
        var decipher = crypto.createDecipheriv(algorithm, key, salt )
        var dec = decipher.update(encrypted, 'hex', 'utf8')
        dec += decipher.final('utf8');
        return dec;
        
    } catch (ex) {
        
        console.error( 'ERROR: decryption failure:' + ex )
        
        return '';
    }
    
};


exports.sendMailByTemplateAsync =  function ( data, template_name, receivers, bcc, subject ){
    
    var templatesDir = path.resolve(__dirname, '..', 'templates')
    
    //console.log ( templatesDir );
    
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
          from: "help2day <"+config.mail_user+">",
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
              console.log("INFO: succeeded to send confirmation mail" );
          }
          transporter.close();
      });
    });
};





