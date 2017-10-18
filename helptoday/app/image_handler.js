var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var imageResize = require('gulp-image-resize');
var rename= require('gulp-rename')
var path = require('path');
var mime = require('mime-types')
const fs = require('fs');
var lwip = require('pajk-lwip');

function processImg(file)
{
    var filesrc= file.path
    var fileparts= path.parse(filesrc);
    var fileext= mime.extension(file.mimetype) || 'jpg';
    var filehead= fileparts.dir + '/' + fileparts.name;

    console.log('handling file ' + filehead + '_min.' + fileext + ' from ' + filesrc );

    return gulp.src(filesrc)
    .pipe( imagemin( { optimizationLevel : 5 } ) ).pipe(rename({basename: fileparts.name + '_min.' , extname:fileext }) ).pipe( gulp.dest('/files') )
    .pipe( imageResize({width : 500, height : 500, crop : true, imageMagick : true }) ).pipe(rename({basename: fileparts.name + '_500.' , extname:fileext }) ).pipe( gulp.dest('/files') )
    .pipe( imageResize({width : 200, height : 200, crop : true, imageMagick : true }) ).pipe(rename({basename: fileparts.name + '_200.' , extname:fileext }) ).pipe( gulp.dest('/files') )
    .pipe( imageResize({width : 100, height : 100, crop : true, imageMagick : true }) ).pipe(rename({basename: fileparts.name + '_100.' , extname:fileext }) ).pipe( gulp.dest('/files') );
}

process.on('message', function(images)
{
    console.log('INFO: image processing started');
    var stream = processImg(images);
    stream.on('end', function()
    {
        console.log('INFO: image processing completed');
        process.send('INFO: image processing completed');
        process.exit();
    });
    stream.on('error', function(err)
    {
        console.log('ERROR: image processing failed ' + err );
        process.send(err);
        process.exit(1);
    });
});
module.exports = {};