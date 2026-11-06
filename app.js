const VERTICAL_CLIP = "bg-vertical.mp4";
const HORIZONTAL_CLIP = "bg-horizontal.mp4";
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

function clipForViewport() {
  return desktopQuery.matches ? HORIZONTAL_CLIP : VERTICAL_CLIP;
}

function currentClip() {
  try {
    return decodeURIComponent(new URL(video.currentSrc || video.src, location.href).pathname.split("/").pop());
  } catch {
    return "";
  }
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

function applyBackgroundClip() {
  const next = clipForViewport();
  if (currentClip() === next) {
    ensureVideoLooping();
    return;
  }
  const keepTime = video.currentTime;
  video.poster = next === HORIZONTAL_CLIP ? HORIZONTAL_POSTER : VERTICAL_POSTER;
  video.src = next;
  video.loop = true;
  video.muted = true;
  video.addEventListener(
    "loadedmetadata",
    () => {
      if (keepTime && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = keepTime % video.duration;
      }
    },
    { once: true }
  );
  video.load();
  ensureVideoLooping();
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
