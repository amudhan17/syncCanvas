import express from "express";
import http from "http";
import { Server } from "socket.io";
import open from "open";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("client"));

/** ---- In-memory state (simple & deterministic) ---- */
const palette = [
  "#ff4d4d","#ffd166","#06d6a0","#118ab2",
  "#e76f51","#b5179e","#43aa8b","#f72585",
  "#90be6d","#577590"
];

const users = new Map(); // id -> {id, name, color, lastSeen}
let nextColor = 0;

/** Each op is a stroke or eraser stroke.
 *  Clients replay ops in ascending ts to resolve overlaps (LWW).
 */
const ops = [];    // { id, userId, color, width, points:[{x,y}], eraser:boolean, ts:number }
const undone = []; // for global undo/redo

function broadcastUsers() {
  io.emit("users:list", Array.from(users.values()));
}

io.on("connection", (socket) => {
  // Assign user
  const color = palette[nextColor++ % palette.length];
  const name = `User-${String(Math.random()).slice(2,6)}`;
  users.set(socket.id, { id: socket.id, name, color, lastSeen: Date.now() });
  console.log("User connected:", socket.id);

  // Initial sync
  socket.emit("init", { ops });
  broadcastUsers();

  // Cursor indicators
  socket.on("cursor", (payload) => {
    const u = users.get(socket.id);
    if (!u) return;
    u.lastSeen = Date.now();
    // payload: {x,y,isDrawing}
    socket.broadcast.emit("cursor", {
      id: socket.id,
      name: u.name,
      color: u.color,
      ...payload
    });
  });

  // New stroke (batched points)
  socket.on("stroke:commit", (stroke) => {
    // stroke: {points, width, eraser}
    const u = users.get(socket.id);
    if (!u || !stroke?.points?.length) return;

    const op = {
      id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      userId: socket.id,
      color: u.color,
      width: stroke.width,
      eraser: !!stroke.eraser,
      points: stroke.points,
      ts: Date.now()
    };

    ops.push(op);
    undone.length = 0; // clear redo stack after new op
    io.emit("op", op); // broadcast the committed op
  });

  // Global undo: remove last op
  socket.on("undo", () => {
    if (!ops.length) return;
    const op = ops.pop();
    undone.push(op);
    io.emit("reset", ops);
  });

  // Global redo
  socket.on("redo", () => {
    if (!undone.length) return;
    const op = undone.pop();
    ops.push(op);
    io.emit("op", op);
  });

  // Clear canvas (admin-ish)
  socket.on("clear", () => {
    ops.length = 0;
    undone.length = 0;
    io.emit("reset", ops);
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    console.log("User disconnected:", socket.id);
    broadcastUsers();
  });
});

const PORT = 3000;
server.listen(PORT, async () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  try { await open(`http://localhost:${PORT}`); } catch {}
});
