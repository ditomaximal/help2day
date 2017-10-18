# help2da.org System Documentation


## Webapp

The webapp is setup in the style of a node.js application.


### Application Logic

The application is implemented in files located in the `app` folder. This folder contains the following javascript files.


1. communication.js contains communication functions for mail transmission as well as a daemon function for transmission of notifications resulting from adding new help requests.

1. helpers.js contains general supportive functions e.g. for encryption and decryption

1. image_handler.js contains functions for image resizing and storage

1. impactgraph.js contains functions for the SIG API 

1. impactgraphperiodic.js contains the kiosk animation

1. login.js contains the login code as well as registration functions

1. periodic.js contains some helper functions plus the integration of the communication periodic part

1. webapp.js contains the core application logic and API of the webapp


### Configuration

The main configuration code is located in the `config` folder. This folder contains the following javascript files.

1. auth.js contains a helper for the facebook authentication (currently not active)

1. configuration.js contains the most of the configuration constants.

1. database.js contains the setup of the connection to the database.

1. model.js contains some old artifacts of the bookshelf module (no longer actively used)

1. passport.js contains the integration code for passport for local login, facebook login and anonymous login


### Static Web Files

The static web files are located in the `public` folder. This folder contains the following files.

1. Several javascript and css files for semantic-ui, dropzone, jquery ...

1. Font files

1. images

1. CSS files

1. Logo files


### Email Template files

The application uses eMail templates from the node.js module **email-templates**. The template files are located in the folder `templates`.


### HTML Template files

The application uses HTML templates from the node.js module **handlebars**. The template files are located in the folder `views`.


### Integration Code

The main file is `server.js` in the root folder. This file contains the setup and integration of the application. 



## CRM System

This needs to be done. However, the structure is pretty much the same as for the webapp.






