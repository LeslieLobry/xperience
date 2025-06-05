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

  // 👉 Rejoindre une conversation privée ou globale
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`🟢 Client ${socket.id} a rejoint la conversation ${conversationId}`);
  });

  // 📩 Gestion des messages privés
  socket.on("send_message", (message) => {
    // message.conversationId = id numérique
    io.to(`conversation_${message.conversationId}`).emit("message_received", message);
    io.emit("notification", { userId: message.auteurId }); // notification globale
  });

  // 🌍 Gestion du chat global
  socket.on("send_global_message", async (message) => {
    try {
      const saved = await prisma.globalMessage.create({
        data: {
          contenu: message.contenu,
          auteurId: message.auteurId,
        },
        include: {
          auteur: {
            select: { id: true, pseudo: true },
          },
        },
      });

      // Renvoi à l'émetteur et aux autres (pas de doublon côté front)
      socket.emit("receive_global_message", saved);
      socket.broadcast.emit("receive_global_message", saved);
    } catch (err) {
      console.error("❌ Erreur lors de l'enregistrement du message global :", err);
    }
  });

  // 🔄 Met à jour les messages non lus
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
