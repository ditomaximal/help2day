/**
 * application logic of help2day APP
 * 
 * dietmar millinger @ grex it services gmbh
 * 
 */

/**
 * sets up required basic modules
 */
var crypto = require('crypto');
var path = require('path');
var mailer = require('nodemailer');
var email_template = require('email-templates').EmailTemplate;

var algorithm = 'aes-256-ctr';

var exports = module.exports = {};

exports.encrypt= function (email,salt,key) {
    var salt_sized = salt;
    var key_sized = key;
    
    var cipher = crypto.createCipheriv(algorithm, key_sized, salt_sized )
    var encrypted = cipher.update(email, 'utf8', 'hex')
    encrypted += cipher.final('hex');
    return encrypted;
};

exports.decrypt= function (encrypted,salt,key) {
    var decipher = crypto.createDecipheriv(algorithm, key, salt )
    var dec = decipher.update(encrypted, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
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
          from: "help2day <confirmation@grex-app.com>",
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
              console.log("INFO: succeeded to send confirmation mail to " + mail.to );
          }
          transporter.close();
      });
    });
};



exports.getDistanceFromLatLonInKm = function (lat1,lon1,lat2,lon2) {
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





