/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
 */

var 
  fs          = require('fs'),
  utils       = require('../sharedUtils/sharedUtils.js');

// The server parses and acts on messages sent from 'clients'
var onMessage = function(client,message) {
  //Cut the message up into sub components
  var message_parts = message.split('.');
  
  //The first is always the type of message
  var message_type = message_parts[0];
  
  //Extract important variables
  var gc = client.game;
  var id = gc.id.slice(0,6);
  var all = gc.get_active_players();
  var target = gc.get_player(client.userid);
  var others = gc.get_others(client.userid);


  switch(message_type) {
    
  case 'dropObj' :
    // parse the message
    var objIndex = message_parts[1];
    var swapIndex = message_parts[2];
    var objTrueX = message_parts[3];
    var objTrueY = message_parts[4];
    var swapObjTrueX = message_parts[5];
    var swapObjTrueY = message_parts[6];
    var objBox = message_parts[7];
    var swapObjBox = message_parts[8];


    // Update the local copy to match the new positions of these items!
    gc.trialInfo.currStim[objIndex].matcherCoords.trueX = objTrueX;
    gc.trialInfo.currStim[objIndex].matcherCoords.trueY = objTrueY;
    gc.trialInfo.currStim[objIndex].matcherCoords.box = objBox;
    gc.trialInfo.currStim[swapIndex].matcherCoords.trueX = swapObjTrueY;
    gc.trialInfo.currStim[swapIndex].matcherCoords.trueY = swapObjTrueY;
    gc.trialInfo.currStim[swapIndex].matcherCoords.box = swapObjBox;

    //get the gridX and gridY values
    var objCell = gc.getCellFromPixel(objTrueX, objTrueY);
    var swapObjCell = gc.getCellFromPixel(swapObjTrueX, swapObjTrueY);

    //Update local copy with correct gridX and gridY values
    gc.trialInfo.currStim[objIndex].matcherCoords.gridX = objCell[0];
    gc.trialInfo.currStim[objIndex].matcherCoords.gridY = objCell[1];
    gc.trialInfo.currStim[swapIndex].matcherCoords.gridX = swapObjCell[0];
    gc.trialInfo.currStim[swapIndex].matcherCoords.gridY = swapObjCell[1];  

    writeData(client, "dropObj", message_parts);
    break;
  
  case 'advanceRound' :
    var score = gc.game_score(gc.trialInfo.currStim);
    gc.data.totalScore += score;

    var boxLocations = message_parts[1];
    writeData(client, "finalBoard", message_parts);
    _.map(all, function(p){
      p.player.instance.emit( 'newRoundUpdate', {user: client.userid, score: score});});
    gc.newRound();
    break;
  
  case 'playerTyping' :
    _.map(others, function(p) {
      p.player.instance.emit( 'playerTyping',
			      {typing: message_parts[1]});
    });
    break;
  
  case 'chatMessage' :
    if(client.game.player_count == 2 && !gc.paused) {
      writeData(client, "message", message_parts);
    }
    // Update others
    var msg = message_parts[1].replace(/~~~/g,'.');
    _.map(all, function(p){
      p.player.instance.emit( 'chatMessage', {user: client.userid, msg: msg});});
    break;

  case 'h' : // Receive message when browser focus shifts
    target.visible = message_parts[1];
    break;
  }
};

var writeData = function(client, type, message_parts) {
  var gc = client.game;
  var roundNum = gc.state.roundNum + 1;
  var id = gc.id.slice(0,6);
  var score = gc.game_score(gc.trialInfo.currStim);  
  var line;
  switch(type) {
    case "dropObj" :
      var dropObjBox = message_parts[7];
      var dropObjName = message_parts[9];
      line = (id + ',' + Date.now() + ',' + roundNum + ',' + score + ',' +
	      dropObjName + ',' + dropObjBox + '\n');
      break;

    case "message" :
      var msg = message_parts[1].replace('~~~','.');
      line = (id + ',' + Date.now() + ',' + roundNum + ',' +
	      client.role + ',"' + msg + '"\n');
      break;

    case "finalBoard" :
      var submittedBoard = message_parts[1];
      var trueBoard = gc.getBoxLocs(gc.trialInfo.currStim, "director");
      line = (id + ',' + Date.now() + ',' + roundNum + ',' +
	      submittedBoard + ',' + trueBoard + ',' + score + '\n');
      break;
  }
  console.log(type + ":" + line);
  gc.streams[type].write(line, function (err) {if(err) throw err;});
};

var startGame = function(game, player) {
  console.log("starting game" + game.id);
  // Establish write streams
  var startTime = utils.getLongFormTime();
  var dataFileName = startTime + "_" + game.id;
  utils.establishStream(game, "message", dataFileName,
		       "gameid,time,roundNum,sender,contents\n");
  utils.establishStream(game, "dropObj", dataFileName,
		       "gameid,time,roundNum,score,name,draggedTo\n");
  utils.establishStream(game, "finalBoard", dataFileName,
		       "gameid,time,roundNum,subA,subB,subC,subD,subE,subF,subG," +
                       "subH,subI,subJ,subK,subL,trueA,trueB,trueC,trueD,trueE," + 
                       "trueF,trueG,trueH,trueI,trueJ,trueK,trueL,score\n");
  game.newRound();
  game.server_send_update();
};

module.exports = {
  writeData : writeData,
  startGame : startGame,
  onMessage : onMessage
};
