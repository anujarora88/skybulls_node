var clone = require('clone');

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
        socketIO.sockets.clients().forEach(function (socket) {
            var graphStocks = socket.get("graph", function (err, message) {
                if(message) {
                   var stocks = message.split(",");
                   var dataMap = {};
                   for(var ii=0; ii< stocks.length; ii++){
                       dataMap[stocks[ii]] = clonedUpdates[stocks[ii]];
                   }
                   socket.emit("graph data", {"data": dataMap});
                }
            });

        });

    };


};
