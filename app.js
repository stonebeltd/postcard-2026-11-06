const VERTICAL_CLIP = "loop-vertical.mp4?v=2";
const HORIZONTAL_CLIP = "loop-horizontal.mp4?v=2";
const TEXT_SPEED = 40;
const RING = 2 * Math.PI * 26;

const postcard = document.getElementById("postcard");
const video = document.getElementById("bg");
const soundtrack = document.getElementById("soundtrack");
const flow = document.getElementById("flow");
const openBtn = document.getElementById("open");
const loader = document.getElementById("loader");
const loaderBar = document.getElementById("loaderBar");
const desktopQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 800px)");

let hasRevealed = false;
let activeClip = "";

function setProgress(amount) {
  const value = Math.max(0, Math.min(1, amount));
  if (!loaderBar) return;
  if (value > 0.02) loader.classList.add("is-determinate");
  loaderBar.style.strokeDasharray = String(RING);
  loaderBar.style.strokeDashoffset = String(RING * (1 - value));
}

function revealPostcard() {
  if (hasRevealed) return;
  hasRevealed = true;
  setProgress(1);
  postcard.classList.remove("is-loading");
}

function clipForViewport() {
  return desktopQuery.matches ? HORIZONTAL_CLIP : VERTICAL_CLIP;
}

function bufferCoverage() {
  if (!video.duration || !isFinite(video.duration) || video.buffered.length === 0) {
    return 0;
  }
  return Math.min(1, video.buffered.end(video.buffered.length - 1) / video.duration);
}

function ensureVideoLooping() {
  if (!video.paused) return;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  const play = video.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {});
  }
}

function applyBackgroundClip() {
  const next = clipForViewport();
  if (activeClip === next) {
    ensureVideoLooping();
    return;
  }
  activeClip = next;
  hasRevealed = false;
  postcard.classList.add("is-loading");
  setProgress(0);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.src = next;
}

function startLetter() {
  const loopHeight = Math.max(flow.scrollHeight / 2, 1);
  flow.style.setProperty("--letter-duration", `${loopHeight / TEXT_SPEED}s`);
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
  startLetter();
  ensureVideoLooping();
  startSoundtrack();
}

function prepareTextLoop() {
  if (flow.dataset.cloned === "true") return;
  flow.innerHTML += flow.innerHTML;
  flow.dataset.cloned = "true";
}

prepareTextLoop();
applyBackgroundClip();

video.addEventListener("progress", () => {
  if (!hasRevealed) setProgress(bufferCoverage());
});
video.addEventListener("canplay", ensureVideoLooping);
video.addEventListener("playing", revealPostcard);

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
