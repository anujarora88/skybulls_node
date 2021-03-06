var clone = require('clone');
var querystring = require('querystring');
var http = require('http');
var CONFIG = require("config");
var crypto = require("crypto");


exports.SocketIOHandler = function(specs){

    var socketIO = specs.socketIO;

    var updates = {};


    this.registerLatestData = function(symbol, data){
        if(!updates.hasOwnProperty(symbol)){
           updates[symbol] = [];
        }
        updates[symbol].push(data);
    };

    this.pushLatestData = function(){
        console.log("pushing data via socket io at " + new Date());
        var clonedUpdates = clone(updates);
        updates = {};
        var timestamp =  Math.round(new Date().getTime() / 1000);
        var hmac = crypto.createHmac('sha1', CONFIG.apiSecret);
        var confirmKey = hmac.update(timestamp.toString()+CONFIG.apiKey).digest('hex') ;

        // send data to rails app, only temporary!!
        var data = querystring.stringify({
            data: JSON.stringify(clonedUpdates),
            timestamp: timestamp,
            apiKey: CONFIG.apiKey,
            confirmKey:confirmKey
        });

        var options = {
            host: CONFIG.railsAppUrl,
            port: CONFIG.railsAppPort,
            path: '/updateData',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length
            }
        };

        var req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log("body: " + chunk);
            });
            res.on('error', function(err){
                console.log(err)
            });
        });

        req.on('error', function(err) {
            console.log("Error while sending data to rails app" + err);
        });

        req.write(data);
        req.end();


        socketIO.sockets.clients().forEach(function (socket) {
            socket.get("graph", function (err, message) {
                if(message) {
                   var stocks = message.split(",");
                   var dataMap = {};
                   for(var ii=0; ii< stocks.length; ii++){
                       dataMap[stocks[ii]] = clonedUpdates[stocks[ii]];
                   }
                   socket.emit("graph data", {"data": dataMap});
                }
            });

            socket.get("latest", function (err, message) {
                if(message) {
                    var stocks = message.split(",");
                    var dataMap = {};
                    for(var ii=0; ii< stocks.length; ii++){
                        if(clonedUpdates[stocks[ii]]){
                            var updates_length = clonedUpdates[stocks[ii]].length;
                            if(updates_length > 0){
                                dataMap[stocks[ii]] = clonedUpdates[stocks[ii]][updates_length -1 ]
                            }
                        }

                    }
                    socket.emit("latest data", {"data": dataMap});
                }
            });

        });

    };


};
