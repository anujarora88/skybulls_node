StockDataAccessor = function(specs){

    var redis = specs.redis;
    var client = specs.client;

    // @TODO add pipelining here!! batches of 10?
    this.addLatestInfo = function(symbol, json, callback){
        var stringifiedJSON = JSON.stringify(json);
        client.zadd(getSymbolCurrentDayData(symbol), json["date"] , stringifiedJSON, callback);
        client.set(getSymbolLatestData(symbol), stringifiedJSON, function(){})
    };

    this.getLatestInfo = function(symbol, callback){
       var self = this;
       client.get(getSymbolLatestData(symbol), function(err, val){
           if(val){
               callback(symbol, parseString(val))
           }else{
               getLatestInfoFromHistoricalData(symbol,function(val){
                    if(val){
                        callback(symbol, parseString(val))
                    }else{
                        callback(symbol, null)
                    }
               });
           }
       });
    };

    this.fetchAllData =  function(symbols, i, dataMap, callback){
        if( i < symbols.length ) {
            var self = this;
            this.getAllData( symbols[i], function(symbol, val) {
                if( val ) {
                    dataMap[symbol] = val;
                    self.fetchAllData(symbols, i+1, dataMap,callback)
                }
            })
        }else{
           callback(dataMap);
        }
    };


    this.getAllDataForMultipleSymbols= function(symbols, callback){
        var i =0;
        var dataMap = {};
        this.fetchAllData(symbols, 0, dataMap, callback);
    };



    this.getAllData = function(symbol, callback){
        var self = this;
        this.getHistoricalData(symbol, function(symbol, val){
            var data = val;
            self.getRecentDaysData(symbol, function(symbol, val){
                if(val && val.length > 0){
                    data.push.apply(data, val);
                }
                self.getCurrentDayData(symbol, function(symbol, val){
                    if(val && val.length > 0){
                        data.push.apply(data, val);
                    }
                    callback(symbol, data);
                });
            });
        });
    };

    this.getCurrentDayData = function(symbol, callback){
       return client.zrange(getSymbolCurrentDayData(symbol), 0, -1, function(err, val){
           callback(symbol, val);
       });
    };

    this.getRecentDaysData = function(symbol, callback){
        return client.zrange(getSymbolRecentDaysData(symbol), 0, -1, function(err, val){
            callback(symbol, val);
        });
    };

    this.getHistoricalData = function(symbol, callback){
        return client.zrange(getSymbolHistoricalData(symbol), 0, -1, function(err, val){
            callback(symbol, val);
        });
    };

    function getSymbolLatestData(symbol){
        return symbol + ":L"
    }

    function getSymbolCurrentDayData(symbol){
       return symbol + ":C"
    }

    function getSymbolRecentDaysData(symbol){
       return symbol + ":R"
    }

    function getSymbolHistoricalData(symbol){
       return symbol + ":H"
    }

    function getLatestInfoFromCurrentDayData(symbol, callback){
       var list = client.zrange(getSymbolCurrentDayData(symbol), -1, -1, function(err, val){
           if(err){
               console.log("Error: " + err);
               return
           }
           if(val && val.length == 1){
               callback(val[0])
           }else{
               callback(null)
           }

       });

    }

    function getLatestInfoFromRecentDaysData(symbol, callback){
        var list = client.zrange(getSymbolRecentDaysData(symbol), -1, -1, function(err, val){
            if(err){
                console.log("Error: " + err)
                return
            }
            if(val && val.length == 1){
                callback(val[0])
            }else{
                callback(null)
            }
        });
    }

    function getLatestInfoFromHistoricalData(symbol, callback){
        var list = client.zrange(getSymbolHistoricalData(symbol), -1, -1, function(err, val){
            if(err){
                console.log("Error: " + err)
                return
            }
            if(val && val.length == 1){
                callback(val[0])
            }else{
                callback(null)
            }
        });
    }

    function parseString(str){
        return JSON.parse(str)
    }


    function redisCallback(err, value){
        if (err) {
            console.error("error " + err);
        } else {
            console.log("Worked: " + value);
        }
        return value
    }


};
exports.StockDataAccessor = StockDataAccessor;