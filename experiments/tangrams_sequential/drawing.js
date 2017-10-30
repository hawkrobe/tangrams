// drawing.js
// This file contains functions to draw on the HTML5 canvas

// Draws a grid of cells on the canvas (evenly divided 
var drawGrid = function(game){
    //size of canvas
    var cw = game.viewport.width;
    var ch = game.viewport.height;

    //padding around grid
    var p = game.cellPadding / 2;

    //grid width and height
    var bw = cw - (p*2) ;
    var bh = ch - (p*2) ;
    
    game.ctx.beginPath();

    // vertical lines
  for (var x = 0; x <= bw; x += Math.floor((cw - 2*p) / game.numHorizontalCells)) {
        game.ctx.moveTo(0.5 + x + p, p);
        game.ctx.lineTo(0.5 + x + p, bh + p);}

    // horizontal lines
    for (var x = 0; x <= bh; x += Math.floor((ch - 2*p) / game.numVerticalCells)) {
        game.ctx.moveTo(p, 0.5 + x + p);
        game.ctx.lineTo(bw + p, 0.5 + x + p);}

    game.ctx.lineWidth = 1;
    game.ctx.strokeStyle = "black";
    game.ctx.stroke();
};

// Loop through the object list and draw each one in its specified location
var drawObjects = function(game, player) {
  _.map(game.objects, function(obj) { 
    game.ctx.drawImage(obj.img, obj.trueX, obj.trueY,
		       obj.width, obj.height);
  });
};

var highlightCell = function(game, player, color, condition) {
  var targetObjects = _.filter(game.objects, condition);
  var customCoords = game.my_role == "director" ? 'directorCoords' : 'matcherCoords';
  for (var i = 0; i < targetObjects.length; i++){
    var gridX = targetObjects[i][customCoords]['gridX'];
    var gridY = targetObjects[i][customCoords]['gridY'];
    var upperLeftX = game.getPixelFromCell(gridX, gridY).upperLeftX;
    var upperLeftY = game.getPixelFromCell(gridX, gridY).upperLeftY;
    if (upperLeftX != null && upperLeftY != null) {
      game.ctx.beginPath();
      game.ctx.lineWidth="10";
      game.ctx.strokeStyle=color;
      game.ctx.rect(upperLeftX + 5, upperLeftY + 5,290,290); 
      game.ctx.stroke();
    }
  }
};

var drawScreen = function(game, player) {
  // draw background
  game.ctx.fillStyle = "#FFFFFF";
  game.ctx.fillRect(0,0,game.viewport.width,game.viewport.height);
  
  // Draw message in center (for countdown, e.g.)
  if (player.message) {
    game.ctx.font = "bold 23pt Helvetica";
    game.ctx.fillStyle = 'blue';
    game.ctx.textAlign = 'center';
    wrapText(game, player.message, 
             game.world.width/2, game.world.height/4,
             game.world.width*4/5,
             25);
  }
  else {
    drawGrid(game);
    drawObjects(game, player);  
    if(game.my_role === game.playerRoleNames.role1) {
      highlightCell(game, player, 'black',
		    function(x){return x.targetStatus == 'target';});
    }
  }
};

// This is a helper function to write a text string onto the HTML5 canvas.
// It automatically figures out how to break the text into lines that will fit
// Input:
//    * game: the game object (containing the ctx canvas object)
//    * text: the string of text you want to writ
//    * x: the x coordinate of the point you want to start writing at (in pixels)
//    * y: the y coordinate of the point you want to start writing at (in pixels)
//    * maxWidth: the maximum width you want to allow the text to span (in pixels)
//    * lineHeight: the vertical space you want between lines (in pixels)
function wrapText(game, text, x, y, maxWidth, lineHeight) {
  var cars = text.split("\n");
  game.ctx.fillStyle = 'white';
  game.ctx.fillRect(0, 0, game.viewport.width, game.viewport.height);
  game.ctx.fillStyle = 'red';

  for (var ii = 0; ii < cars.length; ii++) {

    var line = "";
    var words = cars[ii].split(" ");

    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + " ";
      var metrics = game.ctx.measureText(testLine);
      var testWidth = metrics.width;

      if (testWidth > maxWidth) {
        game.ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    game.ctx.fillText(line, x, y);
    y += lineHeight;
  }
}
