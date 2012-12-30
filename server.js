var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;
var connect = require('connect');
var janrain = require('janrain-api'),
    engageAPI = janrain('386e29baf51cc7eb88fe3da89ea2f514a4c9ac9a');

var homepage = process.env.NIMBAH_HOMEPAGE || 'http://127.0.0.1';

app.use(express.static(__dirname));

var connectionString = 'mongodb://nodejitsu:322270e3d4b21555bb6253d3233e5923@linus.mongohq.com:10069/nodejitsudb8668093658';

app.get('/hellojoe', function(req, res){
    mongo.connect(connectionString, function(err, db) {
        if(!err) {
            res.send("Still we are connected");
        } else {
            res.send('Got an error[2] - ' + err.toString());
        }
     });
});

app.post('/token', connect.bodyDecoder(), function(req, res){
    var token = req.body.token;
    if(!token || token.length != 40 ) {
        res.send('Bad Token!');
        return;
    }

    engageAPI.authInfo(token, true, function(err, data) {
        if (err) {
            console.log('ERROR: ' + err.message);
            return;
        }

        req.redirect(homepage + '#login:' + data.profile.identifier);
    });

});

app.listen(process.env.PORT || 1337);

