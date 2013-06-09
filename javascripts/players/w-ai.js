/**
 * Define an AI player
 * @type {Object}
 */
var AI = Player.extend({
  init: function(username, marker) {
    this._super('AI', username, marker);
  },
  pickPosition: function() {
    var position, piecePosition;
    var isFirstRound = this.stockPieces == 9;
    if (isFirstRound) {
      position = _.random(GAME.windmill.boardSize - 1);
    } else {
      switch(this.phase) {
        case PHASE.PLACING:
          position = this.findPlacingPosition();
          break
        case PHASE.MOVING:
          pieceAndPosition = this.findMovingPieceAndPosition();

          position = _.last(pieceAndPosition)
          piecePosition = _.first(pieceAndPosition)
          break
        case PHASE.FLYING:
          position = this.findFlyingPosition();
          break
        default:
          position = this.findPlacingPosition();
      }
    }
    if (piecePosition !== undefined) {
      GAME.windmill.destroyPiece(piecePosition);
    }
    GAME.windmill.setPieceOnPosition(position);
  },
  // The weight is the number of pieces (for the current player) on the line.
  // The more a line is heavy, the more it's a good strategy to try to complete it.
  // Note : completed lines and lines where the enemy has at least one piece are not returned
  // Returns [[lineIndex, weight], [lineIndex, weight], ...]
  setLinesWeight: function() {
    var weightedLines = [];
    var weight, ok;

    _.each(GAME.windmill.lines, function(line, index) {
      weight = 0;
      ok = true;
      _.each(line, function(element) {
        if (ok) {
          if (GAME.windmill.board[element] === this.marker) {
            weight++;
          } else if (GAME.windmill.board[element] === !this.marker) {
            ok = false;
            weight = 0;
          }
        }
      }, this)
      if (ok && weight > 0 && weight < 3) {
        weightedLines.push([index, weight]);
      }
    }, this)

    return weightedLines;
  },
  pickEmptyPositionFromLine: function(lineIndex) {
    var line = GAME.windmill.lines[lineIndex];
    var selectedPosition;

    _.each(line, function(element) {
      if (GAME.windmill.board[element] === undefined) {
        selectedPosition = element;
      }
    })

    return selectedPosition;
  },
  getEmptyLine: function() {
    var emptyLine;

    _.each(GAME.windmill.lines, function(line) {
        if (GAME.windmill.board[line[0]] === undefined && GAME.windmill.board[line[1]] === undefined && GAME.windmill.board[line[2]] === undefined) {
          emptyLine = line;
        }
    });

    return emptyLine;
  },
  dangerousEnemyLine: function() {
    var sum, selectedLine;

    _.each(GAME.windmill.lines, function(line, index) {
      if (selectedLine === undefined) {
        sum = 0;
        _.each(line, function(element) {
          if (GAME.windmill.board[element] === !this.marker) {
            sum++;
          }
        }, this)
        if (sum === 2 && this.pickEmptyPositionFromLine(index)) {
          selectedLine = index;
        }
      }
    }, this)

    return selectedLine;
  },
  // A piece is considered vulnerable if it can be destroyed.
  selectEnemyVulnerablePieceFromLine : function(lineIndex) {
    var selectedPiece;

    if (lineIndex !== undefined) {
      var line = GAME.windmill.lines[lineIndex];

      _.each(line, function(element) {
        if (GAME.windmill.board[element] === !this.marker && !GAME.windmill.isLineComplete(element)) {
          selectedPiece = element;
        }
      }, this)
    }
    return selectedPiece;
  },
  selectEnemyVulnerablePieceFromBoard : function() {
    var selectedPiece;

    _.each(GAME.windmill.board, function(marker, index) {
      if (marker === !this.marker && !GAME.windmill.isLineComplete(index)) {
        selectedPiece = index;
      }
    }, this)
    return selectedPiece;
  },
  selectEnemyPiece : function() {
    var lineIndex = this.dangerousEnemyLine();
    return this.selectEnemyVulnerablePieceFromLine(lineIndex) || this.selectEnemyVulnerablePieceFromBoard();
  },
  findNearbyPieceFor : function(position) {
    var nearbyPiece;

    _.each(GAME.windmill.graph, function(element) {
      if (element[0] === position && GAME.windmill.board[element[1]] === this.marker) {
        nearbyPiece = element[1];
      } else if (element[1] === position && GAME.windmill.board[element[0]] === this.marker) {
        nearbyPiece = element[0];
      }
    }, this)

    return nearbyPiece;
  },
  findEmptyPositionWithNearbyPiece : function() {
    var selectedPosition, nearbyPiece;

    _.each(GAME.windmill.board, function(marker, position) {
      if (marker === undefined && (selectedPosition === undefined || nearbyPiece === undefined)) {
        selectedPosition = position;
        nearbyPiece = this.findNearbyPieceFor(position);
      }
    }, this)

    return [selectedPosition, nearbyPiece]
  },
  findPlacingPosition : function() {
    var selectedPosition, dangerPosition;
    var weightedLines = this.setLinesWeight();

    var dangerLine = this.dangerousEnemyLine();

    if (dangerLine !== undefined) {
      dangerPosition = this.pickEmptyPositionFromLine(dangerLine);
    }

    if (!_.isEmpty(weightedLines)) {
      weightedLines = _.sortBy(weightedLines, function(line) { return -line[1]; });
      if (_.first(weightedLines)[1] === 2) {
        selectedPosition = this.pickEmptyPositionFromLine(_.first(weightedLines)[0]);
      } else if (dangerPosition !== undefined) {
        selectedPosition = dangerPosition;
      } else {
        selectedPosition = this.pickEmptyPositionFromLine(_.first(weightedLines)[0]);
      }
    }

    if (selectedPosition === undefined) {
      if (dangerPosition !== undefined) {
        selectedPosition = dangerPosition;
      } else {
        var emptyLine = this.getEmptyLine();
        if (emptyLine !== undefined) {
          selectedPosition = _.shuffle(emptyLine)[0];
        } else {
          selectedPosition = _.random(GAME.windmill.boardSize - 1);
        }
      }
    }

    return selectedPosition;
  },
  findMovingPieceAndPosition: function() {
    var selectedPiece, selectedPosition, dangerPosition;

    var weightedLines = this.setLinesWeight();

    var dangerLine = this.dangerousEnemyLine();

    if (dangerLine !== undefined) {
      dangerPosition = this.pickEmptyPositionFromLine(dangerLine);
    }

    if (!_.isEmpty(weightedLines)) {
      weightedLines = _.sortBy(weightedLines, function(line) { return -line[1]; });
      if (_.first(weightedLines)[1] === 2) {
        selectedPosition = this.pickEmptyPositionFromLine(_.first(weightedLines)[0]);
        selectedPiece = this.findNearbyPieceFor(selectedPosition);
      }
    }

    if ((selectedPosition === undefined || selectedPiece === undefined) && dangerPosition !== undefined) {
      selectedPosition = dangerPosition;
      selectedPiece = this.findNearbyPieceFor(selectedPosition);
    }

    if (selectedPosition === undefined || selectedPiece === undefined) {
      var emptyPositionAndNearbyPiece = this.findEmptyPositionWithNearbyPiece();
      selectedPosition = _.first(emptyPositionAndNearbyPiece);
      selectedPiece = _.last(emptyPositionAndNearbyPiece);
    }

    return [selectedPiece, selectedPosition];
  },
  findFlyingPosition: function() {
    return _.random(GAME.windmill.boardSize - 1);
  }
});