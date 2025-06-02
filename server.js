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

  // Rejoindre une room pour une conversation donnée
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`🟢 Client ${socket.id} a rejoint la conversation ${conversationId}`);
  });

  // Lorsqu’un client envoie un message
  socket.on("send_message", (message) => {
    console.log("📨 Nouveau message reçu :", message);

    // 1) On broadcast le message à tous les membres de la conversation
    io.to(`conversation_${message.conversationId}`).emit("message_received", message);

    // 2) On émet aussi un event "notification" pour que la bulle de tous 
    //    les clients fasse son fetch("/api/unread-messages-count")
    io.emit("notification", { userId: message.auteurId });
  });

  // Nouvel événement : lorsqu’une conversation est marquée lue côté client
  socket.on("refresh_unread", ({ userId }) => {
    // On broadcast pour que ChatBubble.composant réagisse
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
