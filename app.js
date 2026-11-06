const VIDEO_BASE =
  "https://raw.githubusercontent.com/stonebeltd/postcard-2026-11-06/video/";
const VERTICAL_CLIP = `${VIDEO_BASE}vertical/index.m3u8`;
const HORIZONTAL_CLIP = `${VIDEO_BASE}horizontal/index.m3u8`;
const VERTICAL_POSTER = "bg-vertical.jpg";
const HORIZONTAL_POSTER = "bg-horizontal.jpg";
const TEXT_SPEED = 40;

const postcard = document.getElementById("postcard");
const video = document.getElementById("bg");
const soundtrack = document.getElementById("soundtrack");
const flow = document.getElementById("flow");
const openBtn = document.getElementById("open");
const desktopQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 800px)");

let textOrigin = null;
let hlsPlayer = null;
let activeClip = "";

function clipForViewport() {
  return desktopQuery.matches ? HORIZONTAL_CLIP : VERTICAL_CLIP;
}

function ensureVideoLooping() {
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  if (video.paused) {
    const play = video.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {});
    }
  }
}

function destroyHls() {
  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }
}

function playStream(url) {
  destroyHls();
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    ensureVideoLooping();
    return;
  }

  if (window.Hls && Hls.isSupported()) {
    hlsPlayer = new Hls({
      capLevelToPlayerSize: true,
      startLevel: 0,
      maxBufferLength: 12,
    });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(video);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, ensureVideoLooping);
    hlsPlayer.on(Hls.Events.ERROR, () => ensureVideoLooping());
    return;
  }

  video.src = url;
  ensureVideoLooping();
}

function applyBackgroundClip() {
  const next = clipForViewport();
  if (activeClip === next) {
    ensureVideoLooping();
    return;
  }
  activeClip = next;
  video.poster = next === HORIZONTAL_CLIP ? HORIZONTAL_POSTER : VERTICAL_POSTER;
  playStream(next);
}

function startSoundtrack() {
  soundtrack.loop = true;
  soundtrack.currentTime = 0;
  const play = soundtrack.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {});
  }
}

function openCard() {
  if (postcard.classList.contains("is-open")) return;
  postcard.classList.add("is-open");
  if (video.paused) ensureVideoLooping();
  startSoundtrack();
  if (textOrigin === null) textOrigin = performance.now();
}

function prepareTextLoop() {
  if (flow.dataset.cloned === "true") return;
  flow.innerHTML += flow.innerHTML;
  flow.dataset.cloned = "true";
}

function moveText(now) {
  if (textOrigin !== null) {
    const loopHeight = Math.max(flow.scrollHeight / 2, 1);
    const traveled = ((now - textOrigin) / 1000) * TEXT_SPEED;
    const y = traveled % loopHeight;
    flow.style.transform = `translate(-50%, ${-y}px)`;
  }
  requestAnimationFrame(moveText);
}

prepareTextLoop();
applyBackgroundClip();
requestAnimationFrame(moveText);

video.addEventListener("ended", () => {
  video.currentTime = 0;
  ensureVideoLooping();
});

if (typeof desktopQuery.addEventListener === "function") {
  desktopQuery.addEventListener("change", applyBackgroundClip);
} else if (typeof desktopQuery.addListener === "function") {
  desktopQuery.addListener(applyBackgroundClip);
}

openBtn.addEventListener("click", openCard);
openBtn.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCard();
  }
});
