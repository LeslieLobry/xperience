"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";

let socket;
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); // { offer, type }

  useEffect(() => {
    socket = io("http://localhost:4000");
    if (conversationId) {
      socket.emit("join_conversation", conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !utilisateur) return;

    fetch(`/api/conversations/${conversationId}/mark-as-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: utilisateur.id }),
    })
      .then(() => {
        socket.emit("refresh_unread", { userId: utilisateur.id });
      })
      .catch((err) => console.error("Erreur mark-as-read :", err));

    fetch(`/api/messages?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        scrollToBottom();
      })
      .catch((err) => console.error("Erreur fetch messages :", err));

    socket.on("message_received", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    });

    socket.on("webrtc_offer", ({ offer, callType }) => {
      setIncomingCall({ offer, callType });
    });

    socket.on("webrtc_answer", async (answer) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc_ice_candidate", (candidate) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.off("message_received");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
    };
  }, [conversationId, utilisateur]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleEnvoyer = async (e) => {
    e.preventDefault();
    if (!conversationId || !utilisateur) return;

    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        const nouveauMsg = {
          conversationId,
          auteurId: utilisateur.id,
          contenu: null,
          imageUrl: base64,
          videoUrl: null,
          type: "IMAGE",
        };

        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nouveauMsg),
        });
        const data = await res.json();

        socket.emit("send_message", data.message);
        setImageFile(null);
      };
      reader.readAsDataURL(imageFile);
      return;
    }

    if (nouveauTexte.trim() === "") return;

    const nouveauMsg = {
      conversationId,
      auteurId: utilisateur.id,
      contenu: nouveauTexte.trim(),
      imageUrl: null,
      videoUrl: null,
      type: "TEXTE",
    };

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauMsg),
    });
    const data = await res.json();

    socket.emit("send_message", data.message);
    setNouveauTexte("");
  };

  const startCall = async (type) => {
    const constraints = {
      audio: true,
      video: type === "video",
    };
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(localStream);
    if (type === "video" && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice_candidate", {
          roomId: conversationId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc_offer", {
      roomId: conversationId,
      offer,
      callType: type,
    });

    setInCall(true);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { offer, callType } = incomingCall;
    setIncomingCall(null);

    const constraints = {
      audio: true,
      video: callType === "video",
    };
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(localStream);
    if (callType === "video" && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice_candidate", {
          roomId: conversationId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc_answer", {
      roomId: conversationId,
      answer,
    });

    setInCall(true);
  };

  const refuseCall = () => {
    setIncomingCall(null);
  };

  const handleHangup = () => {
    stream?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setStream(null);
    setInCall(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  return (
    <div className="chatbox-container">
      <ChatHeader
        nom="Conversation"
        onClose={handleHangup}
        onCallAudio={() => startCall("audio")}
        onCallVideo={() => startCall("video")}
      />

      {incomingCall && (
        <div className="incoming-call">
          <p>📞 Appel {incomingCall.callType} entrant…</p>
          <button onClick={acceptCall}>Accepter</button>
          <button onClick={refuseCall}>Refuser</button>
        </div>
      )}

      {inCall && (
        <>
          <video ref={localVideoRef} autoPlay muted playsInline className="mini-webcam" />
          <video ref={remoteVideoRef} autoPlay playsInline className="mini-webcam remote" />
          <button className="hangup-button" onClick={handleHangup}>Raccrocher</button>
        </>
      )}

      <div className="chat-messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} utilisateur={utilisateur} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleEnvoyer}>
        <input
          type="text"
          placeholder="\u00c9crire un message\u2026"
          value={nouveauTexte}
          onChange={(e) => setNouveauTexte(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}