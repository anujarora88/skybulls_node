
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
    fs = require('fs')
    ;


var redis = require('redis');
var db = redis.createClient(6379, "localhost");

db.on("error", function (err){
    console.log("Error " + err);
});

var app = express();

var listed_securities = ["NASDAQ:MSFT","NASDAQ:YHOO","NASDAQ:FB","NASDAQ:AAPL","NASDAQ:ORCL"];

var DataImporterModule = require('./lib/DataImporter.js');
var StockDataModule = require('./lib/StockDataModule.js');

var stockDataAccessor = new StockDataModule.StockDataAccessor({"redis": redis, "client": db});



app.configure(function(){
    app.set('port', process.env.PORT || 8082);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});



app.use('/getFeed',function(req, res){
    //send out graph data
    var graphQuery = req.query.graph;
    var graphStocks = graphQuery.split(",");

    stockDataAccessor.getAllDataForMultipleSymbols(graphStocks, function(dataMap){
        var reqObj = {"graph": req.query.graph, "latest": req.query.latest};

        res.render(__dirname + '/views/index.jade', {
            title: "Skybulls", queryStr: JSON.stringify(reqObj), dataMap: JSON.stringify(dataMap)
        });
    });


});





var server = http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

// socket.io
var socketIO = io.listen(server);
socketIO.sockets.on('connection', function (socket) {
    socket.on('start feed', function (data) {
        socket.set("graph", data.graph);
        socket.set("latest", data.latest);
    });
});

var socketIOModule = require('./lib/SocketIOModule.js');
var socketIOHandler = new socketIOModule.SocketIOHandler({"socketIO": socketIO});

var diObj = new DataImporterModule.DataImporter({"securities": listed_securities,
    "callback": socketIOHandler.registerLatestData ,"stockDataAccessor": stockDataAccessor});


var cronJob = require('cron').CronJob;
var job = new cronJob({
    cronTime: '*/5 * * * * 1-5',
    onTick: function() {

        diObj.execute(function(){});
    },
    start: false,
    timeZone: "CLST"
});
job.start();

setInterval(socketIOHandler.pushLatestData, 15000)










