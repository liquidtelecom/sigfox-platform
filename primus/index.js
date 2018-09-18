'use strict';

var Primus = require('primus')
    , http = require('http');

var server = http.createServer(/* request handler */)
    , primus = new Primus(server, {/* options */});


var MongoClient = require('mongodb').MongoClient;
const mongodbUrl = process.env.MONGO_URL;
var db;

// Connect to the db
MongoClient.connect(mongodbUrl, { useNewUrlParser: true }, function(err, client) {
    if(err) {
        console.error("mongodbUrl not set on primus");
        throw err;
    }
    // get db name
    let s = mongodbUrl.split("/");
    let dbName = s[s.length-1];

    db = client.db(dbName);
    console.log("Primus connected to mongo");
});



//
// Listen for new connections and send data
//
primus.on('connection', function connection(spark) {
    console.log('new connection');

    spark.on('data', function data(packet) {
        if (!packet) return;

        console.log('incoming:', packet);

        if (packet === 'user_online') {
            db.collection("onlineUser").insertOne({
                "user_id": packet.user_online.user_id,
                "timestamp": packet.user_online.timestamp,
                "spark_id": spark.id,
                "action": "connect"
            });
        }
    });
});


primus.on('disconnection', function end(spark) {
    console.log('disconnection');
    db.collection("onlineUser").findOneAndDelete({"spark_id": spark.id});
});


Primus.createServer(function connection(spark) {

}, { port: process.env.PORT || 2333,
    transformer: 'websockets'
});


primus.save(__dirname +'/primus.js', function save(err) {

});

server = http.createServer(function server(req, res) {
    res.setHeader('Content-Type', 'text/html');
    fs.createReadStream(
        __dirname + (~req.url.indexOf('primus.js') ? '/primus.js' : '/index.html')
    ).pipe(res);
});