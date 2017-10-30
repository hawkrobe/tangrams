/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 
                  2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    substantially modified for collective behavior experiments on the web
    MIT Licensed.
*/

/*
  The main game class. This gets created on both server and
  client. Server creates one for each game that is hosted, and each
  client creates one for itself to play the game. When you set a
  variable, remember that it's only set in that instance.
*/
var has_require = typeof require !== 'undefined';

if(typeof _ === 'undefined') {
  if(has_require) {
    _ = require('underscore');
    utils  = require('../sharedUtils/sharedUtils.js');    
  } else {
    throw new ('this experiment requires underscore, see http://underscorejs.org');
  }
}

var game_core = function(options){
  // Store a flag if we are the server instance
  this.server = options.server ;

  // How many players in the game?
  this.players_threshold = 2;
  this.playerRoleNames = {
    role1 : 'director',
    role2 : 'matcher'
  };
  
  // Dimensions of world in pixels and numberof cells to be divided into;
  this.numHorizontalCells = 6;
  this.numVerticalCells = 2;
  this.cellDimensions = {height : 300, width : 300}; // in pixels
  this.cellPadding = 50;
  this.world = {height: (this.cellDimensions.height * this.numVerticalCells
			 + this.cellPadding),
		width : (this.cellDimensions.width * this.numHorizontalCells
			 + this.cellPadding)}; 
  
  // Which round are we on (initialize at -1 so that first round is 0-indexed)
  this.roundNum = -1;

  // How many rounds do we want people to complete?
  this.numRounds = 6;

  // How many mistakes have the pair made on the current trial?
  this.attemptNum = 0;

  // This will be populated with the tangram set
  this.objects = [];
  
  if(this.server) {
    // If we're initializing the server game copy, pre-create the list of trials
    // we'll use, make a player object, and tell the player who they are
    this.id = options.id;
    this.expName = options.expName;
    this.player_count = options.player_count;
    this.trialList = this.makeTrialList();
    this.data = {
      id : this.id.slice(0,6),
      trials : [],
      catch_trials : [],
      system : {}, 
      totalScore : 0,
      subject_information : {
	gameID: this.id.slice(0,6), 
	DirectorBoards : this.nameAndBoxAll(this.trialList, 'director'),
	initialMatcherBoards : this.nameAndBoxAll(this.trialList, 'matcher')
      }
    };
    this.players = [{
      id: options.player_instances[0].id,
      instance: options.player_instances[0].player,
      player: new game_player(this,options.player_instances[0].player)
    }];
    this.streams = {};
    this.server_send_update();
  } else {
    // If we're initializing a player's local game copy, create the player object
    this.players = [{
      id: null,
      instance: null,
      player: new game_player(this)
    }];
  }
};

var game_player = function( game_instance, player_instance) {
  //Store the instance, if any (only the server copy will have one)
  this.instance = player_instance;
  // Store the game instance, so players can access it
  this.game = game_instance;
  // The player will be assigned to director or matcher
  this.role = '';
  // This will be displayed in big letters on a plain white screen
  this.message = '';
  // This will be set to the player's id, once it is known
  this.id = '';
}; 

// server side we set some classes to global types, so that
// we can use them in other files (specifically, game.server.js)
if('undefined' != typeof global) {
  var tangramList = require('./stimuli/objectSet'); // import stimuli
  module.exports = global.game_core = game_core;
  module.exports = global.game_player = game_player;
}

// HELPER FUNCTIONS

// Method to easily look up player 
game_core.prototype.get_player = function(id) {
    var result = _.find(this.players, function(e){ return e.id == id; });
    return result.player
};

// Method to get list of players that aren't the given id
game_core.prototype.get_others = function(id) {
  return _.without(_.map(_.filter(this.players, function(e){return e.id != id;}), 
       function(p){return p.player ? p : null;}), null);
};

// Returns all players
game_core.prototype.get_active_players = function() {
  return _.without(_.map(this.players, function(p){
    return p.player ? p : null;}), null);
};

// Advance to the next round
game_core.prototype.newRound = function() {
  if(this.roundNum == this.numRounds - 1) {
    // If you've reached the planned number of rounds, end the game
    _.map(this.get_active_players(), function(p){
      p.player.instance.disconnect();});
  } else {
    // Otherwise, get the preset list of tangrams for the new round
    this.roundNum += 1;
    console.log("now on round " + (this.roundNum + 1));
    this.trialInfo = {currStim: this.trialList[this.roundNum]};
    this.server_send_update();
  }
};

var cartesianProductOf = function(listOfLists) {
    return _.reduce(listOfLists, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
            });
        }), true);
    }, [ [] ]);
};

// Returns random set of unique grid locations
game_core.prototype.randomizeLocations = function() {
  var possibilities = cartesianProductOf([_.range(1, this.numHorizontalCells + 1),
            _.range(1, this.numVerticalCells + 1)]);

  // Makes sure we select locations WITHOUT replacement
  function getRandomFromBucket() {
    var randomIndex = Math.floor(Math.random()*possibilities.length);
    return possibilities.splice(randomIndex, 1)[0];
  }
  return _.map(_.range(this.numHorizontalCells * this.numVerticalCells), function(v) {
    return getRandomFromBucket();
  });

};

//returns names of tangrams from single round tangramlist
game_core.prototype.getNames = function(trialList) {
  return _.pluck(trialList, 'name');
}

//returns list of director [x,y] coords for each tangram (only for 1 round)
game_core.prototype.getGridLocs = function(trialList, role) {
  if (role == 'director') {
    var directorCoords = _.pluck(trialList, 'directorCoords');
    var gridX = _.pluck(directorCoords, 'gridX');
    var gridY = _.pluck(directorCoords, 'gridY');
    return _.zip(gridX, gridY);
}
  else {
    var matcherCoords = _.pluck(trialList, 'matcherCoords');
    var gridX = _.pluck(matcherCoords, 'gridX');
    var gridY = _.pluck(matcherCoords, 'gridY');
    return _.zip(gridX, gridY);
  }
};

// returns box location range(1,12) of tangram, given [x,y] loc pair
game_core.prototype.boxLoc = function(loc) {
  var box = 0;
  var x = loc[0];
  var y = loc[1];
  if (y == 1) { 
    box = x; 
    return box;
  }
  else {
    box = x + 6;
    return box;
  }
};

// returns list of boxes for each tangram (1 round only)
game_core.prototype.getBoxLocs = function(trialList, role) {
  var tangramGridLocs = this.getGridLocs(trialList, role);
  var self = this;
  return _.map(tangramGridLocs, function(pair) {
    return self.boxLoc(pair);
  });
};

//returns list of name and box for all tangrams (1 round only)
game_core.prototype.nameAndBox = function(trialList, role) {
    var boxLocs = this.getBoxLocs(trialList, role);
    var names = this.getNames(trialList);
    return _.zip(names, boxLocs);
};

// returns list of name and box for all tangrams in all rounds
game_core.prototype.nameAndBoxAll = function(totalTrialList, role) {
  var self = this;
  return _.map(totalTrialList, function(x) {
    return self.nameAndBox(x, role);
  });
};

// get a set of non matching director and matcher locations
game_core.prototype.notMatchingLocs = function() {
  var local_this = this;
  var directorLocs = local_this.randomizeLocations();
  var matcherLocs = local_this.randomizeLocations();
  if (this.arraysDifferent (directorLocs, matcherLocs)==true) {
    return [directorLocs, matcherLocs];
  }
  return this.notMatchingLocs();
};


//helper function to check if two arrays are completely different from each other
game_core.prototype.arraysDifferent = function(arr1, arr2) {
  for(var i = arr1.length; i--;) {
      if(_.isEqual(arr1[i], arr2[i])) {
          return false;
    };
  }
  return true;
};

game_core.prototype.direcBoxes = function(directorLocs) {
 var self = this;
_.map(directorLocs, function(x) {
  return this.boxLoc;
  })
};

// Randomly sets tangram locations for each round
game_core.prototype.makeTrialList = function () {
  var local_this = this;
  var trialList =_.map(_.range(this.numRounds), function(i) { //creating a list?
    var locs = local_this.notMatchingLocs();
    var matcherLocs = locs[0];
    var directorLocs = locs[1];
    var directorBoxes = _.map(directorLocs, function(x) {
      return local_this.boxLoc(x);
    });
    var matcherBoxes = _.map(matcherLocs, function(x) {
      return local_this.boxLoc(x);
    });

    // debugger;
    var localTangramList = _.map(tangramList, _.clone);
    return _.map(_.zip(localTangramList, directorLocs, matcherLocs, directorBoxes, matcherBoxes), function(pair) {
      var tangram = pair[0]   // [[tangramA,[4,1]*director, [3,2]*matcher], [tangramB, [3,2]...]]
      var directorGridCell = local_this.getPixelFromCell(pair[1][0], pair[1][1]); 
      var matcherGridCell = local_this.getPixelFromCell(pair[2][0], pair[2][1]);
      tangram.directorCoords = {
        gridX : pair[1][0],
        gridY : pair[1][1],
        trueX : directorGridCell.centerX - tangram.width/2,
        trueY : directorGridCell.centerY - tangram.height/2,
        box : pair[3]
      };
      tangram.matcherCoords = {
        gridX : pair[2][0],
        gridY : pair[2][1],
        trueX : matcherGridCell.centerX - tangram.width/2,
        trueY : matcherGridCell.centerY - tangram.height/2,
        box :pair[4]
      };
      return tangram;
    });
  });
  return(trialList);
};

//scores the number of incorrect tangram matches between matcher and director
//returns the correct score out of total tangrams
game_core.prototype.game_score = function(game_objects) {
  var correct = 0;
  var incorrect = 0;
  for(var i = game_objects.length; i--; i>=0) {
    if(game_objects[i].matcherCoords.gridX == game_objects[i].directorCoords.gridX) {
      if(game_objects[i].matcherCoords.gridY == game_objects[i].directorCoords.gridY) {
        correct = correct + 1;
      }
    }
    incorrect = incorrect + 1;
  }
  return correct;
}

// maps a grid location to the exact pixel coordinates
// for x = 1,2,3,4; y = 1,2,3,4
game_core.prototype.getPixelFromCell = function (x, y) {
  return {
    centerX: (this.cellPadding/2 + this.cellDimensions.width * (x - 1)
        + this.cellDimensions.width / 2),
    centerY: (this.cellPadding/2 + this.cellDimensions.height * (y - 1)
        + this.cellDimensions.height / 2),
    upperLeftX : (this.cellDimensions.width * (x - 1) + this.cellPadding/2),
    upperLeftY : (this.cellDimensions.height * (y - 1) + this.cellPadding/2),
    width: this.cellDimensions.width,
    height: this.cellDimensions.height
  };
};

// maps a raw pixel coordinate to to the exact pixel coordinates
// for x = 1,2,3,4; y = 1,2,3,4
game_core.prototype.getCellFromPixel = function (mx, my) {
  var cellX = Math.floor((mx - this.cellPadding / 2) / this.cellDimensions.width) + 1;
  var cellY = Math.floor((my - this.cellPadding / 2) / this.cellDimensions.height) + 1;
  return [cellX, cellY];
};

game_core.prototype.getTangramFromCell = function (gridX, gridY) {
    for (i=0; i < this.objects.length; i++) {
      if (this.objects[i].gridX == gridX && this.objects[i].gridY == gridY) {
        var tangram = this.objects[i];
        var tangramIndex = i;
        // return tangram;
        return i;
        }
    }
    console.log("Did not find tangram from cell!")
  }

// readjusts trueX and trueY values based on the objLocation and width and height of image (objImage)
game_core.prototype.getTrueCoords = function (coord, objLocation, objImage) {
  var trueX = this.getPixelFromCell(objLocation.gridX, objLocation.gridY).centerX - objImage.width/2;
  var trueY = this.getPixelFromCell(objLocation.gridX, objLocation.gridY).centerY - objImage.height/2;
  if (coord == "xCoord") {
    return trueX;
  }
  if (coord == "yCoord") {
    return trueY;
  }
}

game_core.prototype.server_send_update = function(){
  //Make a snapshot of the current state, for updating the clients
  var local_game = this;
  
  // Add info about all players
  var player_packet = _.map(local_game.players, function(p){
    return {id: p.id,
            player: null};
  });

  var state = {
    gs : this.game_started,   // true when game's started
    pt : this.players_threshold,
    pc : this.player_count,
    dataObj  : this.data,
    roundNum : this.roundNum,
    trialInfo: this.trialInfo
  };

  _.extend(state, {players: player_packet});
  _.extend(state, {instructions: this.instructions});

  //Send the snapshot to the players
  this.state = state;
  _.map(local_game.get_active_players(), function(p){
    p.player.instance.emit( 'onserverupdate', state);});
};

// (4.22208334636).fixed(n) will return fixed point value to n places, default n = 3
// Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };

