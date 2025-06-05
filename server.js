// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // adapte si ton front tourne ailleurs
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Nouveau client connecté :", socket.id);

  // Rooms pour conversations privées
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`🟢 Client ${socket.id} a rejoint la conversation ${conversationId}`);
  });

  socket.on("send_message", (message) => {
    io.to(`conversation_${message.conversationId}`).emit("message_received", message);
    io.emit("notification", { userId: message.auteurId });
  });

  // Event pour chat global
  socket.on("send_global_message", (message) => {
    // Ici tu peux sauvegarder en base aussi
    io.emit("receive_global_message", message);
  });

  socket.on("refresh_unread", ({ userId }) => {
    io.emit("refresh_unread", { userId });
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client déconnecté :", socket.id);
  });
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on http://localhost:${PORT}`);
});
