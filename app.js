
/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , http = require('http')
    , path = require('path'),
    events = require('events'),
    util = require('util'),
    sys = require('sys'),
    io = require('socket.io'),
    fs = require('fs'),
    crypto = require('crypto');

var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 8082);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'hbs');
    app.use(express.logger('dev'));
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('production', function(){
    require('nodetime').profile({
        accountKey: '074c09b05e3f0a23b52cc592ee699b6f3dc1e3ff',
        appName: 'Skybulls Node.js Application'
    });
});


var CONFIG = require("config");


var redis = require('redis');
var db = redis.createClient(CONFIG.redisPort, CONFIG.redisUrl);

db.on("error", function (err){
    console.log("Error " + err);
});



var listed_securities = ["NASDAQ:MSFT","NASDAQ:YHOO","NASDAQ:FB","NASDAQ:AAPL","NASDAQ:ORCL"];

var DataImporterModule = require('./lib/DataImporter.js');
var StockDataModule = require('./lib/StockDataModule.js');

var stockDataAccessor = new StockDataModule.StockDataAccessor({"redis": redis, "client": db});






app.use('/getFeed',function(req, res){
    var apiKey = req.query.apiKey;
    var timestamp = req.query.timestamp;
    var confirmKey = req.query.confirmKey;
    var hmac = crypto.createHmac('sha1', CONFIG.apiSecret);
    if (apiKey && confirmKey && hmac.update(timestamp+apiKey).digest('hex') == confirmKey && ((new Date()).getTime() - (new Date(parseInt(timestamp)*1000)).getTime())/1000 < 10 ){
        res.contentType("text/javascript");
        res.render('getFeed', {socketIOUrl: CONFIG.socketIOUrl, chartDiv: req.query.chartDiv,  queryStr: JSON.stringify({graph: req.query.graph, latest: req.query.latest})});
    }else{
        res.send(401, 'Please provide an api key and confirmation key!');
    }

});

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500, 'Something broke!');
});





var server = http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

// socket.io
var socketIO = io.listen(server);
socketIO.sockets.on('connection', function (socket) {
    socket.on('start feed', function (data) {
        if(data.graph){
            socket.set("graph", data.graph);
        }
        if(data.latest){
            socket.set("latest", data.latest);
        }
    });

    socket.on('init graph', function (data) {
        if(data.graph){
            var stocks = data.graph.split(",");
            stockDataAccessor.getAllDataForMultipleSymbols(stocks, function(dataMap){
                socket.emit("init graph", {"data": dataMap});
            });
        }else{
            socket.get("graph", function (err, message) {
                if(message) {
                    var stocks = message.split(",");
                    stockDataAccessor.getAllDataForMultipleSymbols(stocks, function(dataMap){
                        socket.emit("init graph", {"data": dataMap});
                    });
                }
            });
        }

    });

    socket.on('add latest', function (data) {
        socket.get("latest", function (err, message) {
            if(message) {
                socket.set("latest", message + ","+ data.latest);
            }
        });
    });

    socket.on('add graph', function (data) {
        var graphStocks =  [data.graph];
        stockDataAccessor.getAllDataForMultipleSymbols(graphStocks, function(dataMap){
            socket.emit("new graph data", JSON.stringify({"data": dataMap}));
        });

        socket.get("graph", function (err, message) {
            if(message) {
                socket.set("graph", message + ","+ data.graph);
            }
        });

    });

});

var socketIOModule = require('./lib/SocketIOModule.js');
var socketIOHandler = new socketIOModule.SocketIOHandler({"socketIO": socketIO});

var diObj = new DataImporterModule.DataImporter({"securities": listed_securities,
    "callback": socketIOHandler.registerLatestData ,"stockDataAccessor": stockDataAccessor});


var cronJob = require('cron').CronJob;
var job = new cronJob({
    cronTime: '*/5 * * * * *',
    onTick: function() {

        diObj.execute(function(){});
    },
    start: false
});
job.start();

setInterval(socketIOHandler.pushLatestData, 5000);










