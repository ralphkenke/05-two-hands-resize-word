/* - - MediaPipe Hands tracking - - */

/*
We have a total of 21 points per hand:
0 = wrist
4 = thumb tip
8 = index finger tip
20 = pinky tip
*/

/* - - Variables - - */

// webcam variables
let capture; // webcam
let captureEvent;

// styling
let ellipseSize = 0; // finger dot size

// words to display (extracted from your textonly.rtf)
let words = []; // loaded from textonly.txt

let wordTraces = [];
let currentWordIndex = 0;
let lastWordChangeTime = 0;

let fingersTouching = false; // Add this at the top with your variables
let customFont; // Add this at the top with your variables

// Load words and font from file
function preload() {
  words = loadStrings('textonly.txt'); // one word/phrase per line
  customFont = loadFont('fonts/FunnelDisplay-VariableFont_wght.ttf');
}

/* - - Setup - - */
function setup() {
  createCanvas(windowWidth, windowHeight);
  captureWebcam(); // launch webcam

  // styling
  noStroke();
  textAlign(CENTER, CENTER);
  fill('yellow');
  textFont(customFont); // Set the custom font
}

/* - - Draw - - */
function draw() {
  background(0);

  /* WEBCAM */
  push();
  centerOurStuff(); // center the webcam
  scale(-1, 1); // mirror webcam
  tint(0, 0, 255); // apply blue monochrome tint
  image(capture, -capture.scaledWidth, 0, capture.scaledWidth, capture.scaledHeight); // draw webcam  let words = [];
  
  noTint(); // reset tint for other drawings
  scale(-1, 1); // unset mirror
  pop();

  // Draw word traces (drop and fade)
  let now = millis();
  for (let i = movers.length - 1; i >= 0; i--) {
    let mover = movers[i];

    // Gravity
    let gravity = createVector(0, 0.2 * mover.mass);
    mover.applyForce(gravity);

    // Drag (simulate air resistance in lower half)
    if (mover.position.y > capture.scaledHeight / 2) {
      let c = 0.08; // drag coefficient
      let speed = mover.velocity.mag();
      let dragMagnitude = c * speed * speed;
      let drag = mover.velocity.copy().mult(-1).setMag(dragMagnitude);
      mover.applyForce(drag);
    }

    mover.update();
    mover.checkEdges();
    mover.display();

    if (mover.isDead()) {
      movers.splice(i, 1);
    }
  }

  /* TRACKING */
  if (mediaPipe.landmarks && mediaPipe.landmarks[0] && mediaPipe.landmarks[1]) {
    // index finger 1
    let index1X = map(mediaPipe.landmarks[0][8].x, 1, 0, 0, capture.scaledWidth);
    let index1Y = map(mediaPipe.landmarks[0][8].y, 0, 1, 0, capture.scaledHeight);

    // index finger 2
    let index2X = map(mediaPipe.landmarks[1][8].x, 1, 0, 0, capture.scaledWidth);
    let index2Y = map(mediaPipe.landmarks[1][8].y, 0, 1, 0, capture.scaledHeight);

    // center point between index1 and index2
    let centerX = (index1X + index2X) / 2;
    let centerY = (index1Y + index2Y) / 2;

    // distance between index1 and index2
    let distance = dist(index1X, index1Y, index2X, index2Y);

    // Threshold for "touching"
    let touchThreshold = 80;

    push();
    centerOurStuff();

    // draw fingers
    fill('white');
    ellipse(index1X, index1Y, ellipseSize, ellipseSize);
    ellipse(index2X, index2Y, ellipseSize, ellipseSize);

    // Only show word when fingers are touching
    if (distance < touchThreshold) {
      // Only advance word if just started touching
      if (!fingersTouching) {
        currentWordIndex = (currentWordIndex + 1) % words.length;
        lastWordChangeTime = millis();

        let minSize = 50;
        let maxSize = 200;
        let wordSize = map(centerY, 0, capture.scaledHeight, maxSize, minSize);
        wordSize = constrain(wordSize, minSize, maxSize);
        wordSize *= 0.5; // <-- Make the word 150% larger

        let green = color(0, 255, 0);
        let yellow = color(255, 255, 0);
        let amt = map(centerY, 0, capture.scaledHeight, 0, 1);
        let wordColor = lerpColor(green, yellow, amt);

        // Add a new falling word
        movers.push(new WordMover(words[currentWordIndex], centerX, centerY, wordSize, wordColor));
      }

      // --- NEW: Map centerY to size and color for live word ---
      let minSize = 10;
      let maxSize = 100;
      let wordSize = map(centerY, 0, capture.scaledHeight, maxSize, minSize);
      wordSize = constrain(wordSize, minSize, maxSize);
      wordSize *= 0.5; // <-- Make the word 150% larger

      let green = color(0, 255, 0);
      let yellow = color(255, 255, 0);
      let amt = map(centerY, 0, capture.scaledHeight, 0, 1);
      let wordColor = lerpColor(green, yellow, amt);

      // Map y to font weight (900 at top, 300 at bottom)
      let minWeight = 10;
      let maxWeight = 100;
      let weight = Math.round(map(centerY, 0, capture.scaledHeight, maxWeight, minWeight));
      fill(wordColor);
      push();
      centerOurStuff();
      drawingContext.font = `${weight} ${wordSize}px 'FunnelDisplay'`;
      text(words[currentWordIndex], centerX, centerY);
      pop();

      fingersTouching = true;
    } else {
      fingersTouching = false;
    }

    pop();
  }
}

/* - - Helper functions - - */

// function: launch webcam
function captureWebcam() {
  capture = createCapture(
    {
      audio: false,
      video: {
        facingMode: "user",
      },
    },
    function (e) {
      captureEvent = e;
      setCameraDimensions(capture);
      mediaPipe.predictWebcam(capture);
    }
  );
  capture.elt.setAttribute("playsinline", "");
  capture.hide();
}

// function: resize webcam depending on orientation
function setCameraDimensions(video) {
  const vidAspectRatio = video.width / video.height;
  const canvasAspectRatio = width / height;

  if (vidAspectRatio > canvasAspectRatio) {
    video.scaledHeight = height;
    video.scaledWidth = video.scaledHeight * vidAspectRatio;
  } else {
    video.scaledWidth = width;
    video.scaledHeight = video.scaledWidth / vidAspectRatio;
  }
}

// function: center our stuff
function centerOurStuff() {
  translate(width / 2 - capture.scaledWidth / 2, height / 2 - capture.scaledHeight / 2);
}

// function: window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setCameraDimensions(capture);
}

// --- Add this class at the top or after your helper functions ---
class WordMover {
  constructor(word, x, y, size, color) {
    this.word = word;
    this.position = createVector(x, y);
    this.velocity = createVector(0, 0);
    this.acceleration = createVector(0, 0);
    this.size = size;
    this.color = color;
    this.lifetime = 5000; // ms
    this.birth = millis();
    this.mass = map(size, 7, 100, 0.5, 3); // larger words fall heavier
  }

  applyForce(force) {
    let f = p5.Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  isDead() {
    return millis() - this.birth > this.lifetime;
  }

  display() {
    // Map y to font weight (900 at top, 300 at bottom)
    let minWeight = 300;
    let maxWeight = 900;
    let weight = Math.round(map(this.position.y, 0, capture.scaledHeight, maxWeight, minWeight));
    let alpha = map(millis() - this.birth, 0, this.lifetime, 255, 0);

    // Map y to color: green at top, yellow at bottom
    let green = color(0, 255, 0);
    let yellow = color(255, 255, 0);
    let amt = map(this.position.y, 0, capture.scaledHeight, 0, 1);
    let wordColor = lerpColor(green, yellow, amt);

    push();
    centerOurStuff();
    drawingContext.font = `${weight} ${this.size}px 'FunnelDisplay'`;
    fill(wordColor.levels[0], wordColor.levels[1], wordColor.levels[2], alpha);
    text(this.word, this.position.x, this.position.y);
    pop();
  }

  // Bounce at the bottom
  checkEdges() {
    let bottom = capture.scaledHeight - 50;
    if (this.position.y > bottom) {
      this.velocity.y *= -0.7;
      this.position.y = bottom;
    }
  }
}

// --- Replace your wordTraces array with movers ---
let movers = [];
