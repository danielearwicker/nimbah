var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;

app.use(express.static(__dirname));

var connectionString = 'mongodb://nodejitsu:322270e3d4b21555bb6253d3233e5923@linus.mongohq.com:10069';


app.get('/hellojoe', function(req, res){
    /*var body = 'Hello Joe!';
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length);
    res.end(body);*/

    mongo.connect(connectionString, function(err, db) {
        if(!err) {
            res.send("We are connected");
        } else {
            res.send(err.toString());
        }
     });
});

app.listen(process.env.PORT || 1337);

