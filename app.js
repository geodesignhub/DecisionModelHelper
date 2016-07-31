var express = require("express");
var req = require('request');
var async = require('async');
var bodyParser = require('body-parser');
var ejs = require('ejs');

var app = express();
app.set('view engine', 'ejs');
// app.use(express.static(__dirname + '/views'));
app.use('/assets', express.static('static'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json())

app.get('/', function(request, response) {
    var opts = {};
    if (request.query.apitoken && request.query.projectid) {
        opts = { 'apitoken': request.query.apitoken, 'projectid': request.query.projectid };
    }
    response.render('dm', opts);
});

app.post('/post/', function(request, response) {
    var baseurl = 'https://www.geodesignhub.com/api/v1/projects/';
    var apikey = request.body.apikey;
    var projectid = request.body.projectid;
    var cred = "Token " + apikey;
    var systems = baseurl + projectid + '/systems/';
    var sysIDs = async.parallel([
            function(callback) {
                req({
                    url: systems,
                    headers: {
                        "Authorization": cred,
                        "Content-Type": "application/json"
                    }
                }, function(err, response, body) {
                    if (err) {
                        console.log(err);
                        callback(true);
                        return;
                    }
                    obj = JSON.parse(body);
                    callback(false, obj);
                });
            }
        ],
        function(err, results) {
            if (err) {
                console.log(err);
                return 0;
            }
            var curres = results[0];
            var reslen = curres.length;
            var URLS = [];
            for (var x1 = 0; x1 < reslen; x1++) {
                var cursys = curres[x1];
                var url = baseurl + projectid + '/systems/' + cursys['id'] + '/evaluation/';
                URLS.push(url);
            }
            async.map(URLS, function(url, done) {
                req({
                    url: url,
                    headers: {
                        "Authorization": cred,
                        "Content-Type": "application/json"
                    }
                }, function(err, response, body) {
                    if (err || response.statusCode !== 200) {
                        return done(err || new Error());
                    }
                    return done(null, JSON.parse(body));
                });
            }, function(err, results) {

                if (err) return response.sendStatus(500);
                response.contentType('application/json');
                response.send({
                    "status": 1,
                    "results": results,
                    "sys": curres
                });
            });
        });
});

app.listen(process.env.PORT || 5000);