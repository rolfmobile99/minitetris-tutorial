/*
  tetr*s-lite game piece  - combine GamePiece and GameGrid - place pieces
  
  Assume a playfield that is 9x18 squares and needs a boundary
  around it, so that's like 11x20. Try a square of 25x25 pixels.
  (c) 2020 Rolf Widenfelt
  
  Todo:
  - implement collapsing row (also need a test for a full row)
 */

const GRID_X = 9;
const GRID_Y = 18;
const PIECE_W = 30;  // make these even numbers!
const PIECE_H = 30;
const FUDGE_DY = 0;  // was 2
const COLLIDE_DY = 1;  // move to "force" collision

const I_PIECE = 0;
const L_PIECE = 1;
var CurrentGPID = 0;  // current gamepiece ID
var GPArray = [];

var p_delta = 2;

var InstructionsSeen = false; // set to false to show instructions @ start


//
// the game piece, defined as a class (variables + functions)
//
class GamePiece {
  constructor (x, y, p_type=I_PIECE) {
    this._id = ++CurrentGPID;
    this._placed = 0;
    this.p_x = x;    // upper left corner of "center" square
    this.p_y = y;
    this.p_w = PIECE_W;
    this.p_h = PIECE_H;
    this.p_type = p_type;  // 0="I" piece, 1="L" piece
    this.orient = 0; // orientation (0-3)
    this.p_color = [250,20,20];  // outline color (RGB)
    this.rects = [];
    if (this.p_type == I_PIECE) {
      this.rects[0] = [[-1,0],[0,0],[1,0]]; // "normal I"
      this.rects[1] = [[0,-1],[0,0],[0,1]]; // rotated by 90 CW
      this.rects[2] = [[-1,0],[0,0],[1,0]]; // same as [0]
      this.rects[3] = [[0,-1],[0,0],[0,1]]; // same as [1]
    } else {
      this.rects[0] = [[0,-1],[0,0],[1,0]]; // "normal L"
      this.rects[1] = [[1,-1],[0,-1],[0,0]]; // rotated by 90 CW
      this.rects[2] = [[0,-1],[1,-1],[1,0]]; // rotated by 180
      this.rects[3] = [[0,0],[1,0],[1,-1]]; // rotated by 270
    }
    // pick a color
    var palette = Array([250,20,20],[20,180,20],[20,20,180]);
    this.p_color = palette[this._id % palette.length];
  }

  render() {
   if (this._placed) {
      return;
    }
    strokeWeight(2);
    //stroke(250, 20, 20);
    stroke(this.p_color[0], this.p_color[1], this.p_color[2]);  // outline
    fill(250);
    //rect(this.p_x, this.p_y, this.p_w, this.p_h); // x, y is UL
    if (this.rects.length > 0) {
      var rects = this.rects[this.orient];
      var basex = this.p_x;
      var basey = this.p_y;
      var w = this.p_w;
      var h = this.p_h;
      for (var r of rects) {
        rect(basex+r[0]*w, basey+r[1]*h, w-1, h-1);
      }
      ellipse(basex, basey, 5, 5); // debug - to see (0,0) corner
    }
  }

  printMe() {  // debug only!
    print("piece id="+this._id+" x,y="+this.p_x+","+this.p_y);
  }

  id() {
    return this._id;
  }

  getColor() {
    return this.p_color;  // like [250,20,20]
  }

  getPosition() {  // returns center position
    return {x: this.p_x, y: this.p_y};
  }

  getBottom() {  // returns lowest edge "y"
    return (this.p_y + this.p_h);
  }

  getRectOffsets(orient = this.orient) {
    var rects = this.rects[orient];
    return rects;
  }
  
  getBounds() {  // returns a "rect" that surrounds the piece
    let b = {x1: this.p_x, y1: this.p_y, 
             x2: this.p_x+this.p_w, y2: this.p_y+this.p_h}

    // loop thru rectangles to find bounds
    var basex = this.p_x;
    var basey = this.p_y;
    var w = this.p_w;
    var h = this.p_h;
    var rects = this.rects[this.orient];
    for (var r of rects) {
      var x1 = basex+r[0]*w; // coords of the rect "r"
      var y1 = basey+r[1]*h;
      var x2 = x1+w;
      var y2 = y1+h;
      if (x1 < b.x1) {
        b.x1 = x1;
      }
      if (x2 > b.x2) {
        b.x2 = x2;
      }
      if (y1 < b.y1) {
        b.y1 = y1;
      }
      if (y2 > b.y2) {
        b.y2 = y2;
      }
    }

    return b;  // should work for all orientations
  }

  move(dx, dy) {
    if (this._placed) {
      return;
    }
    this.p_x += dx;
    this.p_y += dy;
  }

  moveWithColl(dx, dy, cellsCollideFunc) {
    if (this._placed) {
      return;
    }

    let p_x = this.p_x + dx;
    let p_y = this.p_y + dy;
    let gc = screen2grid(p_x, p_y);
    let offs = this.getRectOffsets();
    let collided = cellsCollideFunc(gc[0], gc[1], offs);
    if (!collided) {
      this.p_x = p_x;  // if no collision, then update new position
      this.p_y = p_y;
    } else {
      print("collision! at dx,dy="+dx+","+dy);
    }
  }

  rotateCW() {    // rotates "cw" by 90deg only
    if (this._placed) {
      return;
    }
    if (this.orient < 3) {
      this.orient++;
    } else {
      this.orient = 0;
    }
  }

  rotateCWWithColl(cellsCollideFunc) {    // rotates "cw" by 90deg only
    if (this._placed) {
      return;
    }
    let orient = this.orient;
    if (orient < 3) {
      orient++;
    } else {
      orient = 0;
    }
    let gc = screen2grid(this.p_x, this.p_y);
    let offs = this.getRectOffsets(orient);
    let collided = cellsCollideFunc(gc[0], gc[1], offs);
    if (!collided) {
      this.orient = orient;  // if no coll.. then update new rotation
    } else {
      print("collision! rotateCW");
    }
  }

  isPlaced() { return (this._placed == 1); }

  placed() {
    this._placed = 1;  // make the piece "inactive"
  }
}


//
// the game grid class
//
class GameGrid {
  constructor(cols, rows) {
    this.cols = cols; // note: cols is "x" (or "i") dimension of grid
    this.rows = rows;
    this.grid = new Array(rows); // create a 2-D array of "cells"

    for (var j = 0; j < rows; j++) {
      this.grid[j] = new Array(cols);
      for (var i = 0; i < cols; i++) {
        this.grid[j][i] = 0; // unoccupied cell
      }
    }
    print("GameGrid created (cols,rows) = "+cols+","+rows); // debug
  }

  shiftDown() {
    // delete row 0 and add a new row at end - a "classic tetr*s" move
    this.grid.shift();
    var arr = new Array(this.cols);
    for (var i = 0; i < this.cols; i++) {
      arr[i] = 0; // unoccupied cell
    }
    this.grid.push(arr);

    //print("shiftDown: array size="+this.grid[0].length+","+this.grid.length);
  }

  getCell(i, j) { // return grid cell at position [i,j]
    return this.grid[j][i];
  }

  setCell(i, j, value) { // set grid cell's value at position [i,j]
     // set value, but check bounds
    if ((i >= 0 && i < this.cols) && (j >= 0 && j < this.rows)) {
      this.grid[j][i] = value;
    }
  }

  setCells(i, j, offsets, value) { // offsets is an array of [dx,dy]
    for (var k = 0; k < offsets.length; k++) {
      this.setCell(i + offsets[k][0], j - offsets[k][1], value);
      print("setCells: "+value+" offs: "+ offsets[k][0] +","+ offsets[k][1]);
    }
  }

  doCellsCollide(i, j, offsets) {
    // check if any squares overlap with occupied grid cells
    for (var k = 0; k < offsets.length; k++) {
      if ((j - offsets[k][1]) < 0) {  // went below grid!
        return true;
      }
      if (this.getCell(i + offsets[k][0], j - offsets[k][1]) != 0) {
        return true;
      }
    }
    return false;
  }

  debugCell(sx, sy) {
    var arr = screen2grid(sx, sy);
    print("cell at "+arr[0]+","+arr[1]);
  }

  render() {
    strokeWeight(2);
    stroke(20, 180, 20);
    fill(180);

    for (var j = 0; j < this.rows; j++) {
      for (var i = 0; i < this.cols; i++) {
        if (this.grid[j][i] != 0) {
          var p_color = id2color(this.grid[j][i]);  // lookup cell color and set it
          stroke(p_color[0], p_color[1], p_color[2]);
          
          var x = i * PIECE_W + PIECE_W;
          var y = (GRID_Y-j-1) * PIECE_H + PIECE_H;
          rect(x, y, PIECE_W-1, PIECE_H-1); // x, y is UL
          //this.debugCell(x, y);
        }
      }
    }
  }
}


function screen2grid(sx, sy) {
  var i = Math.floor((sx-PIECE_W)/PIECE_W);
  var j = Math.floor((height-PIECE_H+FUDGE_DY-sy)/PIECE_H) - 1;
  var arr = new Array(i, j);
  return arr;
}


function id2color(id) {
  var gp = GPArray[id];
  return gp.getColor();
}


var GP;
var GG;


function initPiece() {
  // use a ternary operator to choose between piece types
  // https://www.javascripttutorial.net/javascript-ternary-operator
  //
  let choice = (random() < 0.5);
  GP = new GamePiece(5*PIECE_W, PIECE_H, choice?I_PIECE:L_PIECE);

  print("create piece #"+GP.id());

  GPArray.push(GP);  // save all game pieces here
}


function showInstructions() {
  var str = 'Use left and right arrows to move. Up arrow to rotate. Space bar to create a new piece.';
  textSize(17);
  fill(250);  // white
  rect(PIECE_W, PIECE_H, GRID_X*PIECE_W, GRID_Y*PIECE_H/4);
  fill(0, 102, 153);  // dark blue
  text(str, PIECE_W, PIECE_H, GRID_X*PIECE_W, GRID_Y*PIECE_H/4);

  str = 'Click Enter key to start game!';
  textSize(14);
  text(str, PIECE_W, PIECE_H*1.5 + GRID_Y*PIECE_H/4 - PIECE_H);
}


function setup() {
  // we make canvas bigger so there is a space around the game grid
  //createCanvas(275, 500);  // assumes 25x25 squares
  createCanvas((GRID_X+2)*PIECE_W, (GRID_Y+2)*PIECE_H);
  print("canvas: "+width+"x"+height);
  
  randomSeed(99);  // for testing only!

  GPArray.push(0);  // slot "0" is reserved
  initPiece();
  
  GG = new GameGrid(GRID_X, GRID_Y);
}


function draw() {
  
  background(230);
  
  // draw bottom line boundary
  strokeWeight(2);
  stroke(20);
  line(0, height-PIECE_H, width, height-PIECE_H);
  
  // debug - draw vertical guide lines
  for (let i=0; i<(GRID_X+1); i++) {
    let x = i*PIECE_W + PIECE_W;
    strokeWeight(1);
    stroke(190);
    line(x, 0, x, height);
  }

  // pause for instructions
  if (!InstructionsSeen && (spaceWasPressed() == false)) {
    showInstructions();
    return;
  } else {
    InstructionsSeen = true;
  }

  // draw grid and "placed" pieces
  GG.render();

  // draw falling piece
  GP.render();
  
  var b = GP.getBounds(); // y2 component is bottom y bounds
  var p = GP.getPosition();
  var offs = GP.getRectOffsets();

  var gc = screen2grid(p.x, p.y+COLLIDE_DY); // move down to "force" collision

  var collided = GG.doCellsCollide(gc[0], gc[1], offs);
  //collided = false;
  
  if (b.y2 >= (height-PIECE_H) || collided) {
    if (!GP.isPlaced()) {
      gc = screen2grid(p.x, p.y);
      print("hit bottom. screen2grid: "+p.x+","+p.y+" => "+gc[0]+","+gc[1]);
      if (collided) {
        print("collision");
      }
      GG.setCells(gc[0], gc[1], offs, GP.id());
    }

    GP.placed();
    
    if (spaceWasPressed() == true) {
      initPiece();
    }
  } else {
    // advance piece
    GP.move(0, p_delta);  // let piece "fall" by "p_delta"
  }
}


var spaceBarPressed = false;

//
// catch "key press" events
//   this detects enter key, space bar (ascii code is 32), others
//
function keyPressed() {
  if ((keyCode == 32) || (keyCode == ENTER)) {
    spaceBarPressed = true;
  }

  // 'bind' is needed so 'this' will be defined
  // ref: https://www.javascripttutorial.net/javascript-bind/
  //
  let doCellsCollide = GG.doCellsCollide.bind(GG);

  var b = GP.getBounds();
  var lx = b.x1;  // left x
  var rx = b.x2;  // right x
  if (keyCode == LEFT_ARROW) {
    if (lx > PIECE_W) {
      GP.moveWithColl(-PIECE_W, 0, doCellsCollide);
    }
  } else if (keyCode == RIGHT_ARROW) {
    if (rx < (width-PIECE_W)) {
      GP.moveWithColl(PIECE_W, 0, doCellsCollide);
    }
  } else if (keyCode == UP_ARROW) {
    GP.rotateCWWithColl(doCellsCollide);
  }

  return false; // prevent any default behaviour
}


// checks if space has been hit
function spaceWasPressed() {
  if (spaceBarPressed) {
    spaceBarPressed = false;  // clear flag
    return true;
  } else {
    return false;
  }
}
