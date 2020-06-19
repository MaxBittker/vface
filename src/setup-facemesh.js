let facemesh = require("@tensorflow-models/facemesh");
let handtrack = require("@tensorflow-models/handpose");

let tf = require("@tensorflow/tfjs-core");

let loader = document.getElementById("loading");
let model;
let video = null;
async function loadModel() {
  // Load the MediaPipe facemesh model.
  handModel = await handtrack.load();
  model = await facemesh.load({ maxFaces: 1 });
  loader.style = "display:none";
}
let keyPoints;
let handPoints;
let dirty = false;
async function predictionLoop() {
  if (!model || !video) {
    window.requestAnimationFrame(predictionLoop);

    return null;
  }

  // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
  // array of detected faces from the MediaPipe graph.
  let predictions = [];
  const hands = await handModel.estimateHands(video);
  if (hands.length == 0 || hands[0].handInViewConfidence < 0.9) {
    predictions = await model.estimateFaces(video);
    handPoints = null;
  } else {
    handPoints = hands[0].annotations;
    // console.log(hands);
    dirty = true;
  }
  // console.log(tf.backend());
  // console.log(model);
  // console.log(facemesh);
  if (predictions.length > 0) {
    for (let i = 0; i < predictions.length; i++) {
      keyPoints = predictions[i].annotations;
      dirty = true;
      // console.log(keyPoints);
      // keyPoints = predictions[i].scaledMesh;
    }
  }
  window.requestAnimationFrame(predictionLoop);
}
function getKeyPoints() {
  if (dirty) {
    dirty = false;
    return { keyPoints, handPoints };
  } else {
    // console.log("saved work");
    return false;
  }
}
loadModel();
function setupWebcam(options) {
  const regl = options.regl;

  function startup() {
    video = document.getElementById("video");
    let startbutton = document.getElementById("start");
    let paint = document.getElementById("paint");
    let target = document.getElementById("target");
    var trackingStarted = false;

    function tryGetUserMedia() {
      navigator.mediaDevices
        // .getDisplayMedia({
        .getUserMedia({
          video: true,
          audio: false
        })
        .then(gumSuccess)
        .catch(e => {
          console.log("initial gum failed");
        });
      // video.play();
      startbutton.hidden = true;
    }

    tryGetUserMedia();

    startbutton.onclick = function() {
      console.log("play!");
      tryGetUserMedia();
      // startVideo();
    };

    function gumSuccess(stream) {
      loader.innerText = "Loading Model...";
      if ("srcObject" in video) {
        video.srcObject = stream;
      } else {
        video.src = window.URL && window.URL.createObjectURL(stream);
      }
      video.onloadedmetadata = function() {
        console.log("metadata loaded");
        const webcam = regl.texture(video);

        const { videoWidth, videoHeight } = video;

        var w = videoWidth;
        var h = videoHeight;
        video.height = h;
        video.width = w;
        paint.height = h;
        paint.width = w;
        target.height = h;
        target.width = w;
        predictionLoop();

        regl.frame(() => webcam.subimage(video));
        options.done(webcam, {
          videoWidth,
          videoHeight,
          getKeyPoints
        });
      };
    }
    // function adjustVideoProportions() {
    //   // resize overlay and video if proportions of video are not 4:3
    //   // keep same height, just change width
    //   debugger
    //   var proportion = video.videoWidth/video.videoHeight;
    //   video_width = Math.round(video_height * proportion);
    //   video.width = video_width;
    // }
    video.onresize = function() {
      // adjustVideoProportions();
    };
    video.addEventListener(
      "canplay",
      function(ev) {
        video.play();
      },
      false
    );
  }

  window.onload = startup;
}

module.exports = { setupWebcam };
