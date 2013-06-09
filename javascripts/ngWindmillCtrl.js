angular.module('ngWindmill',[])
       .controller('ngWindmillCtrl', function($scope) {

  $scope.title = 'Windmill';

  var UTIL = {
    fire : function(func, funcname, args) {

      var namespace = GAME;

      funcname = (funcname === undefined) ? 'init' : funcname;
      if (func !== '' && namespace[func] && typeof namespace[func][funcname] == 'function') {
        namespace[func][funcname](args);
      }
    },
    loadEvents : function() {
      UTIL.fire('windmill');
      UTIL.fire('windmill', 'run');
    }
  };

  var GAME = $scope.GAME = {
    windmill : {
      init : function() {
        this.player1              = new AI('Daenerys', true);
        this.player2              = new Human('Jon Snow', false);
        this.currentPlayer        = this.player1;
        this.noCatchCountdown     = 0; // 50 moves without a catch                                 = tie
        this.threePiecesCountdown = 0; // 10 moves when both players only have 10 pieces remaining = tie
        var boardSize             = 24;
        this.boardSize            = boardSize;
        this.board                = [];
        this.speed                = 1000;
        while(boardSize--) this.board.push(undefined);
        this.graph = [
                        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
                        [1, 9], [3, 11], [5, 13], [7, 15],
                        [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 8],
                        [9, 17], [11, 19], [13, 21], [15, 23],
                        [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 16]
                     ];
        this.graphLength = this.graph.length;
        this.lines = [[0, 1, 2], [2, 3, 4], [4, 5, 6], [0, 7, 6],
                     [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
                     [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
                     [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]];

        UI.init(this.boardSize);

        // When user click on canvas to play
        var that = this;
        UI.Pieces.piecesCanvas.addEventListener('click', function(event) {
          var isHuman = that.currentPlayer.type === 'human';
          if(isHuman) {
            that.currentPlayer.pickPosition(event);
          }
        });
      },
      run : function() {
        var isAI = this.currentPlayer.type === 'AI'
        // If it's an AI he has to pick a position
        // If it's a human, we wait for him to click
        if(isAI) {
          var position = this.currentPlayer.pickPosition();
        }
      },
      setPieceOnPosition : function(position) {
        if (this.isValidPosition(position)) {
          this.checkGameState(position);
        } else {
          var isAI = this.currentPlayer.type === 'AI';
          if(isAI) { // If it's not a valid position, generate another one
            this.currentPlayer.pickPosition();
          }
        }
      },
      checkGameState : function(position) {
        var currentPlayer  = this.currentPlayer;

        // if requireAnotherAction is set to true we can't pass to the next turn,
        // we have to wait for the user (human) to do something else (i.g. choose a piece to destroy)
        this.requireAnotherAction = this.requireAnotherAction || false;

        if(this.requireAnotherAction) {
          if(this.requireAnotherAction === 'chooseEnemy') {
            this.destroyPiece(position);
          }
          this.requireAnotherAction = false;
        } else {
          if(this.getCurrentPhase() === PHASE.PLACING) {
            this.board[position] = currentPlayer.marker;
            UI.Pieces.drawPiece(position, currentPlayer.marker);
            currentPlayer.stockPieces--;

            this.isDestructionOption(position);
          } else if(this.getCurrentPhase() === PHASE.MOVING ) {
            this.board[position] = currentPlayer.marker;
            UI.Pieces.drawPiece(position, currentPlayer.marker);

            this.isDestructionOption(position);
          } else if(this.getCurrentPhase() === PHASE.FLYING) {
            // Implement me (check for a valid movement)
          }
        }

        if(!this.requireAnotherAction) {
          this.endTurn();
        }
      },
      endTurn : function() {
        this.updatePlayerPhase(); // Update the phase if necessary
        var enemyHasLost = this.checkEnemyFail(); // Check if the enemy loose or not
        if(enemyHasLost) {
          this.newGame();
        } else {
          this.changePlayer();      // Change player
          //this.run();
          setTimeout(function(_this) { $scope.$apply(_this.run()); }, 100, this);
        }
      },
      getCurrentPhase : function() {
        var currentPlayer  = this.currentPlayer;

        var isPlacingPhase = currentPlayer.phase.value === PHASE.PLACING.value;
        if(isPlacingPhase)
          return PHASE.PLACING;

        var isMovingPhase  = currentPlayer.phase.value === PHASE.MOVING.value;
        if(isMovingPhase)
          return PHASE.MOVING;

        var isFlyingPhase  = currentPlayer.phase.value === PHASE.FLYING.value;
        if(isFlyingPhase)
          return PHASE.FLYING;
      },
      /**
       * If necessary, update the player game phase
       */
      updatePlayerPhase : function() {
        var currentPlayer  = this.currentPlayer;

        if(this.getCurrentPhase() === PHASE.PLACING) {
          var playerHasNoPiecesInStock = currentPlayer.stockPieces === 0;
          if(playerHasNoPiecesInStock) {
            currentPlayer.phase = PHASE.MOVING;
          }
        } else if(this.getCurrentPhase() === PHASE.MOVING) {
          var playerHasLessThanThreePieces = this.countPiecesOnBoard() === 3;
          if(playerHasLessThanThreePieces) {
            currentPlayer.phase = PHASE.FLYING;
          }
        }
      },
      /**
       * After each turn, check if the enemy fails or not
       */
      checkEnemyFail : function() {
        var hasLost = this.enemyHasLessThanThreePieces() || this.isEnemySurrounded();
        return hasLost;
      },
      enemyHasLessThanThreePieces : function() {
        var hasLessThanThreePieces = false;
        var piecesOnBoard = this.countPiecesOnBoard(this.getEnemy());
        if (piecesOnBoard + this.getEnemy().stockPieces < 3) {
          hasLessThanThreePieces = true;
        }

        return hasLessThanThreePieces;
      },
      isEnemySurrounded: function() {
        var isSurrounded = false;
        var enemy = !this.currentPlayer.marker;
        var enemyMovement = 0;
        var fail = false;

        _.each(this.board, function(marker, index) {
          if(enemy === marker) {
            _.each(this.graph, function(connection) {
              var isPathFromCurrentPosition = _.contains(connection, index);
              var neighborAvailable = this.board[_.without(connection, index)[0]] === undefined;
              if (isPathFromCurrentPosition && neighborAvailable) {
                enemyMovement++;
              }
            }, this);
          }
        }, this);

        var enemyIsStuck = enemyMovement === 0;
        var enemyNoPiecesInStock = this.getEnemy(this.currentPlayer).stockPieces === 0;
        if(enemyIsStuck && enemyNoPiecesInStock) {
          isSurrounded = true;
        }

        return isSurrounded;
      },
      countPiecesOnBoard: function(player) {
        player = player || this.currentPlayer;
        var piecesOnBoard = _.filter(this.board, function(marker) {
          return marker === player.marker;
        }, this).length;

        return piecesOnBoard;
      },
      isValidPosition : function(position) {
        var isBadPosition = position === undefined || position < 0 || position > (this.boardSize - 1);

        if(this.requireAnotherAction) {
          if(this.requireAnotherAction === 'chooseEnemy') {
            var isNotEnemyPiece = this.board[position] !== !this.currentPlayer.marker;
            var isEnemyPiece = !isNotEnemyPiece;
            var lineEnemyComplete = isEnemyPiece && this.isLineComplete(position);

            if(isNotEnemyPiece || lineEnemyComplete) {
              isBadPosition = true;
            }
          }
        } else {
          isBadPosition = isBadPosition || this.board[position] !== undefined;
        }

        return !isBadPosition;
      },
      isLineComplete : function(position) {
        var result = false;
        _.each(this.lines, function(line) {
          if(_.contains(line, position)) {
            if(this.board[line[0]] === this.board[line[1]] && this.board[line[1]] === this.board[line[2]]) {
              result = true;
            }
          }
        }, this);
        return result;
      },
      isDestructionOption : function(position) {
        if (this.isLineComplete(position) && this.canRemoveEnemyPiece()) {
          if (this.currentPlayer.type === 'AI') {
            var pieceToBeDestroyed = this.currentPlayer.selectEnemyPiece();
            if (pieceToBeDestroyed !== undefined) {
              this.destroyPiece(pieceToBeDestroyed);
            }
          } else {
            // Do something on the ui to say to the user to choose an enemy piece
            this.requireAnotherAction = 'chooseEnemy';
          }
        }
      },
      destroyPiece : function(pieceToBeDestroyed) {
        this.board[pieceToBeDestroyed] = undefined;
        UI.Pieces.clearPiece(UI.Board.points[pieceToBeDestroyed]);
      },
      /**
       * canRemoveEnemyPiece return true if an enemy piece can be remove
       * It return false if no enemy piece can be remove (e.g. all enemy pieces are
       * in an complete line)
       * @return {[type]} [description]
       */
      canRemoveEnemyPiece: function() {
        var result = false;
        var isEnemyPiece, isLineIncomplete;
        _.each(this.board, function(marker, index) {
          isEnemyPiece  = marker === !this.currentPlayer.marker;
          isLineIncomplete = !this.isLineComplete(index);
          if (isEnemyPiece && isLineIncomplete) {
            result = true;
          }
        }, this);

        return result;
      },
      changePlayer : function() {
        this.currentPlayer = this.getEnemy();
      },
      getEnemy: function() {
        if(this.currentPlayer === this.player1)
          return this.player2;
        else
          return this.player1;
      },
      newGame : function() {
        alert(this.currentPlayer.username);
        this.init();
        UI.init(GAME.windmill.boardSize);
        this.run();
      }
    }
  };

  /**
   * Differents phases of the game
   * @type {Object}
   */
  var PHASE = {
    PLACING: {value: 0, name:'Placing pieces'},
    MOVING:  {value: 1, name:'Moving pieces'},
    FLYING:  {value: 2, name:'Flying'}
  };

  var Player = Class.extend({
    init: function(type, username, marker) {
      this.type          = type;
      this.stockPieces   = 9;
      this.username      = username;
      this.marker        = marker;
      this.phase         = PHASE.PLACING;
    }
  });

  var Human = Player.extend({
    init: function(username, marker) {
      this._super('human', username, marker);
    },
    pickPosition: function(position) {
      var aPieceIsSelected = UI.Pieces.isPieceSelected(position);
      if(aPieceIsSelected !== undefined) {
        GAME.windmill.setPieceOnPosition(aPieceIsSelected);
      }
    }
  });

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

  UTIL.loadEvents();
});

//--------------- GRAPH: DO NOT DELETE THIS SCHEMA ------------
//     0------------1------------2
//     |            |            |
//     |   8--------9------10    |
//     |   |        |       |    |
//     |   |   16--17--18   |    |
//     |   |   |        |   |    |
//     7---15--23      19--11----3
//     |   |   |        |   |    |
//     |   |   22--21--20   |    |
//     |   |        |       |    |
//     |   14------13------12    |
//     |            |            |
//     6------------5------------4