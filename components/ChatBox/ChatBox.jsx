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
  const [interlocuteur, setInterlocuteur] = useState(null);
  const messagesEndRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const pcRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [waitingAnswer, setWaitingAnswer] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const textareaRef = useRef(null);
  const [isSending, setIsSending] = useState(false);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleChange = (e) => {
    setNouveauTexte(e.target.value);
    adjustTextareaHeight();
  };

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

  useEffect(() => {
    if (incomingCall && ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    } else if (!incomingCall && ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall]);

  useEffect(() => {
    if (incomingCall) {
      callTimeoutRef.current = setTimeout(() => {
        socket.emit("call_missed", {
          conversationId,
          de: interlocuteur?.id,
          type: incomingCall.callType,
        });
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

    fetch(`/api/conversations/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setInterlocuteur(data.interlocuteur);
      })
      .catch(console.error);

    socket.on("message_received", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    });

    socket.on("call_missed", ({ type, de }) => {
      const message = {
        id: Date.now(),
        auteurId: de,
        contenu: ` Appel ${type === "video" ? "vidéo" : "audio"} manqué.`,
        type: "TEXTE",
        system: true,
      };
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on("webrtc_offer", ({ offer, callType }) => {
      setIncomingCall({ offer, callType });
    });

    socket.on("webrtc_answer", async (answer) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc_ice_candidate", (candidate) => {
      if (pcRef.current?.remoteDescription) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("call_accepted", () => {
      setIncomingCall(null);
      setWaitingAnswer(false);
      setInCall(true);
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    });

    socket.on("call_declined", () => {
      setWaitingAnswer(false);
      setInCall(false);
      setStream(null);
      pcRef.current?.close();
      pcRef.current = null;
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;

      socket.emit("call_missed", {
        conversationId,
        de: utilisateur.id,
        type: incomingCall?.callType || "audio",
      });

      alert(" Appel refusé");
    });

    socket.on("call_hangup", () => {
      handleHangup();
    });

    return () => {
      socket.off("message_received");
      socket.off("call_missed");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("call_accepted");
      socket.off("call_declined");
      socket.off("call_hangup");
      clearTimeout(callTimeoutRef.current);
    };
  }, [conversationId, utilisateur]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleHangup = () => {
    stream?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setStream(null);
    setInCall(false);
    setIncomingCall(null);
    setWaitingAnswer(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    ringtoneRef.current?.pause();
    ringtoneRef.current.currentTime = 0;
    socket.emit("call_hangup", { roomId: conversationId });
  };

  const startCall = async (type) => {
    if (inCall || waitingAnswer) return alert("Un appel est déjà en cours ou en attente.");
    if (interlocuteur?.estBloqueParUtilisateur) return alert("Vous ne pouvez pas appeler cet utilisateur.");

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

    setWaitingAnswer(true);
    ringtoneRef.current?.play().catch(() => {});
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

  return (
    <div className="chatbox-container">
      <ChatHeader
        nom={interlocuteur?.pseudo}
        onCallAudio={() => startCall("audio")}
        onCallVideo={() => startCall("video")}
        onClose={handleHangup}
      />

      {incomingCall && interlocuteur && (
        <div className="incoming-call-toast">
          <img src={interlocuteur.photoUrl || "/images/default-avatar.png"} alt="avatar" className="avatar" />
          <p>{interlocuteur.pseudo} vous appelle en {incomingCall.callType}...</p>
          <button onClick={acceptCall}>Accepter</button>
          <button onClick={() => {
            socket.emit("call_declined", { roomId: conversationId });
            setIncomingCall(null);
          }}>
            Refuser
          </button>
        </div>
      )}

      {waitingAnswer && interlocuteur && (
        <div className="incoming-call-toast">
          <img src={interlocuteur.photoUrl || "/images/default-avatar.png"} alt="avatar" className="avatar" />
          <p>⏳ En attente de réponse de {interlocuteur.pseudo}...</p>
          <button className="hangup-button" onClick={handleHangup}>Annuler l'appel</button>
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

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nouveauTexte.trim() && !imageFile) return;
          if (isSending) return;

          setIsSending(true);
          const formData = new FormData();
          formData.append("conversationId", conversationId);
          formData.append("contenu", nouveauTexte);
          formData.append("type", imageFile ? "IMAGE" : "TEXTE");
          if (imageFile) formData.append("image", imageFile);

          fetch("/api/messages", {
            method: "POST",
            body: formData,
          })
            .then((res) => res.json())
            .then((data) => {
              socket.emit("send_message", data.message);
              setNouveauTexte("");
              setImageFile(null);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
              }
            })
            .finally(() => setIsSending(false));
        }}
      >
        <textarea
          ref={textareaRef}
          className="input-text"
          placeholder="Écrire un message..."
          value={nouveauTexte}
          onChange={handleChange}
          rows={1}
          style={{ overflow: "hidden", resize: "none" }}
        />
        <label htmlFor="image-upload" className="upload-label">
  
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    stroke="#e0c084"    
  >
    <path d="M21.44 11.05L12 20.5a5.002 5.002 0 01-7.07-7.07l9.9-9.9a3 3 0 114.24 4.24L8.47 17.5" />
  </svg>
</label>
<input
  id="image-upload"
  type="file"
  accept="image/*"
  className="message-image"
  style={{ display: "none" }}
  onChange={(e) => {
    const file = e.target.files[0];
    if (file) setImageFile(file);
  }}
/>

        {imageFile && (
          <div className="image-preview">
            <p style={{ fontSize: "0.8rem", color: "#ccc" }}>📎 {imageFile.name}</p>
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Aperçu"
              style={{ maxWidth: "120px", maxHeight: "120px", borderRadius: "8px", marginTop: "4px" }}
            />
          </div>
        )}
        <button type="submit" className="message-btn">Envoyer</button>
      </form>

      <audio ref={ringtoneRef} src="/sounds/ringtone.mp3" preload="auto" />
    </div>
  );
}