var express = require('express');
var connect = require('connect');

var nano = require('nano')(process.env.NIMBAH_COUCHDB).use('nimbah');

var janrain = require('janrain-api');
var engageAPI = janrain('386e29baf51cc7eb88fe3da89ea2f514a4c9ac9a');

var homepage = process.env.NIMBAH_HOMEPAGE || 'http://127.0.0.1';

var app = express();
app.use(express.static(__dirname));
app.use(express.json());

var flatten = function(str) {
    str = str.toLowerCase();

    var pattern = /^[_\-\.a-zA-Y0-9]$/;

    var parts = [];
    for (var c = 0; c < str.length; c++) {
        var ch = str.charAt(c);
        if (ch.match(pattern)) {
            parts.push(ch);
        } else {
            parts.push('Z' + str.charCodeAt(c) + 'Z');
        }
    }

    return parts.join('');
};

app.get('/config', function(req, res) {
    res.send({
        live: !!process.env.NIMBAH_HOMEPAGE
    });
});

app.get('/users/:userId', function(req, res) {
    nano.get(req.params.userId, { revs_info: false }, function(err, user) {
        if (err) {
            res.send(404);
        } else {
            if (!user.photo) {
                user.photo = 'img/nimbah64.png';
            }
            res.send(user);
        }
    });
});

app.post('/users/:userId/saved/:name', function(req, res) {
    var path = req.params.userId + '/' + req.params.name;
    nano.get(path, { revs_info: true }, function(err, saved) {
        if (err) {
            saved = {};
        }
        saved.pipeline = req.body;
        nano.insert(saved, path, function(err, result) {
            if (err) {
                console.log(err.toString());
                res.send(err);
            } else {
                res.send({});
            }
        });
    });
});

app.post('/token', connect.bodyParser(), function(req, res){
    var token = req.body.token;
    if(!token || token.length != 40 ) {
        console.log('Token looks bad: ' + token);
        return;
    }

    engageAPI.authInfo(token, true, function(err, data) {
        if (err) {
            console.log('ERROR: ' + err.message);
            return;
        }

        var id = flatten(data.profile.identifier);

        nano.get(id, { revs_info: true }, function(err, user) {
            if (err) {
                user = {};
            }
            user.identifier = data.profile.identifier;
            user.providerName = data.profile.providerName;
            user.email = data.profile.email;
            user.url = data.profile.url;
            user.photo = data.profile.photo;
            user.displayName = data.profile.displayName;

            nano.insert(user, id, function(err, result) {
                res.redirect(homepage + '/redirect.html#' + id);
            });
        });
    });

});

app.listen(process.env.PORT || 1337);

