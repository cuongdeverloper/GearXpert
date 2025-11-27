const path = require('path');
const express = require('express');

const configViewEngine = (app) => {
    app.set('views', path.join('./src', 'views'));
    app.set('view engine', 'ejs');

    //config template engine

    //config static file (img,css,js...)
    app.use(express.static(path.join('./src', 'public')))
    // app.use(express.static(__dirname + '/node_modules/bootstrap/dist/css'));
    app.use('/css', express.static(path.join('node_modules', 'bootstrap', 'dist', 'css')));
    
    // <script src="../../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"></script>


}
module.exports = configViewEngine