let request = require('request');
let cheerio = require('cheerio');
let URL = require('url-parse');
let EventEmitter = require('events');
let start_url = "https://www.aliexpress.com/category/509/cellphones-telecommunications.html?isCates=y";
const MAX_PAGES_TO_VISIT = 20;
let pagesVisited = {};
let AllLinks = [];
let pagesUrls = [];
let numPagesVisited = 0;
let pagesToVisit = [];
let SEARCH_WORD = "Mobile";
let orgUrl = new URL(start_url);
let baseUrl = orgUrl.protocol + "//" + orgUrl.hostname + "/";
let MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/Sites"
const emitter = new EventEmitter()
emitter.setMaxListeners(100)
pagesToVisit.push(start_url);
crawl();

function crawl() {
   if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
      console.log("All pages required have been visited.");
      Promise.all(AllLinks).then(function(values) {
            printTotalChecked();
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
   AllLinks.push(pageReq);
   await pageReq.then(function(body) {
         let $ = cheerio.load(body);
         searchForWord($, SEARCH_WORD, url);
         collectLinks($);
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
   return new Promise(function(resolve, reject) {
      // Asynchronous request and callback
      request.get(url, function(err, response, body) {
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

function searchForWord($, word, url) {
   var bodyText = $('html > body').text().toLowerCase();
   var m = bodyText.indexOf(word.toLowerCase());
   if (m !== -1) {
      console.log("search word" + word + "found" + url);
      var contentPart = bodyText.substring(m, m + 20);
      let Items = {
         urls: url,
         bodytext: contentPart,
         Images: " ",
      };
      Items.Images = getImages($);
      let item_sources = Items.urls;
      let item_texts = Items.bodytext;
      let item_imgUrl = Items.Images;
      saveData(item_sources, item_texts, item_imgUrl);
   }
}

function collectLinks($) {
   let relativeLinks = $("a");
   relativeLinks.each(function() {
      let link = $(this).attr('href');
      if (link == null) {
         return;
      }
      if (link.startsWith("//")) {
         link = orgUrl.protocol + link
         if (link in pagesVisited) {}
         else {
            if (link != baseUrl) pagesToVisit.push(orgUrl.protocol + $(this).attr('href'));
         }
      }
      if (link in pagesUrls) {
         // do nothing
      }
      else {
         if (link != baseUrl) {
            pagesUrls.push(link);
         }
      }
   });
}

function printTotalChecked() {
   console.log(pagesUrls.length);
}

function getImages($) {
   let pics = [];
   $('img').each(function() {
      let imagesrc = $(this).attr('src');
      if (imagesrc != null || imagesrc != "") pics.push(imagesrc);
   });
   return pics;
}

function saveData(value, messagetext, pictures) {
   MongoClient.connect(mongourl, function(err, db) {
      if (err) throw err;
      const dbo = db.db("Sites");
      const myobject = {
         location: value,
         textline: messagetext,
         Images: pictures,
      }
      dbo.collection("siteDetails").insertOne(myobject, function(err, res) {
         if (err) throw err;
         db.close();
      });
   });
}