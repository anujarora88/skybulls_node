DataImporter = function(specs){

    var securities = specs.securities;

    var stockDataAccessor = specs.stockDataAccessor;

    var callback = specs.callback ? specs.callback : function(){};

    var last_fire_time = null;

    function recursive(ii, fn){
        if(ii< securities.length){
            var securitySymbol = securities[ii];
            stockDataAccessor.getLatestInfo(securitySymbol, function(symbol, latestStockInfo){
                var currDateInteger = Math.round(new Date().getTime() / 1000);
                var change = Math.random();
                if(latestStockInfo){
                    var latestPrice = latestStockInfo["close"];
                    latestStockInfo["close"] = Math.abs(currDateInteger % 2 == 0 ? (Math.round((latestPrice+(change*10)) * 100)) / 100 : (Math.round((latestPrice-change) * 100)) / 100);
                    latestStockInfo["date"] = currDateInteger
                }else{
                    latestStockInfo = {"date": currDateInteger,"close": 100, "open": 99, "volume":10000, "high": 100, "low":99};
                    latestStockInfo["close"] = currDateInteger % 2 == 0 ? (Math.round((100+change) * 100)) / 100 : (Math.round((100-change) * 100)) / 100;
                    latestStockInfo["date"] = currDateInteger
                }

                callback(symbol, latestStockInfo);
                stockDataAccessor.addLatestInfo(symbol, latestStockInfo, function(val){
                    recursive(ii+1, fn)
                });
            });
        }else{
            fn();
        }

    }

    this.execute = function(fn){
        console.log("Started Data import " + new Date());
        recursive(0, fn)
        last_fire_time = new Date();

    };
};
exports.DataImporter = DataImporter;