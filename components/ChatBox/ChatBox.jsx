"use client";

import { useEffect, useState, useRef } from "react";
import socket from "../../lib/socket";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const pcRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (conversationId) {
      socket.emit("join_conversation", conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (inCall && stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [inCall, stream]);

  // Sonnerie appel entrant
  useEffect(() => {
    if (incomingCall && ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    } else if (!incomingCall && ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall]);

  // Timeout auto après 30s si pas répondu
  useEffect(() => {
    if (incomingCall) {
      callTimeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
      }, 30000);
    } else {
      clearTimeout(callTimeoutRef.current);
    }
  }, [incomingCall]);

  useEffect(() => {
    if (!conversationId || !utilisateur) return;

    fetch(`/api/conversations/${conversationId}/mark-as-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: utilisateur.id }),
    })
      .then(() => socket.emit("refresh_unread", { userId: utilisateur.id }))
      .catch(console.error);

    fetch(`/api/messages?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        scrollToBottom();
      })
      .catch(console.error);

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
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc_ice_candidate", (candidate) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("call_accepted", () => {
      setIncomingCall(null);
    });

    socket.on("call_hangup", () => {
      handleHangup();
    });

    return () => {
      socket.off("message_received");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("call_accepted");
      socket.off("call_hangup");
      clearTimeout(callTimeoutRef.current);
    };
  }, [conversationId, utilisateur]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleEnvoyer = async (e) => {
    e.preventDefault();
    if (!conversationId || !utilisateur) return;

    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            auteurId: utilisateur.id,
            contenu: null,
            imageUrl: base64,
            videoUrl: null,
            type: "IMAGE",
          }),
        });
        const data = await res.json();
        socket.emit("send_message", data.message);
        setImageFile(null);
      };
      reader.readAsDataURL(imageFile);
      return;
    }

    if (!nouveauTexte.trim()) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        auteurId: utilisateur.id,
        contenu: nouveauTexte.trim(),
        imageUrl: null,
        videoUrl: null,
        type: "TEXTE",
      }),
    });
    const data = await res.json();
    socket.emit("send_message", data.message);
    setNouveauTexte("");
  };

  const startCall = async (type) => {
    if (inCall) {
      alert("Vous êtes déjà en appel !");
      return;
    }

    const constraints = { audio: true, video: type === "video" };
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(localStream);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

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
    setIncomingCall(null);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { offer, callType } = incomingCall;
    setIncomingCall(null);

    const constraints = { audio: true, video: callType === "video" };
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(localStream);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

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

    socket.emit("call_accepted", { roomId: conversationId });

    setInCall(true);
  };

  const handleHangup = () => {
    stream?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setStream(null);
    setInCall(false);
    setIncomingCall(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // Notifier les autres participants
    socket.emit("call_hangup", { roomId: conversationId });
  };

  return (
    <div className="chatbox-container">
      <ChatHeader
        nom="Conversation"
        onCallAudio={() => startCall("audio")}
        onCallVideo={() => startCall("video")}
        onClose={handleHangup}
      />

      {incomingCall && (
        <div className="incoming-call">
          <p>📞 Appel {incomingCall.callType} entrant…</p>
          <button onClick={acceptCall}>Accepter</button>
          <button onClick={() => setIncomingCall(null)}>Refuser</button>
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
          placeholder="Écrire un message…"
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

      <audio ref={ringtoneRef} src="/sounds/ringtone.mp3" preload="auto" />
    </div>
  );
}
