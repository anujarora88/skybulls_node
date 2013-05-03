DataImporter = function(specs){

    var securities = specs.securities;

    var stockDataAccessor = specs.stockDataAccessor;

    var callback = specs.callback ? specs.callback : function(){};

    var last_fire_time = null;

    var last_added = true ;

    function recursive(ii, fn){
        if(ii< securities.length){
            var securitySymbol = securities[ii];
            stockDataAccessor.getLatestInfo(securitySymbol, function(symbol, latestStockInfo){
                var currDateInteger = Math.round(new Date().getTime() / 1000);
                var change = Math.round((Math.random() * 10)*100)/100;

                if(latestStockInfo){
                    var latestPrice = latestStockInfo["price"];
                    latestStockInfo["price"] = Math.round((last_added ? latestStockInfo["price"] - change : latestStockInfo["price"] + change)*100)/100;
                    latestStockInfo["date"] = currDateInteger;
                    latestStockInfo["change"] = last_added ? -change : change;
                    latestStockInfo["percentageChange"] = Math.round((last_added ? -change/latestStockInfo["price"]*100 : change/latestStockInfo["price"]*100)*100)/100;
                    latestStockInfo["volume"] = Math.round((Math.random())*10000)/100;
                }else{
                    latestStockInfo = {date: currDateInteger,price: 100, open: 99, volume:10000, high: 100, low:99, change: last_added ? -change : change, percentageChange: last_added ? -change/10 : change/10};
                    latestStockInfo["price"] = currDateInteger % 2 == 0 ? (Math.round((100+change) * 100)) / 100 : (Math.round((100-change) * 100)) / 100;
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
        recursive(0, fn);
        last_fire_time = new Date();
        last_added = !last_added

    };
};
exports.DataImporter = DataImporter;