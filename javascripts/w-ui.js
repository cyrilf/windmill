/**
 * Define all the UIs interactions on the game
 * @type {Object}
 */
var UI = {
  init : function(boardSize) {
    this.size           = 600;
    var boardCanvas     = document.getElementById('board');
    var piecesCanvas    = document.getElementById('pieces');
    boardCanvas.width   = this.size;
    boardCanvas.height  = this.size;
    piecesCanvas.width  = this.size;
    piecesCanvas.height = this.size;

    this.Board.init(this.size, boardCanvas, boardSize);
    this.Pieces.init(this.size, piecesCanvas);
  },

  /**
   * Board functions
   */

  Board : {

    /**
     * init
     * @param  {int}             size        canvas size
     * @param  {documentElement} boardCanvas canvas element
     */
    init : function(size, boardCanvas, boardSize) {
      this.size      = size;
      this.ctx       = boardCanvas.getContext('2d');
      // this.ctx.clearRect(0, 0, this.size, this.size);
      this.boardSize = boardSize;
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
      ctx.fillStyle = COLORS.background;
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
      var pointsNbr    = this.boardSize; // nbr point to draw
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
      ctx.fillStyle = COLORS.points;
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
      ctx.strokeStyle = COLORS.lines;
      ctx.beginPath();
      ctx.moveTo(beginPoint.x, beginPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.closePath();
    }
  },

  Pieces: {
    /**
     * init
     * @param  {documentElement} piecesCanvas canvas element
     */
    init : function(size, piecesCanvas) {
      this.size         = size;
      this.piecesCanvas = piecesCanvas;
      this.ctx          = piecesCanvas.getContext('2d');
      // this.ctx.clearRect(0, 0, this.size, this.size);
      this.radius       = 17;
    },

    /**
     * drawPiece
     * @param  {Object} position  position where to draw the piece
     */
    drawPiece : function(position, currentPlayerMarker) {
      var ctx = this.ctx;

      var pointPosition = UI.Board.points[position];
      var piece = new Piece(pointPosition.x, pointPosition.y, currentPlayerMarker);

      ctx.beginPath();
      ctx.arc(piece.x, piece.y, this.radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = (piece.marker === true) ? COLORS.player1 : COLORS.player2;
      ctx.fill();
      ctx.closePath();
    },

    /**
     * isPieceSelected check if a point is selected and return it
     * else return null
     * @param  {Object}  position the click position
     * @return {Int}     return the position selected or undefined
     */
    isPieceSelected : function(position) {
      var xRange, yRange;
      var radius = this.radius;
      var indexFound;

      _.each(UI.Board.points, function(point, index) {
        if(!indexFound) {
          xRange = (position.offsetX >= (point.x - radius)) && (position.offsetX <= (point.x + radius));
          yRange = (position.offsetY >= (point.y - radius)) && (position.offsetY <= (point.y + radius));

          if(xRange && yRange) {
            indexFound = index;
          }
        }
      });

      return indexFound;
    },

    selectPiece : function(position) {
      var ctx = this.ctx;
      var pointPosition = UI.Board.points[position];

      ctx.beginPath();
      ctx.arc(pointPosition.x, pointPosition.y, this.radius, 0, 2 * Math.PI, false);
      ctx.lineWidth   = 3;
      ctx.strokeStyle = COLORS.selectedPiece;
      ctx.stroke();
      ctx.closePath();
    },

    unselectPiece : function(position, currentPlayerMarker) {
      var pointPosition = UI.Board.points[position];
      this.clearPiece(pointPosition, 19);
      this.drawPiece(position, currentPlayerMarker);
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
    clearPiece : function(piece, radius) {
      radius = radius || this.radius || 17;
      this.ctx.clearRect(piece.x - radius, piece.y - radius,
                         radius * 2, radius * 2);
    }
  }
};