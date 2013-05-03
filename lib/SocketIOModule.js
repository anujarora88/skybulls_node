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
