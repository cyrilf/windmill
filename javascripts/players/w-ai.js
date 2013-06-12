/**
 * Define an AI player
 * @type {Object}
 */
var AI = Player.extend({
  init: function(username, marker) {
    this._super('AI', username, marker);
  },
  pickPosition: function() {
    var position, piecePosition, pieceAndPosition;
    var isFirstRound = this.stockPieces == 9;
    if (isFirstRound) {
      position = _.random(GAME.boardSize - 1);
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
          pieceAndPosition = this.findFlyingPosition();

          position = _.last(pieceAndPosition)
          piecePosition = _.first(pieceAndPosition)
          break
        default:
          pieceAndPosition = this.findPlacingPosition();
      }
    }
    if (piecePosition !== undefined) {
      GAME.destroyPiece(piecePosition);
    }
    GAME.setPieceOnPosition(position);
  },
  // The weight is the number of pieces (for the current player) on the line.
  // The more a line is heavy, the more it's a good strategy to try to complete it.
  // Note : completed lines and lines where the enemy has at least one piece are not returned
  // Returns [[lineIndex, weight], [lineIndex, weight], ...]
  setLinesWeight: function() {
    var weightedLines = [];
    var weight, ok;

    _.each(GAME.lines, function(line, index) {
      weight = 0;
      ok = true;
      _.each(line, function(element) {
        if (ok) {
          if (GAME.board[element] === this.marker) {
            weight++;
          } else if (GAME.board[element] === !this.marker) {
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
    var line = GAME.lines[lineIndex];
    var selectedPosition;

    _.each(line, function(element) {
      if (GAME.board[element] === undefined) {
        selectedPosition = element;
      }
    })

    return selectedPosition;
  },
  getEmptyLine: function() {
    var emptyLine;

    _.each(GAME.lines, function(line) {
        if (GAME.board[line[0]] === undefined && GAME.board[line[1]] === undefined && GAME.board[line[2]] === undefined) {
          emptyLine = line;
        }
    });

    return emptyLine;
  },
  dangerousEnemyLine: function() {
    var sum, selectedLine;

    _.each(GAME.lines, function(line, index) {
      if (selectedLine === undefined) {
        sum = 0;
        _.each(line, function(element) {
          if (GAME.board[element] === !this.marker) {
            sum++;
          }
        }, this)
        if (sum === 2 && this.pickEmptyPositionFromLine(index) !== undefined) {
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
      var line = GAME.lines[lineIndex];

      _.each(line, function(element) {
        if (GAME.board[element] === !this.marker && !GAME.isLineComplete(element)) {
          selectedPiece = element;
        }
      }, this)
    }
    return selectedPiece;
  },
  selectEnemyVulnerablePieceFromBoard : function() {
    var selectedPiece;

    _.each(GAME.board, function(marker, index) {
      if (marker === !this.marker && !GAME.isLineComplete(index)) {
        selectedPiece = index;
      }
    }, this)
    return selectedPiece;
  },
  selectEnemyPiece : function() {
    var lineIndex = this.dangerousEnemyLine();
    var enemyPiece = this.selectEnemyVulnerablePieceFromLine(lineIndex);
    if (enemyPiece === undefined) {
      enemyPiece = this.selectEnemyVulnerablePieceFromBoard();
    }
    return enemyPiece;
  },
  findNearbyPieceFor : function(position) {
    var nearbyPiece;
    _.each(GAME.graph, function(element) {
      if (element[0] === position && GAME.board[element[1]] === this.marker) {
        nearbyPiece = element[1];
      } else if (element[1] === position && GAME.board[element[0]] === this.marker) {
        nearbyPiece = element[0];
      }
    }, this)
    return nearbyPiece;
  },
  findAllNearbyPiecesFor : function(position) {
    var nearbyPieces = [];

    _.each(GAME.graph, function(element) {
      if (element[0] === position && GAME.board[element[1]] === this.marker) {
        if (!_.contains(nearbyPieces, element[1])) {
          nearbyPieces.push(element[1]);
        }
      } else if (element[1] === position && GAME.board[element[0]] === this.marker) {
        if (!_.contains(nearbyPieces, element[0])) {
          nearbyPieces.push(element[0]);
        }
      }
    }, this)

    return nearbyPieces;
  },
  findEmptyPositionWithNearbyPiece : function() {
    var selectedPosition, nearbyPiece;

    _.each(GAME.board, function(marker, position) {
      if (marker === undefined && (selectedPosition === undefined || nearbyPiece === undefined)) {
        selectedPosition = position;
        nearbyPiece = this.findNearbyPieceFor(position);
      }
    }, this);

    return [selectedPosition, nearbyPiece];
  },
  // Returns : [[position, [piece, piece, ...]], [position, [piece, piece, ...]], ...]
  findAllEmptyPositionsWithNearbyPieces : function() {
    var nearbyPieces;
    var emptyPositions = [];

    _.each(GAME.board, function(marker, position) {
      nearbyPieces = undefined;
      if (marker === undefined) {
        nearbyPieces = this.findAllNearbyPiecesFor(position);
        if (nearbyPieces !== undefined) {
          emptyPositions.push([position, nearbyPieces])
        }
      }
    }, this)

    return emptyPositions;
  },
  // Returns : [[position, risk], [position, risk], ...]
  defensivePieces : function() {
    var totaltab = [];

    _.each(GAME.board, function(marker, index) {
      if (marker === this.marker && _.contains(GAME.intersection, index)) {
        var total = 0;
        _.each(GAME.lines, function(line) {
          if (_.contains(line, index)){
            var tab = _.map(line, function(element) { return GAME.board[element]; });
            total += _.filter(tab, function(element) { return element === !this.marker; }).length;
          }
        });
        totaltab.push([index, total]);
      }
    });

    return totaltab;
  },
  findAnyPieceNotOnLine : function(lineIndex) {
    var line = GAME.lines[lineIndex];
    var selectedPiece;

    _.each(GAME.board, function(marker, index) {
      if (marker === this.marker && !_.contains(line, index)) {
        selectedPiece = index;
      }
    }, this);

    return selectedPiece;
  },
  prepareNextRoundAttack : function() {
    var nearbyPieces, currentPosition, selectedPosition, selectedPiece, weightedLines, foundPosition, foundPiece;
    var defensivePieces = _.filter(this.defensivePieces(), function(element) { return _.last(element) >= 3; });
    defensivePieces = _.map(defensivePieces, function(element) { return _.first(element); });

    var emptyPositions = this.findAllEmptyPositionsWithNearbyPieces();

    _.each(emptyPositions, function(position) {
      currentPosition = _.first(position);
      nearbyPieces = _.last(position);

      _.each(nearbyPieces, function(piece) {
        if (selectedPosition === undefined || selectedPiece === undefined) {
          GAME.board[currentPosition] = this.marker;
          GAME.board[piece] = undefined;

          if (!_.contains(defensivePieces, piece)) {
            weightedLines = this.setLinesWeight();

            _.each(weightedLines, function(element) {
              if (foundPosition === undefined || foundPiece === undefined) {
                foundPosition = this.pickEmptyPositionFromLine(_.first(element));
                tempPiece = this.findNearbyPieceFor(foundPosition);

                GAME.board[foundPosition] = this.marker;
                GAME.board[tempPiece] = undefined;
                if (GAME.isLineComplete(foundPosition)) {
                  foundPiece = tempPiece;
                  selectedPosition = currentPosition;
                  selectedPiece = piece;
                }
                GAME.board[foundPosition] = undefined;
                GAME.board[tempPiece] = this.marker;
              }
            }, this);
          }

          GAME.board[currentPosition] = undefined;
          GAME.board[piece] = this.marker;
        }
      }, this);
    }, this);

    return [selectedPosition, selectedPiece];
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
          selectedPosition = _.random(GAME.boardSize - 1);
        }
      }
    }
    return selectedPosition;
  },
  findMovingPieceAndPosition: function() {
    var selectedPiece, selectedPosition, dangerPosition, nextMove;

    var weightedLines = this.setLinesWeight();

    var dangerLine = this.dangerousEnemyLine();

    if (dangerLine !== undefined) {
      dangerPosition = this.pickEmptyPositionFromLine(dangerLine);
    }

    if (!_.isEmpty(weightedLines)) {
      weightedLines = _.filter(weightedLines, function(line) { return line[1] === 2; });

      _.each(weightedLines, function(element) {
        if (selectedPosition === undefined || selectedPiece === undefined) {
          selectedPosition = this.pickEmptyPositionFromLine(_.first(element));
          tempPiece = this.findNearbyPieceFor(selectedPosition);

          GAME.board[selectedPosition] = this.marker;
          GAME.board[tempPiece] = undefined;
          if (GAME.isLineComplete(selectedPosition)) {
            selectedPiece = tempPiece;
          }
          GAME.board[selectedPosition] = undefined;
          GAME.board[tempPiece] = this.marker;
        }
      }, this);
    }

    if ((selectedPosition === undefined || selectedPiece === undefined) && dangerPosition !== undefined) {
      selectedPosition = dangerPosition;
      selectedPiece = this.findNearbyPieceFor(selectedPosition);
    }

    if (selectedPosition === undefined || selectedPiece === undefined) {
      nextMove = this.prepareNextRoundAttack();
      selectedPosition = _.first(nextMove);
      selectedPiece = _.last(nextMove);
    }

    if (selectedPosition === undefined || selectedPiece === undefined) {
      // code Kévin
      selectedPosition = undefined; // TODO
      selectedPiece = undefined; // TODO
    }

    if (selectedPosition === undefined || selectedPiece === undefined) {
      var emptyPositionAndNearbyPiece = this.findEmptyPositionWithNearbyPiece();
      selectedPosition = _.first(emptyPositionAndNearbyPiece);
      selectedPiece = _.last(emptyPositionAndNearbyPiece);
    }

    return [selectedPiece, selectedPosition];
  },
  findFlyingPosition: function() {
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
        selectedPiece = this.findAnyPieceNotOnLine(_.first(weightedLines)[0]);
      }
    }

    if ((selectedPosition === undefined || selectedPiece === undefined) && dangerPosition !== undefined) {
      selectedPosition = dangerPosition;
      selectedPiece = this.findAnyPieceNotOnLine(dangerLine);
    }

    if (selectedPosition === undefined || selectedPiece === undefined) {
      _.each(weightedLines, function(element) {
        if (selectedPosition === undefined || selectedPiece === undefined) {
          selectedPosition = this.pickEmptyPositionFromLine(_.first(element));
          selectedPiece = this.findAnyPieceNotOnLine(_.first(element));
        }
      }, this);
    }

    return [selectedPiece, selectedPosition];
  }
});
