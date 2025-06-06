import { Phone, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./ChatBox.css";

const socket = io("http://localhost:4000");
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ChatHeader({ nom, conversationId }) {
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState(null); // "audio" | "video"
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null); // peer connection

  // Fonction pour lancer un appel (audio ou vidéo)
  const startCall = async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === "video",
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(localStream);
      setMode(type);

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
      });
    } catch (err) {
      console.error("Erreur appel :", err);
    }
  };

  const stopCall = () => {
    stream?.getTracks().forEach((t) => t.stop());
    if (pcRef.current) {
      pcRef.current.close();
    }
    setStream(null);
    setMode(null);
  };

  useEffect(() => {
    // rejoindre la room
    if (conversationId) {
      socket.emit("join_conversation", conversationId);
    }

    socket.on("webrtc_answer", async (answer) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc_ice_candidate", (candidate) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
    };
  }, [conversationId]);

  return (
    <div className="chat-header">
      <span className="chat-title">{nom}</span>
      <div className="chat-actions">
        <button onClick={() => startCall("audio")}><Phone /></button>
        <button onClick={() => startCall("video")}><Video /></button>
        <button onClick={stopCall}><X /></button>
      </div>

      {mode === "video" && (
        <>
          <video ref={localVideoRef} autoPlay muted playsInline className="mini-webcam" />
          <video ref={remoteVideoRef} autoPlay playsInline className="mini-webcam remote" />
        </>
      )}
    </div>
  );
}
