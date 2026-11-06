const VERTICAL_FRAMES = 24;
const HORIZONTAL_FRAMES = 24;
const FRAME_MS = 125;
const TEXT_SPEED = 40;
const RING = 2 * Math.PI * 26;

const postcard = document.getElementById("postcard");
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: false });
const soundtrack = document.getElementById("soundtrack");
const flow = document.getElementById("flow");
const openBtn = document.getElementById("open");
const loader = document.getElementById("loader");
const loaderBar = document.getElementById("loaderBar");
const desktopQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 800px)");

const cache = Object.create(null);
let textOrigin = null;
let hasRevealed = false;
let activeKind = "";
let frameIndex = 0;
let lastFrameAt = 0;
let playing = null;

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

function kindForViewport() {
  return desktopQuery.matches ? "horizontal" : "vertical";
}

function frameUrls(kind) {
  const count = kind === "horizontal" ? HORIZONTAL_FRAMES : VERTICAL_FRAMES;
  const urls = [];
  for (let i = 1; i <= count; i += 1) {
    const name = String(i).padStart(2, "0");
    urls.push(`frames/${kind}/${name}.webp?v=2`);
  }
  return urls;
}

function loadImages(urls, onProgress) {
  let done = 0;
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            done += 1;
            if (onProgress) onProgress(done / urls.length);
            resolve(image);
          };
          image.onerror = () => reject(new Error(url));
          image.src = url;
        })
    )
  );
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function drawCover(image) {
  const cw = canvas.width;
  const ch = canvas.height;
  if (!cw || !ch || !image.width) return;
  const imageRatio = image.width / image.height;
  const canvasRatio = cw / ch;
  let dw;
  let dh;
  if (imageRatio > canvasRatio) {
    dh = ch;
    dw = ch * imageRatio;
  } else {
    dw = cw;
    dh = cw / imageRatio;
  }
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function tick(now) {
  if (!playing || !playing.length) {
    requestAnimationFrame(tick);
    return;
  }
  if (now - lastFrameAt >= FRAME_MS) {
    lastFrameAt = now;
    frameIndex = (frameIndex + 1) % playing.length;
    drawCover(playing[frameIndex]);
  }
  requestAnimationFrame(tick);
}

async function applyBackground() {
  const kind = kindForViewport();
  if (kind === activeKind && playing) return;
  activeKind = kind;
  setProgress(cache[kind] ? 1 : 0);
  try {
    if (!cache[kind]) {
      cache[kind] = await loadImages(frameUrls(kind), setProgress);
    }
    fitCanvas();
    playing = cache[kind];
    frameIndex = 0;
    lastFrameAt = 0;
    drawCover(playing[0]);
    revealPostcard();
  } catch (err) {
    revealPostcard();
  }
  const other = kind === "horizontal" ? "vertical" : "horizontal";
  if (!cache[other]) {
    loadImages(frameUrls(other)).then((images) => {
      cache[other] = images;
    });
  }
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
fitCanvas();
applyBackground();
requestAnimationFrame(tick);
requestAnimationFrame(moveText);

window.addEventListener("resize", () => {
  fitCanvas();
  if (playing && playing[frameIndex]) drawCover(playing[frameIndex]);
});

if (typeof desktopQuery.addEventListener === "function") {
  desktopQuery.addEventListener("change", applyBackground);
} else if (typeof desktopQuery.addListener === "function") {
  desktopQuery.addListener(applyBackground);
}

openBtn.addEventListener("click", openCard);
openBtn.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCard();
  }
});
