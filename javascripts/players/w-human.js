/**
 * Define a human player
 * @type {Object}
 */
 var Human = Player.extend({
  init: function(username, marker) {
    this._super('human', username, marker);
    this.pieceSelected = undefined;
  },
  pickPosition: function(position) {
    var pieceSelected = UI.Pieces.isPieceSelected(position);

    var requireAnotherAction = GAME.requireAnotherAction;
    if (pieceSelected !== undefined) {
      if (this.phase === PHASE.PLACING || requireAnotherAction) {
        GAME.setPieceOnPosition(pieceSelected);
      } else if (this.phase === PHASE.MOVING
        || this.phase === PHASE.FLYING) {
        this.moveHandling(pieceSelected);
      }
    }
  },
  moveHandling: function(position) {
    var isOwnPiece      = this.marker === GAME.board[position];
    var isEmptyPosition = GAME.board[position] === undefined;
    var hasPieceSelected = this.pieceSelected   !== undefined;
    if (isOwnPiece) {
      if (GAME.isValidPosition(position, false)) {
        if (hasPieceSelected) {
          UI.Pieces.unselectPiece(this.pieceSelected, this.marker);
        }
        this.pieceSelected = position;
        UI.Pieces.selectPiece(position);
      }
    } else if (isEmptyPosition && hasPieceSelected) {
      if (GAME.isValidPosition(position)) {
        if (GAME.isValidMovement(this.pieceSelected, position)) {
          GAME.movePiece(this.pieceSelected, position);
          this.pieceSelected = undefined;
          GAME.checkGameState(position);
        }
      }
    }
  }
});