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
      UTIL.fire('ui');
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
      },
      run : function() {
        this.checkPieces();

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
      isValidPosition : function(position) {
        var isBadPosition = position === undefined || this.board[position] !== undefined || position < 0 || position > (this.boardSize - 1);
        return !isBadPosition;
      },
      isLineComplete : function(position) {
        var result = false;
        _.each(GAME.windmill.lines, function(line) {
          if(_.contains(line, position)) {
            if(GAME.windmill.board[line[0]] === GAME.windmill.board[line[1]] && GAME.windmill.board[line[1]] === GAME.windmill.board[line[2]]) {
              result = true;
            }
          }
        });
        return result;
      },
      checkGameState : function(position) {
        var currentPlayer  = this.currentPlayer;
        var isPlacingPhase = currentPlayer.phase.value === PHASE.PLACING.value;
        var isMovingPhase  = currentPlayer.phase.value === PHASE.MOVING.value;
        var isFlyingPhase  = currentPlayer.phase.value === PHASE.FLYING.value;

        if(isPlacingPhase) {
          this.board[position] = currentPlayer.marker;
          GAME.ui.pieces.drawPiece(position);
          currentPlayer.stockPieces--;

          if (this.isLineComplete(position)) {
            if (this.currentPlayer.type === 'AI') {
              var pieceToBeDestroyed = this.currentPlayer.selectEnemyPiece();
              if (pieceToBeDestroyed !== undefined) {
                GAME.windmill.board[pieceToBeDestroyed] = undefined;
                GAME.ui.pieces.clearPiece(GAME.ui.board.points[pieceToBeDestroyed]);
              }
            }
          }

          var playerHasNoPiecesInStock = currentPlayer.stockPieces === 0;
          if(playerHasNoPiecesInStock) {
            currentPlayer.phase = PHASE.MOVING;
          }
        } else if(isMovingPhase) {
          var playerHasLessThanThreePieces = this.countPiecesOnBoard() === 3;
          if(playerHasLessThanThreePieces) {
            currentPlayer.phase = PHASE.FLYING;
          }

          // Implement me (check for a valid movement)
        } else if(isFlyingPhase) {
          // Implement me (check for a valid movement)
        }

        this.endTurn();
      },
      endTurn : function() {
        this.changePlayer();
        //this.run();
        setTimeout(function(_this) { $scope.$apply(_this.run()); }, 100, this);
      },
      changePlayer : function() {
        if (this.currentPlayer == this.player1)
          this.currentPlayer = this.player2;
        else
          this.currentPlayer = this.player1;
      },
      newGame : function() {
        alert(this.currentPlayer.username);
        this.init();
        GAME.ui.init();
        this.run();
      },
      countPiecesOnBoard: function() {
        var piecesOnBoard = _.filter(this.board, function(marker) {
          return marker == this.currentPlayer.marker;
        }, this).length;

        return piecesOnBoard;
      },
      checkPieces : function() {
        var piecesOnBoard = this.countPiecesOnBoard();
        if (piecesOnBoard + this.currentPlayer.stockPieces < 3) {
          this.newGame();
        }
      }
    },

    ui : {
      init : function() {
        this.size           = 600;
        var boardCanvas     = document.getElementById('board');
        var piecesCanvas    = document.getElementById('pieces');
        boardCanvas.width   = this.size;
        boardCanvas.height  = this.size;
        piecesCanvas.width  = this.size;
        piecesCanvas.height = this.size;

        this.board.init(this.size, boardCanvas);
        this.pieces.init(this.size, piecesCanvas);
      },

      /**
       * Board functions
       */

      board : {

        /**
         * init
         * @param  {int}             size        canvas size
         * @param  {documentElement} boardCanvas canvas element
         */
        init : function(size, boardCanvas) {
          this.size = size;
          this.ctx  = boardCanvas.getContext('2d');
          this.draw();
        },

        /**
         * draw
         */
        draw : function() {
          this.drawBackground();
          this.drawPoints();
          this.drawLines();
        },

        /**
         * drawBackground
         */
        drawBackground : function() {
          var ctx       = this.ctx;
          ctx.fillStyle = 'rgba(22, 160, 133, 1.0)';
          ctx.fillRect(0, 0, this.size, this.size);
        },

        /**
         * drawPoints
         */
        drawPoints : function() {
          var offset       = this.size / 6;
          var spacing      = offset * 2;
          var x            = offset, y = offset;
          var radius       = 7; // point radius
          var pointsNbr    = GAME.windmill.boardSize; // nbr point to draw
          var squaresNbr   = 3;
          var squareLength = pointsNbr / squaresNbr;
          var isHorizontal = true;
          var increment    = true;
          var corner, secondCorner, nextSquare;

          var point   = new Point(x,y);
          this.points = [];

          this.drawPoint(point, radius);
          for(var i = 1; i < pointsNbr; i++ ) {

            if(isHorizontal) {
              x += increment ? spacing : -spacing;
            } else {
              y += increment ? spacing : -spacing;
            }

            point = new Point(x, y);
            this.drawPoint(point, radius);

            corner = i % 2 === 0;
            if(corner) {
              isHorizontal = !isHorizontal;
            }

            secondCorner = i % 4 === 0;
            if(secondCorner) {
              increment = !increment;
            }

            var nextSquare = ((pointsNbr - 1) - i) % (squareLength) === 0;
            if(nextSquare) {
              x      += spacing / 2;
              spacing = spacing / 2;
            }
          }
        },

        /**
         * drawPoint
         * @param  {Object} point  coordinate to draw
         * @param  {Int} radius radius of the point
         */
        drawPoint : function(point, radius) {
          var ctx = this.ctx;

          this.points.push(point);

          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = 'rgba(52, 73, 94, 1)';
          ctx.fill();
          ctx.closePath();
        },

        /**
         * drawLines
         */
        drawLines : function() {
          var points       = this.points;
          var pointsNbr    = points.length;
          var squaresNbr   = 3;
          var squareLength = pointsNbr / squaresNbr;
          var notFirst,previousPoint, lastPoint;

          _.each(points, function(point, index) {
            notFirst = index !== 0;
            if(notFirst) {
              previousPoint = points[index-1];
              if(index % squareLength !== 0) {
                this.drawLine(previousPoint, point);
              } else {
                this.drawLine(points[index - squareLength], previousPoint);
              }

              oddPoint = index < (pointsNbr - squareLength) && index % 2 !== 0;
              if(oddPoint) {
                this.drawLine(point, points[index + squareLength]);
              }

              lastPoint = index === pointsNbr - 1;
              if(lastPoint) {
                this.drawLine(point, points[index - (squareLength - 1)]);
              }
            }
          }, this);
        },

        /**
         * drawLine
         * @param  {Object} beginPoint coordinates of firstPoint
         * @param  {Object} endPoint   coordinates of lastPoint
         */
        drawLine : function(beginPoint, endPoint) {
          var ctx = this.ctx;
          ctx.strokeStyle = 'rgba(52, 73, 94, .7)';
          ctx.beginPath();
          ctx.moveTo(beginPoint.x, beginPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.closePath();
        }
      },

      pieces: {
        /**
         * init
         * @param  {documentElement} piecesCanvas canvas element
         */
        init : function(size, piecesCanvas) {
          this.size   = size;
          this.ctx    = piecesCanvas.getContext('2d');
          this.radius = 17;
          var that    = this;
          piecesCanvas.addEventListener('click', function(event) {
            that.isPieceSelected(event);

          });
        },

        /**
         * drawPiece
         * @param  {Object} piece OR position  piece to draw, or position
         *                                     where to draw the piece
         */
        drawPiece : function(piece) {
          var ctx = this.ctx;

          // If we receive a position in parameter,
          // we create a piece from these informations
          var pieceIsAPosition = !(piece instanceof Piece);
          if(pieceIsAPosition) {
            var pointPosition = GAME.ui.board.points[piece];
            piece = new Piece(pointPosition.x, pointPosition.y, GAME.windmill.currentPlayer.marker);
          }

          ctx.beginPath();
          ctx.arc(piece.x, piece.y, this.radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = (piece.marker === true) ? 'rgba(192, 57, 43,1.0)' : 'rgba(41, 128, 185,1.0)';
          ctx.fill();
          ctx.closePath();
        },

        /**
         * isPieceSelected check if a point is selected and return it
         * else return null
         * @param  {Object}  position the click position
         */
        isPieceSelected : function(position) {
          var xRange, yRange;
          var radius = this.radius;
          var pointFound, indexFound;

          var isHuman = GAME.windmill.currentPlayer.type === 'human';
          if(isHuman) {
            _.each(GAME.ui.board.points, function(point, index) {
              if(!pointFound) {
                xRange = (position.offsetX >= (point.x - radius)) && (position.offsetX <= (point.x + radius));
                yRange = (position.offsetY >= (point.y - radius)) && (position.offsetY <= (point.y + radius));

                if(xRange && yRange) {
                  pointFound = point;
                  indexFound = index;
                }
              }
            });

            if(indexFound !== undefined) {
              GAME.windmill.setPieceOnPosition(indexFound);
            }
          }
        },

        /**
         * clear
         */
        clear : function() {
          this.ctx.clearRect(0, 0, this.size, this.size);
        },

        /**
         * clear a piece
         * @param  {object} piece  piece to clear
         */
        clearPiece : function(piece) {
          var radius = 17;
          this.ctx.clearRect(piece.x - radius, piece.y - radius,
                             radius * 2, radius * 2);
        }
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

  var Point = Class.extend({
    init : function(x, y) {
      this.x      = x;
      this.y      = y;
    }
  });

  /**
   * Simple class for piece management
   * @type {[type]}
   */
  var Piece = Point.extend({
    init : function(x, y, marker) {
      this._super(x, y);
      this.marker = marker || undefined;
    }
  });

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
    }
  });

  var AI = Player.extend({
    init: function(username, marker) {
      this._super('AI', username, marker);
    },
    pickPosition: function() {
      var position;
      var isFirstRound = this.stockPieces == 9;
      if (isFirstRound) {
        position = _.random(GAME.windmill.boardSize - 1);
      } else {
        switch(this.phase) {
          case PHASE.PLACING:
            position = this.findPlacingPosition();
            break
          case PHASE.MOVING:
            position = this.findMovingPosition();
            break
          case PHASE.FLYING:
            position = this.findFlyingPosition();
            break
          default:
            position = this.findPlacingPosition();
        }
      }
      GAME.windmill.setPieceOnPosition(position);
    },
    // The weight is the number of pieces (for the current player) on the line.
    // The more a line is heavy, the more it's a good strategy to try to complete it.
    // Note : completed lines and lines where the enemy has at least one piece are not returned
    // Returns [[lineIndex, weight], [lineIndex, weight], ...]
    setLinesWeight: function() {
      var weightedLines = [];
      var weight;
      var ok;

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
      var sum;
      var selectedLine;

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
    findPlacingPosition: function() {
      var selectedPosition;
      var dangerPosition;
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
    findMovingPosition: function() {
      return _.random(GAME.windmill.boardSize - 1);
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