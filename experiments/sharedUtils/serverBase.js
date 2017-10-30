var utils = require('./sharedUtils.js');

global.window = global.document = global;

// Construct server object
module.exports = function(expName) {
  var gameServer = {
    games : {},
    game_count:0
  };

  // Incorporate task-specific functions
  var serverLocal = require('../' + expName + '/game.server.js');
  gameServer.onMessage = serverLocal.onMessage;
  gameServer.writeData = serverLocal.writeData;
  gameServer.startGame = serverLocal.startGame;
  gameServer.setCustomEvents = serverLocal.setCustomEvents;
  
  // Incorprate task-specific core
  var core = require('../' + expName + '/game.core.js');

  // This is the important function that pairs people up into 'rooms'
  // all independent of one another.
  gameServer.findGame = function(player) {
    this.log('looking for a game. We have : ' + this.game_count);
    var joined_a_game = false;
    for (var gameid in this.games) {
      var game = this.games[gameid];
      if(game.player_count < game.players_threshold) {
	// End search
	joined_a_game = true;

	// Add player to game
	game.player_count++;
	game.players.push({id: player.userid,
			   instance: player,
			   player: new game_player(game, player)});

	// Add game to player
	player.game = game;
	player.role = game.playerRoleNames.role2;
	player.send('s.join.' + game.players.length + '.' + player.role);

	// notify existing players that someone new is joining
	_.map(game.get_others(player.userid), function(p){
	  p.player.instance.send( 's.add_player.' + player.userid);
	});
	
	// Start game
	this.startGame(game);
      }
    }

    // If you couldn't find a game to join, create a new one
    if(!joined_a_game) {
      this.createGame(player);
    }
  };

  // Will run when first player connects
  gameServer.createGame = function(player) {
    //Create a new game instance
    var options = {
      expName: expName,
      server: true,
      id : utils.UUID(),
      player_instances: [{id: player.userid, player: player}],
      player_count: 1
    };
    
    var game = new game_core(options);
    
    // assign role
    player.game = game;
    player.role = game.playerRoleNames.role1;
    player.send('s.join.' + game.players.length + '.' + player.role);
    this.log('player ' + player.userid + ' created a game with id ' + player.game.id);

    // add to game collection
    this.games[game.id] = game;
    this.game_count++;
    
    game.server_send_update();
    return game;
  }; 

  // we are requesting to kill a game in progress.
  // This gets called if someone disconnects
  gameServer.endGame = function(gameid, userid) {
    var thegame = this.games[gameid];
    if(thegame) {
      _.map(thegame.get_others(userid),function(p) {
	p.player.instance.send('s.end');
      });
      delete this.games[gameid];
      this.game_count--;
      this.log('game removed. there are now ' + this.game_count + ' games' );
    } else {
      this.log('that game was not found!');
    }   
  }; 
  
  //A simple wrapper for logging so we can toggle it,
  //and augment it for clarity.
  gameServer.log = function() {
    console.log.apply(this,arguments);
  };

  return gameServer;
};

