var visible;

var getURLParams = function() {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = location.search.substring(1);

  var urlParams = {};
  while ((match = search.exec(query))) {
    urlParams[decode(match[1])] = decode(match[2]);
  }
  return urlParams;
};

var ondisconnect = function(data) {
  // Redirect to exit survey
  console.log("server booted");
  this.viewport.style.display="none";
  $('#message_panel').hide();
  $('#submitbutton').hide();
  $('#roleLabel').hide();
  $('#score').hide();
  $('#exit_survey').show();
};

var onconnect = function(data) {
  //The server responded that we are now in a game. Remember who we are
  this.my_id = data.id;
  this.players[0].id = this.my_id;
  this.urlParams = getURLParams();
  // console.log(this.urlParams);
  // console.log(this.my_id,this.players[0].id);
  console.log(this);
  // console.log(this.get_player(this.my_id));
  drawScreen(this, this.get_player(this.my_id));
};

// Associates callback functions corresponding to different socket messages
var sharedSetup = function(game) {
  //Store a local reference to our connection to the server
  game.socket = io.connect();

  // Tell other player if someone is typing...
  $('#chatbox').on('input', function() {
    console.log("inputting...");
    if($('#chatbox').val() != "" && !globalGame.sentTyping) {
      game.socket.send('playerTyping.true');
      globalGame.typingStartTime = Date.now();
      globalGame.sentTyping = true;
    } else if($("#chatbox").val() == "") {
      game.socket.send('playerTyping.false');
      globalGame.sentTyping = false;
      console.log("globalGame is being used here!");
    }
  });
  
  // Tell server when client types something in the chatbox
  $('form').submit(function(){
    var origMsg = $('#chatbox').val();
    var timeElapsed = Date.now() - globalGame.typingStartTime;
    var msg = ['chatMessage', origMsg.replace(/\./g, '~~~'), timeElapsed].join('.');
    if($('#chatbox').val() != '') {
      game.socket.send(msg);
      globalGame.sentTyping = false;
      $('#chatbox').val('');
    }
    return false;   
  });

  game.socket.on('playerTyping', function(data){
    if(data.typing == "true") {
      $('#messages')
	.append('<span class="typing-msg">Other player is typing...</span>')
	.stop(true,true)
	.animate({
	  scrollTop: $("#messages").prop("scrollHeight")
	}, 800);
    } else {
      $('.typing-msg').remove();
    }
  });
  
  // Update messages log when other players send chat
  game.socket.on('chatMessage', function(data){
    // Just in case we want to bar responses until after some message received
    globalGame.messageSent = true;
    var otherRole = (globalGame.my_role === game.playerRoleNames.role1 ?
		     game.playerRoleNames.role2 : game.playerRoleNames.role1);
    var source = data.user === globalGame.my_id ? "You" : otherRole;
    var col = source === "You" ? "#363636" : "#707070";
    $('.typing-msg').remove();
    $('#messages')
      .append($('<li style="padding: 5px 10px; background: ' + col + '">')
    	      .text(source + ": " + data.msg))
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);
  });

  //so that we can measure the duration of the game
  game.startTime = Date.now();
  
  //When we connect, we are not 'connected' until we have an id
  //and are placed in a game by the server. The server sends us a message for that.
  game.socket.on('connect', function(){}.bind(game));
  //Sent when we are disconnected (network, server down, etc)
  game.socket.on('disconnect', ondisconnect.bind(game));
  //Sent each tick of the server simulation. This is our authoritive update
  game.socket.on('onserverupdate', client_onserverupdate_received.bind(game));
  //Handle when we connect to the server, showing state and storing id's.
  game.socket.on('onconnected', onconnect.bind(game));
  //On message from the server, we parse the commands and send it to the handlers
  game.socket.on('message', client_onMessage.bind(game));
};

// When loading the page, we store references to our
// drawing canvases, and initiate a game instance.
window.onload = function(){
  //Create our game client instance.
  globalGame = new game_core({server: false});
  
  //Connect to the socket.io server!
  sharedSetup(globalGame);
  customSetup(globalGame);
  globalGame.submitted = false;
    
  //Fetch the viewport
  globalGame.viewport = document.getElementById('viewport');

  //Adjust its size
  globalGame.viewport.width = globalGame.world.width;
  globalGame.viewport.height = globalGame.world.height;

  //Fetch the rendering contexts
  globalGame.ctx = globalGame.viewport.getContext('2d');

  //Set the draw style for the font
  globalGame.ctx.font = '11px "Helvetica"';

  document.getElementById('chatbox').focus();

};

// This gets called when someone selects something in the menu during the exit survey...
// collects data from drop-down menus and submits using mmturkey
function dropdownTip(data){
  console.log(globalGame);
  var commands = data.split('::');
  switch(commands[0]) {
  case 'human' :
    $('#humanResult').show();
    globalGame.data.subject_information = _.extend(globalGame.data.subject_information, 
					     {'thinksHuman' : commands[1]}); break;
  case 'language' :
    globalGame.data.subject_information = _.extend(globalGame.data.subject_information, 
					     {'nativeEnglish' : commands[1]}); break;
  case 'partner' :
    globalGame.data.subject_information = _.extend(globalGame.data.subject_information,
						   {'ratePartner' : commands[1]}); break;
  case 'confused' :
    globalGame.data.subject_information = _.extend(globalGame.data.subject_information,
						   {'confused' : commands[1]}); break;
  case 'submit' :
    globalGame.data.subject_information = _.extend(globalGame.data.subject_information, 
				   {'comments' : $('#comments').val(), 
				    'role' : globalGame.my_role,
				    'totalLength' : Date.now() - globalGame.startTime});
    globalGame.submitted = true;
    console.log("data is...");
    console.log(globalGame.data);
    if(_.size(globalGame.urlParams) == 4) {
      window.opener.turk.submit(globalGame.data, true);
      window.close(); 
    } else {
      console.log("would have submitted the following :")
      console.log(globalGame.data);
//      var URL = 'http://web.stanford.edu/~rxdh/psych254/replication_project/forms/end.html?id=' + my_id;
//      window.location.replace(URL);
    }
    break;
  }
}

window.onbeforeunload = function(e) {
  e = e || window.event;
  var msg = ("If you leave before completing the task, "
	     + "you will not be able to submit the HIT.");
  if (!globalGame.submitted) {
    // For IE & Firefox
    if (e) {
      e.returnValue = msg;
    }
    // For Safari
    return msg;
  }
};

// // Automatically registers whether user has switched tabs...
(function() {
  document.hidden = hidden = "hidden";

  // Standards:
  if (hidden in document)
    document.addEventListener("visibilitychange", onchange);
  else if ((hidden = "mozHidden") in document)
    document.addEventListener("mozvisibilitychange", onchange);
  else if ((hidden = "webkitHidden") in document)
    document.addEventListener("webkitvisibilitychange", onchange);
  else if ((hidden = "msHidden") in document)
    document.addEventListener("msvisibilitychange", onchange);
  // IE 9 and lower:
  else if ('onfocusin' in document)
    document.onfocusin = document.onfocusout = onchange;
  // All others:
  else
    window.onpageshow = window.onpagehide = window.onfocus 
    = window.onblur = onchange;
})();

function onchange (evt) {
  var v = 'visible', h = 'hidden',
      evtMap = { 
        focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h 
      };
  evt = evt || window.event;
  if (evt.type in evtMap) {
    document.body.className = evtMap[evt.type];
  } else {
    document.body.className = evt.target.hidden ? "hidden" : "visible";
  }
  // console.log(evt);
  // console.log(document.body.className);
  // console.log(globalGame);
  visible = document.body.className;
  globalGame.socket.send("h." + document.body.className);  

};

(function () {

  var original = document.title;
  var timeout;

  window.flashTitle = function (newMsg, howManyTimes) {
    function step() {
      document.title = (document.title == original) ? newMsg : original;
      if (visible === "hidden") {
        timeout = setTimeout(step, 500);
      } else {
        document.title = original;
      }
    };
    cancelFlashTitle(timeout);
    step();
  };

  window.cancelFlashTitle = function (timeout) {
    clearTimeout(timeout);
    document.title = original;
  };

}());
