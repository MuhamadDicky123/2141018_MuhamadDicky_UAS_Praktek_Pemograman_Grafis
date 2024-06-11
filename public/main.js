// Mendapatkan elemen canvas dan konteks WebGL
var canvas = document.getElementById("canvas");
var gl = canvas.getContext("webgl");

// Cek apakah browser mendukung WebGL
if (!gl) {
  console.log("Browser tidak mendukung WebGL");
} else {
  console.log("Browser mendukung WebGL.");
}

// Menetapkan ukuran canvas
const canvasWidth = 650;
const canvasHeight = 650;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Menetapkan viewport WebGL
gl.viewport(0, 0, canvas.width, canvas.height);

// Membersihkan canvas dengan warna tertentu
gl.clearColor(0.4343, 0.2422, 0.3343, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Source code untuk vertex shader
var vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    
    void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

// Source code untuk fragment shader
var fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() { 
        gl_FragColor = u_color;
    }
`;

// Membuat vertex shader
var vShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vShader, vertexShaderSource);
gl.compileShader(vShader);

// Membuat fragment shader
var fShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fShader, fragmentShaderSource);
gl.compileShader(fShader);

// Membuat program shader
var shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vShader);
gl.attachShader(shaderProgram, fShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

// Mendapatkan lokasi variabel untuk resolusi dan warna
var resolutionLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
gl.uniform2f(resolutionLocation, canvasWidth, canvasHeight);
var colorLocation = gl.getUniformLocation(shaderProgram, "u_color");

// Fungsi untuk membuat buffer
function createBuffer(vertices) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  return buffer;
}

// Fungsi untuk menggambar objek
function drawObject(buffer, color, vertexCount) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  var positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4fv(colorLocation, color);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

// Fungsi untuk membuat buffer segitiga
function createTriangleBuffer(x1, y1, x2, y2, x3, y3) {
  var vertices = [x1, y1, x2, y2, x3, y3];
  return createBuffer(vertices);
}

// Data untuk balok
var brickWidth = 60;
var brickHeight = 20;
var bricks = [];
var rows = 5;
var cols = 10;
var brickBuffer;

for (var row = 0; row < rows; row++) {
  for (var col = 0; col < cols; col++) {
    var x = col * (brickWidth + 10) + 35;
    var y = row * (brickHeight + 10) + 30;
    var brick = {
      x: x,
      y: y,
      width: brickWidth,
      height: brickHeight,
      buffer: createBuffer([
        x,
        y,
        x + brickWidth,
        y,
        x,
        y + brickHeight,
        x,
        y + brickHeight,
        x + brickWidth,
        y,
        x + brickWidth,
        y + brickHeight,
      ]),
    };
    bricks.push(brick);
  }
}

// Data untuk pemukul
var paddleWidth = 100;
var paddleHeight = 20;
var paddleX = (canvasWidth - paddleWidth) / 2;
var paddleBuffer = createBuffer([
  paddleX,
  canvasHeight - paddleHeight,
  paddleX + paddleWidth,
  canvasHeight - paddleHeight,
  paddleX,
  canvasHeight,
  paddleX,
  canvasHeight,
  paddleX + paddleWidth,
  canvasHeight - paddleHeight,
  paddleX + paddleWidth,
  canvasHeight,
]);

// Data untuk bola
var ballRadius = 10;
var ballX = canvasWidth / 2;
var ballY = canvasHeight - paddleHeight - ballRadius;
var ballSpeedX = 2;
var ballSpeedY = -2;
var ballBuffer;

function createBallBuffer(x, y, radius) {
  var vertices = [];
  for (var i = 0; i <= 360; i += 10) {
    var angle = (i * Math.PI) / 180;
    vertices.push(x, y);
    vertices.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    vertices.push(
      x + Math.cos(angle + (10 * Math.PI) / 180) * radius,
      y + Math.sin(angle + (10 * Math.PI) / 180) * radius
    );
  }
  return createBuffer(vertices);
}
ballBuffer = createBallBuffer(ballX, ballY, ballRadius);

// Fungsi untuk update posisi bola dan deteksi tabrakan
function updateBall() {
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Deteksi tabrakan dengan dinding
  if (ballX < ballRadius || ballX > canvasWidth - ballRadius) {
    ballSpeedX = -ballSpeedX;
  }
  if (ballY < ballRadius) {
    ballSpeedY = -ballSpeedY;
  }

  // Deteksi tabrakan dengan pemukul
  if (
    ballY > canvasHeight - paddleHeight - ballRadius &&
    ballX > paddleX &&
    ballX < paddleX + paddleWidth
  ) {
    ballSpeedY = -ballSpeedY;
  }

  // Deteksi tabrakan dengan balok
  for (var i = 0; i < bricks.length; i++) {
    var brick = bricks[i];
    if (
      ballX > brick.x &&
      ballX < brick.x + brick.width &&
      ballY > brick.y &&
      ballY < brick.y + brick.height
    ) {
      ballSpeedY = -ballSpeedY;
      bricks.splice(i, 1); // Hapus balok yang terkena
      break;
    }
  }

  // Reset permainan jika bola jatuh ke bawah
  if (ballY > canvasHeight) {
    gameOver();
  }

  // Perbarui buffer bola
  ballBuffer = createBallBuffer(ballX, ballY, ballRadius);
}

// Fungsi untuk menggambar semua objek
function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Gambar balok
  bricks.forEach(function (brick) {
    drawObject(brick.buffer, [0.8, 0.0, 0.0, 1.0], 6);
  });

  // Gambar pemukul
  paddleBuffer = createBuffer([
    paddleX,
    canvasHeight - paddleHeight,
    paddleX + paddleWidth,
    canvasHeight - paddleHeight,
    paddleX,
    canvasHeight,
    paddleX,
    canvasHeight,
    paddleX + paddleWidth,
    canvasHeight - paddleHeight,
    paddleX + paddleWidth,
    canvasHeight,
  ]);
  drawObject(paddleBuffer, [0.0, 0.0, 0.8, 1.0], 6);

  // Gambar bola
  drawObject(ballBuffer, [0.0, 1.0, 0.0, 1.0], 108);
}

// Fungsi animasi
function animate() {
  updateBall();
  drawScene();
  requestAnimationFrame(animate);
}

// Kontrol pemukul menggunakan keyboard
document.addEventListener("keydown", function (event) {
  if (event.key === "ArrowLeft") {
    paddleX -= 10;
  } else if (event.key === "ArrowRight") {
    paddleX += 10;
  }

  // Batasi pergerakan pemukul dalam area canvas
  if (paddleX < 0) {
    paddleX = 0;
  }
  if (paddleX + paddleWidth > canvasWidth) {
    paddleX = canvasWidth - paddleWidth;
  }
});

// Fungsi untuk menampilkan pesan game over dan mereset permainan
function gameOver() {
  alert("Game Over!");
  resetGame();
}

// Fungsi untuk mereset permainan
function resetGame() {
  // Reset posisi pemukul
  paddleX = (canvasWidth - paddleWidth) / 2;

  // Reset posisi dan kecepatan bola
  ballX = canvasWidth / 2;
  ballY = canvasHeight - paddleHeight - ballRadius;
  ballSpeedX = 2;
  ballSpeedY = -2;

  // Reset balok
  bricks = [];
  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var x = col * (brickWidth + 10) + 35;
      var y = row * (brickHeight + 10) + 30;
      var brick = {
        x: x,
        y: y,
        width: brickWidth,
        height: brickHeight,
        buffer: createBuffer([
          x,
          y,
          x + brickWidth,
          y,
          x,
          y + brickHeight,
          x,
          y + brickHeight,
          x + brickWidth,
          y,
          x + brickWidth,
          y + brickHeight,
        ]),
      };
      bricks.push(brick);
    }
  }
}

// Memulai animasi
animate();
