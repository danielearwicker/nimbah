var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;

app.use(express.static(__dirname));

var connectionString = 'mongodb://nodejitsu:322270e3d4b21555bb6253d3233e5923@linus.mongohq.com:10069/nodejitsudb8668093658';

app.get('/hellojoe', function(req, res){
    mongo.connect(connectionString, function(err, db) {
        if(!err) {
            res.send("We are connected");
        } else {
            res.send(err.toString());
        }
     });
});

app.listen(process.env.PORT || 1337);

