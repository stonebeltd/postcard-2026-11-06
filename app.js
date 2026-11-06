const VIDEO_BASE =
  "https://raw.githubusercontent.com/stonebeltd/postcard-2026-11-06/video/";
const VERTICAL_CLIP = `${VIDEO_BASE}vertical/index.m3u8`;
const HORIZONTAL_CLIP = `${VIDEO_BASE}horizontal/index.m3u8`;
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

let textOrigin = null;
let hlsPlayer = null;
let activeClip = "";
let hasRevealed = false;
let expectedFrags = 0;
let loadedFrags = 0;

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
  if (hlsPlayer) hlsPlayer.nextLevel = -1;
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

function maybeRevealFromBuffer() {
  const coverage = bufferCoverage();
  if (coverage > 0) setProgress(Math.max(coverage, loadedFrags && expectedFrags ? loadedFrags / expectedFrags : 0));
  if (coverage >= 0.97) revealPostcard();
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

function playlistUrl(masterUrl, name) {
  return new URL(name, masterUrl).href;
}

function tsUrls(mediaPlaylist, mediaUrl) {
  return mediaPlaylist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => new URL(line, mediaUrl).href);
}

async function prefetchClip(masterUrl) {
  try {
    const master = await fetch(masterUrl).then((res) => res.text());
    const mediaRel = master.split(/\r?\n/).find((line) => line.trim().endsWith("720/index.m3u8")) || "720/index.m3u8";
    const mediaUrl = playlistUrl(masterUrl, mediaRel.trim());
    const media = await fetch(mediaUrl).then((res) => res.text());
    const parts = tsUrls(media, mediaUrl);
    await Promise.all(
      parts.map((url) =>
        fetch(url, { mode: "cors", credentials: "omit" }).then((res) => res.blob())
      )
    );
  } catch (err) {
    // Keep the visible clip loading even if the other orientation fails.
  }
}

function playStream(url) {
  destroyHls();
  expectedFrags = 0;
  loadedFrags = 0;
  setProgress(0);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  if (window.Hls && Hls.isSupported()) {
    hlsPlayer = new Hls({
      capLevelToPlayerSize: true,
      startLevel: 0,
      autoLevelEnabled: false,
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      maxBufferSize: 80 * 1000 * 1000,
    });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(video);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, ensureVideoLooping);
    hlsPlayer.on(Hls.Events.LEVEL_LOADED, (_, data) => {
      if (!expectedFrags && data.details && data.details.fragments) {
        expectedFrags = data.details.fragments.length;
      }
    });
    hlsPlayer.on(Hls.Events.FRAG_LOADED, () => {
      if (hasRevealed) return;
      loadedFrags += 1;
      if (expectedFrags) setProgress(loadedFrags / expectedFrags);
      if (expectedFrags && loadedFrags >= expectedFrags) revealPostcard();
    });
    hlsPlayer.on(Hls.Events.ERROR, () => ensureVideoLooping());
    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    ensureVideoLooping();
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
  const other = next === HORIZONTAL_CLIP ? VERTICAL_CLIP : HORIZONTAL_CLIP;
  prefetchClip(other);
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

video.addEventListener("progress", maybeRevealFromBuffer);
video.addEventListener("canplaythrough", maybeRevealFromBuffer);
window.setTimeout(revealPostcard, 45000);

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
