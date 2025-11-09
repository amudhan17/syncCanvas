// ---------- Setup ----------
const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const colorEl = document.getElementById("color");
const colorDisplay = document.getElementById("colorDisplay");
const sizeEl = document.getElementById("size");
const sizeValue = document.getElementById("sizeValue");
const eraserBtn = document.getElementById("eraser");
const penBtn = document.getElementById("penBtn");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const clearBtn = document.getElementById("clear");
const usersBtn = document.getElementById("usersBtn");
const userList = document.getElementById("userList");
const userListContent = document.getElementById("userListContent");
const closeUserList = document.getElementById("closeUserList");
const countEl = document.getElementById("count");

let myColor = "#ff4d4d";
let erasing = false;

// Initialize color display
colorDisplay.style.background = myColor;

// Update size value display
sizeEl.addEventListener("input", () => {
  sizeValue.textContent = sizeEl.value;
});

// Color picker
colorDisplay.addEventListener("click", () => colorEl.click());
colorEl.addEventListener("input", () => {
  myColor = colorEl.value;
  colorDisplay.style.background = myColor;
});

// Resize canvas
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  ctx.putImageData(img, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}
window.addEventListener("resize", resize);
resize();

// ---------- Local Drawing State ----------
let isDown = false;
let points = []; // current stroke points

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x, y };
}

function drawStroke(op) {
  ctx.save();
  if (op.eraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = `rgba(0,0,0,1)`;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = op.color || myColor;
  }
  ctx.lineWidth = op.width;
  ctx.beginPath();
  const pts = op.points;
  if (!pts.length) { ctx.restore(); return; }
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function replay(allOps) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const op of allOps) drawStroke(op);
}

// ---------- Mouse / touch events ----------
function start(e) {
  isDown = true;
  points = [getPos(e)];
  socket.emit("cursor", { ...points[0], isDrawing: true });
  e.preventDefault();
}

function move(e) {
  if (!isDown) {
    const p = getPos(e);
    socket.emit("cursor", { ...p, isDrawing: false });
    return;
  }
  const p = getPos(e);
  const prev = points[points.length - 1];
  // Ignore tiny jitter (improves line quality)
  if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.5) return;

  points.push(p);
  drawStroke({
    points: [prev, p],
    width: +sizeEl.value,
    color: erasing ? "#000" : colorEl.value,
    eraser: erasing
  });
  socket.emit("cursor", { ...p, isDrawing: true });
}

function end() {
  if (!isDown) return;
  isDown = false;
  if (points.length > 1) {
    socket.emit("stroke:commit", {
      points,
      width: +sizeEl.value,
      eraser: erasing
    });
  }
  points = [];
  socket.emit("cursor", { x: -9999, y: -9999, isDrawing: false });
}

canvas.addEventListener("mousedown", start);
canvas.addEventListener("mousemove", move);
window.addEventListener("mouseup", end);
canvas.addEventListener("touchstart", start, { passive: false });
canvas.addEventListener("touchmove", move, { passive: false });
window.addEventListener("touchend", end);

// ---------- Toolbar ----------
penBtn.addEventListener("click", () => {
  erasing = false;
  penBtn.classList.add("active");
  eraserBtn.classList.remove("active");
});

eraserBtn.addEventListener("click", () => {
  erasing = !erasing;
  eraserBtn.classList.toggle("active", erasing);
  penBtn.classList.toggle("active", !erasing);
});

undoBtn.addEventListener("click", () => socket.emit("undo"));
redoBtn.addEventListener("click", () => socket.emit("redo"));
clearBtn.addEventListener("click", () => {
  if (confirm("Clear the entire canvas? This affects all users.")) {
    socket.emit("clear");
  }
});

// User list toggle
usersBtn.addEventListener("click", () => {
  userList.style.display = userList.style.display === "none" ? "block" : "none";
});

closeUserList.addEventListener("click", () => {
  userList.style.display = "none";
});

// Close user list when clicking outside
document.addEventListener("click", (e) => {
  if (!usersBtn.contains(e.target) && !userList.contains(e.target)) {
    userList.style.display = "none";
  }
});

// ---------- Live Cursors ----------
const cursors = new Map(); // id -> {el, label}

function ensureCursor(id, color, name) {
  if (cursors.has(id)) return cursors.get(id).el;
  const el = document.createElement("div");
  el.className = "cursor";
  el.style.background = color || "#fff";
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = name || id.slice(0, 4);
  el.appendChild(label);
  document.body.appendChild(el);
  cursors.set(id, { el, label });
  return el;
}

function moveCursor({ id, x, y, color, name, isDrawing }) {
  const el = ensureCursor(id, color, name);
  el.style.left = `${x}px`;
  el.style.top = `${y + 54}px`; // account for header
  el.style.opacity = x < 0 ? "0" : "1";
}

// ---------- Sockets ----------
socket.on("connect", () => {
  showToast("Connected to server", "success");
});

socket.on("init", ({ ops }) => {
  replay(ops);
});

socket.on("op", (op) => {
  drawStroke(op);
});

socket.on("reset", (allOps) => {
  replay(allOps);
});

socket.on("cursor", moveCursor);

socket.on("users:list", (list) => {
  // Update count and sidebar
  countEl.textContent = list.length.toString();
  userListContent.innerHTML = "";
  
  for (const u of list) {
    // my color becomes assigned color after /init
    if (u.id === socket.id) colorEl.value = myColor = u.color;
    
    const row = document.createElement("div");
    row.className = "user";
    row.innerHTML = `
      <div class="dot" style="background:${u.color}"></div>
      <span>${u.name}</span>
      ${u.id === socket.id ? '<small style="color: var(--accent); margin-left: auto;">(You)</small>' : ''}
    `;
    userListContent.appendChild(row);
  }
  
  colorDisplay.style.background = myColor;
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "z") {
      e.preventDefault();
      socket.emit("undo");
    } else if (e.key === "y") {
      e.preventDefault();
      socket.emit("redo");
    }
  }
  
  // Toggle eraser with 'E' key
  if (e.key === "e" || e.key === "E") {
    eraserBtn.click();
  }
});

// Toast notification system
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}