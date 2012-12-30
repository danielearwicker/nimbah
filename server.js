var express = require('express');
var app = express();

app.use(express.static(__dirname));

app.get('/hellojoe', function(req, res){
    var body = 'Hello Joe!';
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length);
    res.end(body);
});

app.listen(process.env.PORT || 1337);

