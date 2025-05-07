let images = [];
let imageIndex = 0;
let rects = [];
let imagePaths = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
let capture;
let mediaPipe = {
  holistic: null,
  landmarks: null
};

function preload() {
  for (let path of imagePaths) {
    images.push(loadImage(path));
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CORNER);
  noStroke();
  initRects();
  captureWebcam();
}

function initRects() {
  rects = [new ImgRect(0, 0, width, height)];
}

function draw() {
  background(255);

  let pointerX = width / 2;
  let pointerY = height / 2;

  if (mediaPipe.landmarks && mediaPipe.landmarks.faceLandmarks) {
    let nose = mediaPipe.landmarks.faceLandmarks[1]; // Nose tip
    pointerX = map(nose.x, 0, 1, width, 0);  // flip horizontally
    pointerY = map(nose.y, 0, 1, 0, height);
    drawNoseDebug(pointerX, pointerY);
  }

  let newRects = [];
  for (let i = rects.length - 1; i >= 0; i--) {
    if (rects[i].contains(pointerX, pointerY) && !rects[i].isTooSmall()) {
      let divided = rects[i].subdivide();
      newRects.push(...divided);
      rects.splice(i, 1);
    }
  }
  rects.push(...newRects);

  for (let r of rects) {
    r.display();
  }

  checkSubdivisionProgress();
}

function drawNoseDebug(x, y) {
  push();
  fill(255, 0, 0);
  noStroke();
  ellipse(x, y, 10, 10);
  pop();
}

function checkSubdivisionProgress() {
  if (rects.length >= 3000) {
    imageIndex = (imageIndex + 1) % images.length;
    initRects();
  }
}

function captureWebcam() {
  capture = createCapture(
    {
      audio: false,
      video: { facingMode: "user" },
    },
    function () {
      setCameraDimensions(capture);
    }
  );

  capture.elt.setAttribute("playsinline", "");
  capture.hide();

  mediaPipe.holistic = new Holistic({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
  });

  mediaPipe.holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  mediaPipe.holistic.onResults((results) => {
    mediaPipe.landmarks = results;
  });

  const camera = new Camera(capture.elt, {
    onFrame: async () => {
      await mediaPipe.holistic.send({ image: capture.elt });
    },
    width: 640,
    height: 480
  });

  camera.start();
}

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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setCameraDimensions(capture);
  initRects();
}

class ImgRect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.c = this.getAverageColor();
  }

  contains(px, py) {
    return px >= this.x && px < this.x + this.w &&
           py >= this.y && py < this.y + this.h;
  }

  isTooSmall() {
    return this.w < 4 || this.h < 4;
  }

  getAverageColor() {
    let img = images[imageIndex];
    let x1 = constrain(floor(map(this.x, 0, width, 0, img.width)), 0, img.width - 1);
    let y1 = constrain(floor(map(this.y, 0, height, 0, img.height)), 0, img.height - 1);
    let x2 = constrain(floor(map(this.x + this.w, 0, width, 0, img.width)), 0, img.width);
    let y2 = constrain(floor(map(this.y + this.h, 0, height, 0, img.height)), 0, img.height);

    let r = 0, g = 0, b = 0, count = 0;
    for (let x = x1; x < x2; x++) {
      for (let y = y1; y < y2; y++) {
        let c = img.get(x, y);
        r += c[0];
        g += c[1];
        b += c[2];
        count++;
      }
    }
    if (count === 0) return color(255);
    return color(r / count, g / count, b / count);
  }

  display() {
    fill(this.c);
    rect(this.x, this.y, this.w, this.h);
  }

  subdivide() {
    let rects = [];
    if (this.w > this.h) {
      rects.push(new ImgRect(this.x, this.y, this.w / 2, this.h));
      rects.push(new ImgRect(this.x + this.w / 2, this.y, this.w / 2, this.h));
    } else {
      rects.push(new ImgRect(this.x, this.y, this.w, this.h / 2));
      rects.push(new ImgRect(this.x, this.y + this.h / 2, this.w, this.h / 2));
    }
    return rects;
  }
}