const VIDEO_BASE =
  "https://raw.githubusercontent.com/stonebeltd/postcard-2026-11-06/video/";
const VERTICAL_CLIP = `${VIDEO_BASE}bg-vertical.mp4?v=3`;
const HORIZONTAL_CLIP = `${VIDEO_BASE}bg-horizontal.mp4?v=3`;
const VERTICAL_POSTER = "bg-vertical.jpg";
const HORIZONTAL_POSTER = "bg-horizontal.jpg";
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

const downloaded = Object.create(null);
let textOrigin = null;
let activeClip = "";
let hasRevealed = false;
let loadToken = 0;

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

function ensureVideoLooping() {
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  const play = video.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {});
  }
}

function downloadClip(url, onProgress) {
  if (downloaded[url]) return Promise.resolve(downloaded[url]);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = new Blob([xhr.response], { type: "video/mp4" });
        downloaded[url] = URL.createObjectURL(blob);
        resolve(downloaded[url]);
        return;
      }
      reject(new Error(String(xhr.status)));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send();
  });
}

function playClip(url) {
  const token = ++loadToken;
  setProgress(downloaded[url] ? 1 : 0);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.poster = url === HORIZONTAL_CLIP ? HORIZONTAL_POSTER : VERTICAL_POSTER;

  downloadClip(url, (amount) => {
    if (token === loadToken && !hasRevealed) setProgress(amount);
  })
    .then((blobUrl) => {
      if (token !== loadToken) return;
      video.src = blobUrl;
      ensureVideoLooping();
    })
    .catch(() => {
      if (token !== loadToken) return;
      video.src = url.split("?")[0];
      ensureVideoLooping();
    });
}

function applyBackgroundClip() {
  const next = clipForViewport();
  if (activeClip === next) {
    ensureVideoLooping();
    return;
  }
  activeClip = next;
  playClip(next);
  const other = next === HORIZONTAL_CLIP ? VERTICAL_CLIP : HORIZONTAL_CLIP;
  downloadClip(other);
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
  ensureVideoLooping();
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

window.setTimeout(revealPostcard, 90000);

video.addEventListener("loadeddata", ensureVideoLooping);
video.addEventListener("canplay", ensureVideoLooping);
video.addEventListener("playing", () => {
  video.removeAttribute("poster");
  revealPostcard();
});
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
