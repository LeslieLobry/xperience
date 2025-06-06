import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Nouveau client connecté :", socket.id);

  // 👉 Rejoindre une conversation privée
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`🟢 Client ${socket.id} a rejoint la conversation ${conversationId}`);
  });

  // 📩 Message texte/image
  socket.on("send_message", (message) => {
    io.to(`conversation_${message.conversationId}`).emit("message_received", message);
    io.emit("notification", { userId: message.auteurId }); // notification globale
  });

  // 🌍 Chat global
  socket.on("send_global_message", async (message) => {
    try {
      const saved = await prisma.globalMessage.create({
        data: {
          contenu: message.contenu,
          auteurId: message.auteurId,
        },
        include: {
          auteur: { select: { id: true, pseudo: true } },
        },
      });

      socket.emit("receive_global_message", saved);
      socket.broadcast.emit("receive_global_message", saved);
    } catch (err) {
      console.error("❌ Erreur message global :", err);
    }
  });

  // 🔄 Rafraîchir les messages non lus
  socket.on("refresh_unread", ({ userId }) => {
    io.emit("refresh_unread", { userId });
  });

  // 📞 WebRTC Signaling
  socket.on("webrtc_offer", ({ roomId, offer }) => {
    socket.to(`conversation_${roomId}`).emit("webrtc_offer", offer);
  });

  socket.on("webrtc_answer", ({ roomId, answer }) => {
    socket.to(`conversation_${roomId}`).emit("webrtc_answer", answer);
  });

  socket.on("webrtc_ice_candidate", ({ roomId, candidate }) => {
    socket.to(`conversation_${roomId}`).emit("webrtc_ice_candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client déconnecté :", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Socket.IO en ligne sur http://localhost:${PORT}`);
});
