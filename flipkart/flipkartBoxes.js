var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://www.flipkart.com/search?q=selector%20boxes&marketplace=FLIPKART&otracker=start&as-show=off&as=off";
let pagesVisited = {};
let promises = [];
let numPagesVisited = 0;
let pagesToVisit = [];
let allinformation = [];
let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname;

let MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/"
// connecting to mongo
var dbo="";
MongoClient.connect(mongourl, function(err, db) {
  if (err) {throw err;
    return;}
   dbo = db.db("flipkart");
  });

pagesToVisit.push(start_url);
crawl();

function crawl() {
   if (pagesToVisit.length <= 0 ) {
      console.log("all pages have been visited");
      Promise.all(promises).then(function(values) {
            displayInformation();           
         })
         .catch(error => {
            console.log(error, +'Promise error');
         });
      return;
   }
   let nextPage = pagesToVisit.pop();
   if (nextPage in pagesVisited) {
      // We've already visited this page, so repeat the crawl
      crawl();
   }
   else {
      // New page we haven't visited	
      visitPage(nextPage, crawl);
   }
}
async function visitPage(url, callback) {
   // Add page to our set
   pagesVisited[url] = true;
   numPagesVisited++;
   // Make the request
   console.log("Visiting page " + url);
   let pageReq = pageRequest(url, callback);
   promises.push(pageReq);
   await pageReq.then(function(body) {
         let $ = cheerio.load(body);
         collectLinks($);
         searchForContents($, url)
         callback();
      }, function(err) {
         console.log(err);
         callback();
      })
      .catch(error => {
         console.log(error, +'Promise error');
      });
}

function pageRequest(url, callback) {

  var agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';
  var options = {
      url: url,
      headers: {
           'User-Agent': agent
        }
      };

   return new Promise(function(resolve, reject) {
      // Asynchronous request and callback
      request.get(options, function(err, response, body) {
         if (err) {
            reject(err);
            callback();
         }
         else {
            resolve(body);
         }
      }).on('error', function(e) {
         console.log(e);
      }).end();
   });
}

function collectLinks($) {
    let visitLinks=$('div._3liAhj a:nth-of-type(2)');
    let nextPages= $('._2zg3yZ  a._2Xp0TH');

   if (visitLinks != "") {
      visitLinks.each(function() {
          var link = $(this).attr('href');
         if (link == null) {
            return;
         }
         if (link.startsWith("/")){
            var thelink= baseUrl + link;
            pagesToVisit.push(thelink);
               }              
         else {                                   
                  pagesToVisit.push(link);
               }
            });
         }
    if(nextPages!="") {
      nextPages.each(function() {
          var pglink = $(this).attr('href');
         if (pglink == null) {
            return;
         }
         if (pglink.startsWith("/")){
            var alink= baseUrl + pglink;
            pagesToVisit.push(alink);
               }              
         else {                                   
                  pagesToVisit.push(pglink);
               }
            });
    } 
  
   }
 


function searchForContents($, url) {
   let container = $('div._1Zddhx');

   if (container != "") {
var general = $('.MocXoX ._2RngUh ul li'); 

var sale_price =$('._29OxBi ._3iZgFn ._2i1QSc ._3qQ9m1').text();
var regular_price=$('._29OxBi ._3iZgFn ._2i1QSc ._1POkHg').text();
var seller =$('div#sellerName a span').text();
var  Items = { };

general.each(function(){
var label = $(this).find('div').text().trim();
if(label=="Brand"){
Items[label]=$(this).find('ul li').text().trim();
}
if(label=="Model Name"){
Items[label]=$(this).find('ul li').text().trim();
}
if(label=="Sales Package"){
Items["Category"]=$(this).find('ul li').text().trim();
}
if(label=="HDMI"){
Items[label]=$(this).find('ul li').text().trim();
}
if(label=="Country of Origin"){
Items[label]=$(this).find('ul li').text().trim();
}

});

var moreInfo = $('.MocXoX ._39XK9P');
if(moreInfo!="")
 moreInfo.click(function(){
 console.log("we are here");

});

Items["Sale Price"]=sale_price;
Items["Regular Price"]=regular_price;
Items["Seller"]=seller;
     
 
	console.log(Items);  

     dbo.collection("selectorboxes").insertOne(Items, function(err, res) {
       if (err) throw err;
       console.log("----------saving " + Items.Brand);

     });
  
      allinformation.push(Items);
   }
}

function displayInformation() {
   console.log("Total number of items = " +allinformation.length);

}