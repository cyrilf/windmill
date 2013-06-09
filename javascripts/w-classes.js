/**
 * Simple class for point drawing
 * @type {Object}
 */
var Point = Class.extend({
  init : function(x, y) {
    this.x = x;
    this.y = y;
  }
});

/**
 * Simple class for piece management
 * @type {Object}
 */
 var Piece = Point.extend({
  init : function(x, y, marker) {
    this._super(x, y);
    this.marker = marker || undefined;
  }
});

/**
 * Differents phases of the game
 * @type {Object}
 */
var PHASE = {
  PLACING: {value: 0, name:'Placing pieces'},
  MOVING:  {value: 1, name:'Moving pieces'},
  FLYING:  {value: 2, name:'Flying'}
};

/**
 * Player generic class
 * @type {Object}
 */
var Player = Class.extend({
  init: function(type, username, marker) {
    this.type          = type;
    this.stockPieces   = 9;
    this.username      = username;
    this.marker        = marker;
    this.phase         = PHASE.PLACING;
  }
});