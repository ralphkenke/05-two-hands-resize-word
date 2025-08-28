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
let capture; // our webcam
let captureEvent; // callback when webcam is ready

// styling
let ellipseSize = 20; // size of the ellipses

// words to display (extracted from your textonly.rtf)
let words = [
  "Tracking",
  "Non-Place",
  "immersive",
  "interactive",
  "projection",
  "installation",
  "supermodernity",
  "identity",
  "instantaneity",
  "social",
  "emotional",
  "technological",
  "fragmented",
  "existence",
  "computational",
  "movement-tracking",
  "reactive image"
];

// word state variables
let currentWordIndex = 0;
let lastWordChangeTime = 0;

let wordTraces = []; // stores traces of words
let latestFaceLandmarks = null; // <-- Set this from your MediaPipe callback

/* - - Setup - - */
function setup() {
  createCanvas(windowWidth, windowHeight);
  captureWebcam(); // launch webcam

  // styling
  noStroke();
  textAlign(CENTER, CENTER);
  fill('yellow');
}

/* - - Draw - - */
function draw() {
  background(0);

  // Draw webcam with blue tint
  push();
  centerOurStuff();
  scale(-1, 1);
  tint(0, 0, 255);
  image(capture, -capture.scaledWidth, 0, capture.scaledWidth, capture.scaledHeight);
  noTint();
  scale(-1, 1);
  pop();

  // Draw face mesh dots if face detected
  if (window.latestFaceLandmarks && window.latestFaceLandmarks.length > 0) {
    push();
    centerOurStuff();
    fill(255, 0, 0);
    noStroke();
    let landmarks = window.latestFaceLandmarks[0];
    for (let i = 0; i < landmarks.length; i++) {
      // Mirror the x coordinate to match mirrored webcam
      let x = (1 - landmarks[i].x) * capture.width;
      let y = landmarks[i].y * capture.height;
      ellipse(x, y, 6, 6);
    }
    pop();
  }

  // Draw word traces (words from the last 5 seconds)
  let now = millis();
  for (let i = wordTraces.length - 1; i >= 0; i--) {
    let trace = wordTraces[i];
    let age = now - trace.time;
    if (age > 5000) {
      wordTraces.splice(i, 1); // remove old traces
      continue;
    }
    push();
    centerOurStuff();
    textSize(trace.size);
    // Fade out over 5 seconds
    let alpha = map(age, 0, 5000, 255, 0);
    fill(trace.color.levels[0], trace.color.levels[1], trace.color.levels[2], alpha);
    text(trace.word, trace.x, trace.y);
    pop();
  }

  // If face detected, use mouth openness to control speed and size
  if (latestFaceLandmarks && latestFaceLandmarks.length > 0) {
    // MediaPipe Face Landmarker: upper lip = 13, lower lip = 14
    let upperLip = latestFaceLandmarks[0][13];
    let lowerLip = latestFaceLandmarks[0][14];

    // Convert normalized coords to pixels
    let mouthOpen = dist(
      upperLip.x * capture.width, upperLip.y * capture.height,
      lowerLip.x * capture.width, lowerLip.y * capture.height
    );

    // Map mouthOpen to word size and speed
    let minMouth = 10, maxMouth = 60;
    let minSize = 40, maxSize = 300;
    let wordSize = map(mouthOpen, minMouth, maxMouth, minSize, maxSize);
    wordSize = constrain(wordSize, minSize, maxSize);

    // Color: yellow (small) to green (large)
    let yellow = color(255, 255, 0);
    let green = color(0, 255, 0);
    let amt = map(wordSize, minSize, maxSize, 0, 1);
    let wordColor = lerpColor(yellow, green, amt);

    // Speed: wider mouth = faster
    let minSpeed = 100, maxSpeed = 1000;
    let speed = map(mouthOpen, minMouth, maxMouth, minSpeed, maxSpeed);
    speed = constrain(speed, minSpeed, maxSpeed);

    if (millis() - lastWordChangeTime > speed) {
      currentWordIndex = (currentWordIndex + 1) % words.length;
      lastWordChangeTime = millis();

      // Store trace
      wordTraces.push({
        word: words[currentWordIndex],
        x: 0,
        y: 0,
        size: wordSize,
        color: wordColor,
        time: millis()
      });
    }

    // Draw current word in center
    push();
    translate(width / 2, height / 2);
    fill(wordColor);
    textSize(wordSize);
    text(words[currentWordIndex], 0, 0);
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
      console.log(captureEvent.getTracks()[0].getSettings());
      capture.srcObject = e;
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
