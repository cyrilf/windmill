/**
 * Define a human player
 * @type {Object}
 */
var Human = Player.extend({
  init: function(username, marker) {
    this._super('human', username, marker);
  },
  pickPosition: function(position) {
    var aPieceIsSelected = UI.Pieces.isPieceSelected(position);
    if(aPieceIsSelected !== undefined) {
      GAME.setPieceOnPosition(aPieceIsSelected);
    }
  }
});