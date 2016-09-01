var express = require('express');
var GoogleUrl = require('google-url');
var favicon = require('serve-favicon');
var mongo = require('mongodb').MongoClient;
var app = express();
var db;
var new_flag = false;
var existing_flag = false;
var error_flag = false;
var googleUrl = new GoogleUrl({
    key: 'AIzaSyB5i1sdnt6HwzrvsPTBu0FbPiUZrM_BCsk'
});
var PORT = 8080;

mongo.connect('mongodb://localhost:27017/url-shortener', function(err, newDb) {
    if (err) {
        throw new Error('Database failed to connect');
    }
    else {
        console.log('Successfully connected to MongoDB on port 27017');
    }
    db = newDb;
    db.createCollection('sites', {
        autoIndexID: true
    });
});

app.use(favicon(__dirname + '/public/favicon.ico'));

app.get('/new/*', function(req, res) {
    var doc;
    console.log('This is the url: ' + req.params[0]);
    googleUrl.shorten(req.params[0], function(err, shortUrl) {
        if (err) {
            console.log(err);
        }
        else {
            console.log(shortUrl);
        }
        validateUrl(req.params[0]).then(function() {
            check_db(req.params[0], shortUrl, db).then(function(doc) {
                if (new_flag) {
                    res.json(doc.ops);
                }
                else if (existing_flag) {
                    res.redirect(doc.shortUrl);
                }
                else if(error_flag){
                    res.json('Your input contains an error');
                }
                res.end();
            }, function(err) {
                throw err;
            });
        }, function(err){
            console.log('error being thrown');
            res.json('Your input contains an error');
        });

    });
});


app.listen(process.env.PORT, function() {
    console.log('Express listening on: ' + PORT);
});

function validateUrl(url) {
    return new Promise(function(resolve, reject) {
        var regex = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
        if (regex.test(url) == true) {
            resolve();
        }
        else {
            error_flag = true;
            reject();
        }
    });
}


function check_db(longUrl, shortUrl, db) {
    var new_doc;
    return new Promise(function(resolve, reject) {
        db.collection('sites').findOne({
            'longUrl': longUrl,
            'shortUrl': shortUrl
        }, function(err, doc) {
            if (err) {
                console.log(err);
                reject(err);
            }
            if (doc) {
                console.log('This site already exists on the database');
                existing_flag = true;
                resolve(doc);
            }
            else {
                save_db(longUrl, shortUrl, db).then(function(doc) {
                    console.log('This site does not exist on the database');
                    console.log(doc);
                    new_doc = doc;
                    new_flag = true;
                    resolve(new_doc);
                });

            }
        });
    });

}

function save_db(longUrl, shortUrl, db) {
    return new Promise(function(resolve, reject) {
        db.collection('sites').insert({
            'longUrl': longUrl,
            'shortUrl': shortUrl
        }, function(err, doc) {
            if (err) {
                reject(err);
            }
            else {
                resolve(doc);
            }
            db.close();
        });
    });


}