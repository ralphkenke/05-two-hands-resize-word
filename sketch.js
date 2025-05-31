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
let ellipseSize = 20; // finger dot size

// words to display (extracted from your textonly.rtf)
let words = []; // loaded from textonly.txt

let wordTraces = [];
let currentWordIndex = 0;
let lastWordChangeTime = 0;

// Load font and words from file
function preload() {
  customFont = loadFont('fonts/GT-Standard-Mono-Extended-Bold-Trial.otf');
  words = loadStrings('textonly.txt'); // one word/phrase per line
}

/* - - Setup - - */
function setup() {
  createCanvas(windowWidth, windowHeight);
  captureWebcam(); // launch webcam

  // styling
  noStroke();
  textAlign(CENTER, CENTER);
  fill('yellow');
  textFont(customFont); // Set your custom font here
}

/* - - Draw - - */
function draw() {
  background(0);
  textFont(customFont); // Ensure font is always set

  // Draw webcam with blue tint
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
  for (let i = wordTraces.length - 1; i >= 0; i--) {
    let trace = wordTraces[i];
    let age = now - trace.startTime;
    if (age > 5000) {
      wordTraces.splice(i, 1);
      continue;
    }
    // Animate y position from startY to endY over 'duration'
    let t = constrain(age / trace.duration, 0, 1);
    let y = lerp(trace.startY, trace.endY, t);

    push();
    centerOurStuff();
    textSize(trace.size);
    let alpha = map(age, 0, 5000, 255, 0);
    fill(trace.color.levels[0], trace.color.levels[1], trace.color.levels[2], alpha);
    text(trace.word, trace.x, y);
    pop();
  }

  /* TRACKING */
  if (mediaPipe.landmarks && mediaPipe.landmarks[0] && mediaPipe.landmarks[1]) { // is at least one hand tracking ready?
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

    push();
    centerOurStuff();

    // draw fingers
    fill('white');
    ellipse(index1X, index1Y, ellipseSize, ellipseSize); // index finger
    ellipse(index2X, index2Y, ellipseSize, ellipseSize); // index finger

    // word speed calculation: closer = faster, farther = slower
    let speed = map(distance, 50, 300, 100, 1000); // milliseconds
    speed = constrain(speed, 100, 1000);

    if (millis() - lastWordChangeTime > speed) {
      currentWordIndex = (currentWordIndex + 1) % words.length;
      lastWordChangeTime = millis();

      let minSize = 40;
      let maxSize = 300;
      let wordSize = distance * 0.9;
      wordSize = constrain(wordSize, minSize, maxSize);
      let yellow = color(255, 255, 0);
      let green = color(0, 255, 0);
      let amt = map(wordSize, minSize, maxSize, 0, 1);
      let wordColor = lerpColor(yellow, green, amt);

      // Store trace for dropping animation
      wordTraces.push({
        word: words[currentWordIndex],
        x: centerX,
        startY: centerY,
        endY: capture.scaledHeight - 50, // 50px above bottom of webcam image
        size: wordSize,
        color: wordColor,
        startTime: millis(),
        duration: 2000 // ms to drop to bottom
      });
    }

    // set text size based on distance (like the letter 'A' before)
    let minSize = 40;
    let maxSize = 300;
    let wordSize = distance * 0.9;
    wordSize = constrain(wordSize, minSize, maxSize);
    let yellow = color(255, 255, 0);
    let green = color(0, 255, 0);
    let amt = map(wordSize, minSize, maxSize, 0, 1);
    let wordColor = lerpColor(yellow, green, amt);

    // draw the current word
    fill(wordColor);
    textSize(wordSize);
    text(words[currentWordIndex], centerX, centerY);

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
