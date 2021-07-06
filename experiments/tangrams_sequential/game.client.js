

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
  var dataNames = _.map(data.trialInfo.currStim, function(e)
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
  
  // Get rid of "waiting" screen if there are multiple players
  if(data.players.length > 1) {
    globalGame.get_player(globalGame.my_id).message = "";
  }
  globalGame.game_started = data.gs;
  globalGame.players_threshold = data.pt;
  globalGame.player_count = data.pc;
  globalGame.roundNum = data.roundNum;
  // update data object on first round, don't overwrite (FIXME)  
  if(!_.has(globalGame, 'data')) {
    globalGame.data = data.dataObj;
  }

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

    case 'feedback' :
      // Prevent them from sending messages b/w trials
      $('#chatbox').attr("disabled", "disabled");
      var clickedObjName = commanddata;

      // update local score
      var target = _.filter(globalGame.objects,
			    function(x){return x.targetStatus == 'target';})[0];
      var scoreDiff = target.name == clickedObjName ? 1 : 0;
      globalGame.data.subject_information.score += scoreDiff;
      // draw feedback
      if (globalGame.my_role === globalGame.playerRoleNames.role1) {
	highlightCell(globalGame, globalGame.get_player(globalGame.my_id), 'green',
		      function(x) {return x.name == clickedObjName;});
      } else {
	highlightCell(globalGame, globalGame.get_player(globalGame.my_id), 'green',
		      function(x) {return x.targetStatus == 'target';});
      }
      break;

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
  // Set up new round on client's browsers after submit round button is pressed. 
  // This means clear the chatboxes, update round number, and update score on screen
  game.socket.on('newRoundUpdate', function(data){
    var score = game.data.subject_information.score;
    $('#chatbox').removeAttr("disabled");
    $('#chatbox').focus();
    $('#messages').empty();
    if(game.roundNum+2 > game.numRounds) {
      $('#roundnumber').empty();
      $('#instructs').empty().append("Number correct: " + score);
    } else {
      $('#roundnumber').empty().append("Round ", game.roundNum + 2,
				       " of ", game.numRounds);
    }
    $('#score').empty().append("Number correct: " + score);
  });

}; 

var client_onjoingame = function(num_players, role) {
  // Need client to know how many players there are, so they can set up the appropriate data structure
  _.map(_.range(num_players - 1), function(i){
    globalGame.players.unshift({id: null, player: new game_player(globalGame)})});

  // Update w/ role (can only move stuff if agent)
  $('#roleLabel').append(role + '.');
  if(role === "director") {
    $('#instructs').append("Send messages to help the matcher pick the target image. You are free to use the chatbox to talk to the director at any time.");
  } else {
    $('#instructs').append("Select the correct target out of the lineup. You are free to use the chatbox to talk to the director at any time.");
  }

  // set role locally
  globalGame.my_role = role;
  globalGame.get_player(globalGame.my_id).role = globalGame.my_role;

  if(num_players == 1) {
    globalGame.get_player(globalGame.my_id).message = 'Waiting for other player to connect...';
  }
  
  if(role === "matcher") {
    globalGame.viewport.addEventListener("click", mouseClickListener, false);
  }
};    

/*
 MOUSE EVENT LISTENERS
 */

function mouseClickListener(evt) {
  evt.preventDefault();
  
  //getting mouse position correctly, being mindful of resizing 
  var bRect = globalGame.viewport.getBoundingClientRect();
  var mouseX = (evt.clientX - bRect.left)*(globalGame.viewport.width/bRect.width);
  var mouseY = (evt.clientY - bRect.top)*(globalGame.viewport.height/bRect.height);

  if (globalGame.messageSent) {
    //find which shape was clicked
    _.forEach(globalGame.objects, function(obj) {
      if (hitTest(obj, mouseX, mouseY)) {
	globalGame.messageSent = false;
	highlightCell(globalGame, globalGame.get_player(globalGame.my_id), 'black',
		      function(x){return x.name == obj.name;});
	var packet = ["clickedObj", obj.name, obj.box,
		      Math.round(obj.trueX), Math.round(obj.trueY)];
	globalGame.socket.send(packet.join('.'));
      }
    });
  }
  return false;
}

function hitTest(shape,mx,my) {
  var dx = mx - shape.trueX;
  var dy = my - shape.trueY;
  return (0 < dx) && (dx < shape.width) && (0 < dy) && (dy < shape.height);
}
