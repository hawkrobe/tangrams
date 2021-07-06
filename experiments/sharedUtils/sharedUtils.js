var _ = require('underscore');
var fs = require('fs');

var UUID = function() {
  var baseName = (Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10));
  var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  var id = baseName + '-' + template.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
  return id;
};

var getLongFormTime = function() {
  var d = new Date();
  var fullTime = (d.getFullYear() + '-' + d.getMonth() + 1 + '-' +
        d.getDate() + '-' + d.getHours() + '-' + d.getMinutes() + '-' +
        d.getSeconds() + '-' + d.getMilliseconds());
  return fullTime;
};

var establishStream = function(game, streamName, outputFileName, header) {
  var streamLoc = "../data/" + game.expName + "/" + streamName + "/" + outputFileName;
  fs.writeFile(streamLoc, header, function (err) {if(err) throw err;});
  var stream = fs.createWriteStream(streamLoc, {'flags' : 'a'});
  game.streams[streamName] = stream;
};


function fillArray(value, len) {
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
}

// --- below added by jefan March 2017
// extracts all the values of the javascript dictionary by key
var vec = function extractEntries(dict,key) {
    vec = []
    for (i=0; i<dict.length; i++) {
        vec.push(dict[i][key]);    
    } 
    return vec;
}

// finds matches to specific value given key
var vec = function matchingValue(dict,key,value) {
  vec = []
  for (i=0; i<dict.length; i++) {
    if (dict[i][key]==value) {      
        vec.push(dict[i]);    
    }
  } 
  return vec;
}

// add entry to dictionary object
var dict = function addEntry(dict,key,value) {
  for (i=0; i<dict.length; i++) {
      dict[i][key] = value;   
  } 
  return dict;  
}

// make integer series from lb (lower) to ub (upper)
var series = function makeSeries(lb,ub) {
    series = new Array();
    if (ub<=lb) {
      throw new Error("Upper bound should be greater than lower bound!");
    }
   for (var i = lb; i<(ub+1); i++) {
      series = series.concat(i);
   }
   return series;
}

// --- above added by jefan March 2017

module.exports = {
  UUID : UUID,
  getLongFormTime : getLongFormTime,
  establishStream: establishStream,
  fillArray: fillArray,
};
