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
        this.player1              = new AI('Daenerys', 1);
        this.player2              = new Human('Jon Snow', 2);
        this.currentPlayer        = this.player1;
        this.noCatchCountdown     = 0; // 50 moves without a catch                                 = tie
        this.threePiecesCountdown = 0; // 10 moves when both players only have 10 pieces remaining = tie
        var boardSize             = 24;
        this.boardSize            = boardSize;
        this.board                = [];
        while(boardSize--) this.board.push(0);
        this.graph = [
                        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
                        [1, 9], [3, 11], [5, 13], [7, 15],
                        [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 8],
                        [9, 17], [11, 19], [13, 21], [15, 23],
                        [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 16]
                     ];
        this.graphLength = this.graph.length;
      },
      run : function() {
        console.log(this.currentPlayer);

        this.checkPieces();

        this.pickPosition();

        console.log(this.board);

        this.changePlayer();

        setTimeout(function(_this) { $scope.$apply(_this.run()); }, 5000, this);
      },
      newGame : function() {
        console.log('New game');
        this.init();
        this.run();
      },
      pickPosition : function() {
        var position = this.currentPlayer.pickPosition();
        this.setPieceOnPosition(position);
      },
      setPieceOnPosition : function(position) {
        var currentPlayer = this.currentPlayer;
        console.log(position);
        var badPosition   = !position || this.board[position] !== 0 || position < 0 || position > (this.boardSize - 1);
        if (badPosition) {
          this.pickPosition();
        } else {
          var isPlacingPhase = currentPlayer.phase.value === PHASE.PLACING.value;
          var isMovingPhase  = currentPlayer.phase.value === PHASE.MOVING.value;
          var isFlyingPhase  = currentPlayer.phase.value === PHASE.FLYING.value;

          if(isPlacingPhase) {
            this.board[position] = currentPlayer.marker;
            GAME.ui.pieces.drawPiece(position);
            currentPlayer.stockPieces--;

            var playerHasNoPiecesInStock = currentPlayer.stockPieces === 0;
            if(playerHasNoPiecesInStock) {
              currentPlayer.phase = PHASE.MOVING;
            }
          } else if(isMovingPhase) {
            var playerHasLessThanThreePieces = this.countPiecesOnBoard() <= 3;
            if(playerHasLessThanThreePieces) {
              currentPlayer.phase = PHASE.FLYING;
            }

            // Implement me (check for a valid movement)
          } else if(isFlyingPhase) {
            // Implement me (check for a valid movement)
          }
        }
      },
      changePlayer : function() {
        if (this.currentPlayer == this.player1)
          this.currentPlayer = this.player2;
        else
          this.currentPlayer = this.player1;
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
          this.size = size;
          this.ctx  = piecesCanvas.getContext('2d');
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
          ctx.arc(piece.x, piece.y, 17, 0, 2 * Math.PI, false);
          ctx.fillStyle = (piece.marker === 1) ? 'rgba(192, 57, 43,1.0)' : 'rgba(41, 128, 185,1.0)';
          ctx.fill();
          ctx.closePath();
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
      this.marker = marker || 0;
    }
  });

  var Player = Class.extend({
    init: function(type, username, marker) {
      this.type        = type;
      this.stockPieces = 9;
      this.username    = username;
      this.marker      = marker;
      this.phase       = PHASE.PLACING;
    }
  });

  var Human = Player.extend({
    init: function(username, marker) {
      this._super('human', username, marker);
    },
    pickPosition: function() {
      // ----------------------------- TODO: create a graphical interface -----------------------------
      return prompt('Pick a position between 0 and ' + (GAME.windmill.boardSize - 1));
      //-----------------------------------------------------------------------------------------------
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
      return position;
    },
    findPlacingPosition: function() {
      var positionCurrentPlayer, position;
      _.each(GAME.windmill.board, function(marker, index) {
        var markerCurrentPlayer = marker == this.marker;
        if (markerCurrentPlayer) {
          // we use the graph to check if there is an empty position directly linked to the piece, if yes we set the next piece on that position
          _.each(GAME.windmill.graph, function(element) {
            if(element[0] == index && GAME.windmill.board[element[1]] === 0)
              position = element[1];
            else if (element[1] == index && GAME.windmill.board[element[0] === 0])
              position = element[0];
          })

          // TODO: position = aggressive position, need to check for a defensive position in case the other player is about to win
        }
      }, this);

      if (!position) { // if all pieces are surrounded and no position was found
        position = _.random(GAME.windmill.boardSize - 1);
      }

      return position;
    },
    findMovingPosition: function() {
      console.log('Implement me !');
      return _.random(GAME.windmill.boardSize - 1);
    },
    findFlyingPosition: function() {
      console.log('Implement me !');
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