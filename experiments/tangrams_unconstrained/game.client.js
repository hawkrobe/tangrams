

//   Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 
//                   2013 Robert XD Hawkins
    
//     written by : http://underscorediscovery.com
//     written for : http://buildnewgames.com/real-time-multiplayer/
    
//     modified for collective behavior experiments on Amazon Mechanical Turk

//     MIT Licensed.


// /* 
//    THE FOLLOWING FUNCTIONS MAY NEED TO BE CHANGED
// */

// A window global for our game root variable.
var globalGame = {};
// Keeps track of whether player is paying attention...
var incorrect;
var dragging;
var waiting;

var client_onserverupdate_received = function(data){  

  // Update client versions of variables with data received from
  // server_send_update function in game.core.js
  //data refers to server information
  if(data.players) {
    _.map(_.zip(data.players, globalGame.players),function(z){
      z[1].id = z[0].id;  
    });
  }
  
  //get names of objects sent from server and current objects 
  var dataNames = _.map(data.objects, function(e)
			{ return e.name;});
  var localNames = _.map(globalGame.objects,function(e)
			 {return e.name;});

  // If your objects are out-of-date (i.e. if there's a new round), set up
  // machinery to draw them
  if (globalGame.roundNum != data.roundNum) {
    globalGame.objects = _.map(data.trialInfo.currStim, function(obj) {
      // Extract the coordinates matching your role
      var customCoords = globalGame.my_role == "director" ? obj.directorCoords : obj.matcherCoords;
      // remove the directorCoords and matcherCoords properties
      var customObj = _.chain(obj)
	    .omit('directorCoords', 'matcherCoords')
	    .extend(obj, {trueX : customCoords.trueX, trueY : customCoords.trueY,
			  gridX : customCoords.gridX, gridY : customCoords.gridY,
			  box : customCoords.box})
	    .value();
      var imgObj = new Image(); //initialize object as an image (from HTML5)
      imgObj.src = customObj.url; // tell client where to find it
      imgObj.onload = function(){ // Draw image as soon as it loads (this is a callback)
        globalGame.ctx.drawImage(imgObj, parseInt(customObj.trueX), parseInt(customObj.trueY),
			   customObj.width, customObj.height);
	
      };
      return _.extend(customObj, {img: imgObj});
    });
  };
  console.log(globalGame.objects);
  
  // Get rid of "waiting" screen if there are multiple players
  if(data.players.length > 1) {
    globalGame.get_player(globalGame.my_id).message = "";
  }
  globalGame.game_started = data.gs;
  globalGame.players_threshold = data.pt;
  globalGame.player_count = data.pc;
  globalGame.roundNum = data.roundNum;
  globalGame.data = data.dataObj;
  
  // Draw all this new stuff
  drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
}; 

var client_onMessage = function(data) {
  console.log(data);
  var commands = data.split('.');
  var command = commands[0];
  var subcommand = commands[1] || null;
  var commanddata = commands[2] || null;

  switch(command) {
  case 's': //server message
    switch(subcommand) {    
      
    case 'end' :
      ondisconnect(); break;

    case 'alert' : // Not in database, so you can't play...
      alert('You did not enter an ID'); 
      window.location.replace('http://nodejs.org'); break;

    case 'join' : //join a game requested
      var num_players = commanddata;
      client_onjoingame(num_players, commands[3]); break;

    case 'add_player' : // New player joined... Need to add them to our list.
      console.log("adding player" + commanddata);
      if(hidden === 'hidden') {
        flashTitle("GO!");
      }
      globalGame.players.push({id: commanddata,
			       player: new game_player(globalGame)}); break;

    }
  } 
}; 

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
};

// Associates callback functions corresponding to different socket messages
var customSetup = function(game) {
  // Tell server when matncher presses the submit round button in order to advance to the next round
  $(document).ready(function() {
    $("#submitbutton").click(function(){
      var matcherBoxLocations = game.getBoxLocs(globalGame.objects, 'matcher');
      globalGame.socket.send('advanceRound.' + matcherBoxLocations);
    });
  });
  
  // Set up new round on client's browsers after submit round button is pressed. 
  // This means clear the chatboxes, update round number, and update score on screen
  game.socket.on('newRoundUpdate', function(data){
    $('#messages').empty();
    if(game.roundNum+2 > game.numRounds) {
      $('#roundnumber').empty();
      $('#instructs').empty().append("Round " + (game.roundNum + 1) + 
				     " score: " + data.score + " correct!");
    } else {
      $('#roundnumber').empty().append("Round ", game.roundNum + 2);
    }
    $('#score').empty().append("Round " + (game.roundNum + 1) + 
			       " score: " + data.score + " correct!");
    globalGame.data.totalScore += data.score;
    var player = game.get_player(globalGame.my_id);
    player.currentHighlightX = null;
    player.currentHighlightY = null;
  });

}; 

var client_onjoingame = function(num_players, role) {
  // Need client to know how many players there are, so they can set up the appropriate data structure
  _.map(_.range(num_players - 1), function(i){
    globalGame.players.unshift({id: null, player: new game_player(globalGame)})});

  // Update w/ role (can only move stuff if agent)
  $('#roleLabel').append(role + '.');
  if(role === "director") {
    $('#instructs').append("Send messages to help the matcher move their images to match yours. Please do not refresh page!");
    $("#submitbutton").remove();
  } else {
    $('#instructs').append("Move your images to match the director's board. Please do not refresh page!");
    $("#submitbutton").show();
  }

  // Only give Submit board button to agent (matcher)
  if(role === "director") {
    $('#submitbutton').remove();
  }

  // set role locally
  globalGame.my_role = role;
  globalGame.get_player(globalGame.my_id).role = globalGame.my_role;

  if(num_players == 1) {
    globalGame.get_player(globalGame.my_id).message = 'Waiting for other player to connect...';
  }
  
  if(role === "matcher") {
    globalGame.viewport.addEventListener("mousedown", mouseDownListener, false);
  }
};    

/*
 MOUSE EVENT LISTENERS
 */

function mouseDownListener(evt) {
  var i;
  //We are going to pay attention to the layering order of the objects so that if a mouse down occurs over more than object,
  //only the topmost one will be dragged.
  var highestIndex = -1;

  //getting mouse position correctly, being mindful of resizing that may have occured in the browser:
  var bRect = globalGame.viewport.getBoundingClientRect();
  mouseX = (evt.clientX - bRect.left)*(globalGame.viewport.width/bRect.width);
  mouseY = (evt.clientY - bRect.top)*(globalGame.viewport.height/bRect.height);
  
  //find which shape was clicked
  for (i=0; i < globalGame.objects.length; i++) {
    if (hitTest(globalGame.objects[i], mouseX, mouseY)) {
      dragging = true;
      if (i > highestIndex) {
        //We will pay attention to the point on the object where the mouse is "holding" the object:
        dragHoldX = mouseX - globalGame.objects[i].trueX;
        dragHoldY = mouseY - globalGame.objects[i].trueY;
        highestIndex = i;
        globalGame.dragIndex = i;
      }
    }
  }
  if (dragging) {
    window.addEventListener("mousemove", mouseMoveListener, false);
  }

  globalGame.viewport.removeEventListener("mousedown", mouseDownListener, false);
  window.addEventListener("mouseup", mouseUpListener, false);

  //code below prevents the mouse down from having an effect on the main browser window:
  if (evt.preventDefault) {
    evt.preventDefault();
  } //standard
  else if (evt.returnValue) {
    evt.returnValue = false;
  } //older IE
  return false;
}

function mouseUpListener(evt) {    
  globalGame.viewport.addEventListener("mousedown", mouseDownListener, false);
  window.removeEventListener("mouseup", mouseUpListener, false);
  if (dragging) {
    // Set up the right variables
    var bRect = globalGame.viewport.getBoundingClientRect();
    var dropX = (evt.clientX - bRect.left)*(globalGame.viewport.width/bRect.width);
    var dropY = (evt.clientY - bRect.top)*(globalGame.viewport.height/bRect.height);
    var obj = globalGame.objects[globalGame.dragIndex];

    //find cell that the dragged tangram is moving to
    var cell = globalGame.getCellFromPixel(dropX, dropY);
    
    //find the tangram in the cell (the swapObj)
    var swapIndex = globalGame.getTangramFromCell(cell[0], cell[1]);
    var swapObj =  globalGame.objects[swapIndex];

    mouseX = (evt.clientX - bRect.left)*(globalGame.viewport.width/bRect.width);
    mouseY = (evt.clientY - bRect.top)*(globalGame.viewport.height/bRect.height);
    if (mouseX > 1825 || mouseX < 25 || mouseY > 625 || mouseY < 25) {
      console.log("out of bounds");

      obj.trueX = globalGame.getTrueCoords("xCoord", obj, obj);
      obj.trueY = globalGame.getTrueCoords("yCoord", obj, obj);
    }
    
    else {
      // move tangram in dropped cell (swapObj) to original cell of dragged tangram (obj)
      swapObj.gridX = obj.gridX;
      swapObj.gridY = obj.gridY;
      swapObj.trueX = globalGame.getTrueCoords("xCoord", obj, swapObj);
      swapObj.trueY = globalGame.getTrueCoords("yCoord", obj, swapObj);
      
      //update box location
      swapObj.box = obj.box;
      
      //fix location properties for the swapped object
      globalGame.objects[swapIndex].matcherCoords.gridX = swapObj.gridX;
      globalGame.objects[swapIndex].matcherCoords.gridY = swapObj.gridY;
      globalGame.objects[swapIndex].matcherCoords.trueX = swapObj.gridX;
      globalGame.objects[swapIndex].matcherCoords.trueY = swapObj.gridY;
      
      //update box location
      globalGame.objects[swapIndex].matcherCoords.box = swapObj.box;
      
      // center dragged tangram (obj) in its new cell
      obj.gridX = cell[0];
      obj.gridY = cell[1];
      obj.trueX = globalGame.getPixelFromCell(cell[0], cell[1]).centerX - obj.width/2;
      obj.trueY = globalGame.getPixelFromCell(cell[0], cell[1]).centerY - obj.height/2;
      
      //update box
      obj.box = globalGame.boxLoc(cell);

      //fix location properties for the dropped object
      globalGame.objects[globalGame.dragIndex].matcherCoords.gridX = obj.gridX;
      globalGame.objects[globalGame.dragIndex].matcherCoords.gridY = obj.gridY;
      globalGame.objects[globalGame.dragIndex].matcherCoords.trueX = obj.trueX;
      globalGame.objects[globalGame.dragIndex].matcherCoords.trueY = obj.trueY; 
      globalGame.objects[globalGame.dragIndex].matcherCoords.box = obj.box;

      var tangramNames = globalGame.getNames(globalGame.objects);
      var boxLocations = globalGame.getBoxLocs(globalGame.objects, 'matcher');

      //send information so that server can update their copy of the tangram board
      globalGame.socket.send("dropObj."
		       + globalGame.dragIndex + "." + swapIndex + "."
		       + Math.round(obj.trueX) + "." + Math.round(obj.trueY) + "."
		       + Math.round(swapObj.trueX) + "." + Math.round(swapObj.trueY) + "."
		       + obj.box + "." + swapObj.box + "." + obj.name);
    }

    // Tell server where you dropped it
    drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
    dragging = false;
    window.removeEventListener("mousemove", mouseMoveListener, false);
  }
}

function mouseMoveListener(evt) {
  // prevent from dragging offscreen
  var minX = 25;
  var maxX = globalGame.viewport.width - globalGame.objects[globalGame.dragIndex].width - 25;
  var minY = 25;
  var maxY = globalGame.viewport.height - globalGame.objects[globalGame.dragIndex].height - 25;

  //getting mouse position correctly 
  var bRect = globalGame.viewport.getBoundingClientRect();
  mouseX = (evt.clientX - bRect.left)*(globalGame.viewport.width/bRect.width);
  mouseY = (evt.clientY - bRect.top)*(globalGame.viewport.height/bRect.height);

  //highlighting cell that is moused over
  var cell = globalGame.getCellFromPixel(mouseX, mouseY);
  var player = globalGame.get_player(globalGame.my_id)
  player.currentHighlightX = globalGame.getPixelFromCell(cell[0], cell[1]).upperLeftX;
  player.currentHighlightY = globalGame.getPixelFromCell(cell[0], cell[1]).upperLeftY;

  //clamp x and y positions to prevent object from dragging outside of canvas
  var posX = mouseX - dragHoldX;
  posX = (posX < minX) ? minX : ((posX > maxX) ? maxX : posX);
  var posY = mouseY - dragHoldY;
  posY = (posY < minY) ? minY : ((posY > maxY) ? maxY : posY);

  // Update object locally
  var obj = globalGame.objects[globalGame.dragIndex]
  obj.trueX = Math.round(posX);
  obj.trueY = Math.round(posY);

  // Draw it
  drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
}

function hitTest(shape,mx,my) {
  var dx = mx - shape.trueX;
  var dy = my - shape.trueY;
  return (0 < dx) && (dx < shape.width) && (0 < dy) && (dy < shape.height);
}
