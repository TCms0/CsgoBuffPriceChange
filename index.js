// Imports
var request = require("request");
var fs = require("fs");
var config = require("./config.json");
// Variables
var PriceChangeArray = [];
var InventoryItems;
var Result;

// Functions
StartBot();
function StartBot() {
  if (config.EmpireKey.length > 0 && config.PricempireApi.length > 0) {
    if (config.BotEnabled) {
      console.log("Bot is enabled.");
    }
  } else {
    console.log("Empire / Pricempire API key is not set.");
  }
  var EmpireKey = config.EmpireKey;
  GetInventorySize(EmpireKey).then(function (result) {
    InventoryItems = result;
    console.log("Awaiting data");
    GetPricempireData().then(function (result) {
      Result = result;
      PriceChange(InventoryItems, Result).then(function (result) {});
    });
  });
}
function GetInventorySize(ACCOUNT) {
  var options = {
    method: "GET",
    url: "https://csgoempire.com/api/v2/trading/user/inventory?update=false",
    headers: {
      Authorization: "Bearer " + ACCOUNT,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
    },
  };
  var InventoryItemsArray = [];
  return new Promise(async (resolve, reject) => {
    request(options, function (error, response) {
      if (error) throw new Error(error);
      var Response = JSON.parse(response.body);
      var InventoryItems = Response;
      try {
        if (InventoryItems.success) {
          var ResponseData = InventoryItems.data;
          for (var i = 0; i < ResponseData.length; i++) {
            var ItemData = ResponseData[i];
            InventoryItemsArray.push(ItemData.market_name);
          }
          //Sort on count
          InventoryItemsArray.sort();
          return resolve(InventoryItemsArray);
        }
      } catch (error) {
        console.log(error);
      }
    });
  });
}
function GetPricempireData() {
  try {
    var options = {
      method: "GET",
      url: "https://api.pricempire.com/v2/getAllItems?token=" + config.PricempireApi + "&source=buff163_quick,buff163_quick_avg7&currency=USD",
      headers: {
        authority: "api.pricempire.com",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="101", "Opera GX";v="87"',
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36 OPR/87.0.4390.58",
      },
      followRedirect: false,
    };
    //Promise
    return new Promise(function (resolve, reject) {
      //Wait for request to finish
      request(options, function (error, response, body) {
        var Data = JSON.parse(body);
        if (error) {
          throw new Error(error);
          return resolve();
        }
        if (response.statusCode == 200) {
          return resolve(Data);
        } else {
          console.log(Data);
          return resolve(Data);
        }
      }); //End of request
    });
  } catch (e) {
    console.log(e);
  }
}

function PriceChange(InventoryItems, AllData) {
  try {
    return new Promise(function (resolve, reject) {
      var InventoryItemsLength = Object.keys(InventoryItems).length;
      for (var i = 0; i < InventoryItemsLength; i++) {
        var ItemName = InventoryItems[i];
        var FindItem = AllData[ItemName];
        var IsInArray = PriceChangeArray.find((x) => x.Name == ItemName);
        if (!IsInArray && FindItem) {
          var BuffQuick = FindItem.buff163_quick / 100;
          var BuffQuick7 = FindItem.buff163_quick_avg7 / 100;
          var Changeperc = (((BuffQuick - BuffQuick7) / BuffQuick7) * 100).toFixed(2);
          //Check if ItemName is not in
          if (Changeperc > -50) {
            var ItemData = {
              Name: ItemName,
              BuffQuick: BuffQuick,
              BuffQuick_7: BuffQuick7,
              Change: (BuffQuick - BuffQuick7).toFixed(2),
              ChangePercent: (((BuffQuick - BuffQuick7) / BuffQuick7) * 100).toFixed(2),
            };
            PriceChangeArray.push(ItemData);
          }
        }
      }
      PriceChangeArray.sort(function (a, b) {
        return b.ChangePercent - a.ChangePercent;
      });
      fs.writeFile("Items_price_change.json", JSON.stringify(PriceChangeArray), function (err) {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved!");
        return resolve(PriceChangeArray);
      });
    });
  } catch (e) {
    console.log(e);
  }
}
