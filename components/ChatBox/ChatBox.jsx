"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import {
Room,
createLocalTracks,
RemoteVideoTrack,
} from "livekit-client";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

function cleanupLocalTracks(room) {
if (!room?.localParticipant?.tracks) return;
for (const pub of room.localParticipant.tracks.values?.() || []) {
const track = pub?.track;
if (track) {
track.stop();
if (track.mediaStreamTrack) {
try {
track.mediaStreamTrack.stop();
} catch (e) {
console.warn("⚠️ mediaStreamTrack déjà stoppé :", e);
}
}
track.detach().forEach((el) => {
try {
el.srcObject = null;
el.remove();
} catch (err) {
console.warn("Erreur nettoyage DOM caméra :", err);
}
});
}
}
}

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ChatBox({ conversationId, utilisateur }) {
const [messages, setMessages] = useState([]);
const [texte, setTexte] = useState("");
const [participantsAutres, setParticipantsAutres] = useState([]);
const [room, setRoom] = useState(null);
const [inCall, setInCall] = useState(false);
const [remoteTracks, setRemoteTracks] = useState([]);
const [isTyping, setIsTyping] = useState(null);
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const localTracksRef = useRef([]);
const messagesEndRef = useRef(null);
const textareaRef = useRef(null);
const ringtoneRef = useRef(null);
const [appelRecu, setAppelRecu] = useState(null); // { auteurId, auteurPseudo, video }
const inCallRef = useRef(false);



const adjustTextareaHeight = () => {
const el = textareaRef.current;
if (!el) return;
el.style.height = "auto";
el.style.height = el.scrollHeight + "px";
};

const notifyTyping = () => {
const channel = ably.channels.get(`conversation-${conversationId}`);
channel.publish("typing", {
auteurId: utilisateur.id,
pseudo: utilisateur.pseudo,
conversationId,
});
};
const startCall = async (video = false) => {
  try {
    // ✅ Demande explicite de permission AVANT LiveKit
    await navigator.mediaDevices.getUserMedia({ audio: true, video });

    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: String(utilisateur.id), room: String(conversationId) }),
    });

    const { token } = await res.json();
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    const tracks = await createLocalTracks({ audio: true, video });
    localTracksRef.current = tracks;
    const newRoom = new Room();

    newRoom.on("trackSubscribed", (track, publication, participant) => {
      if (track.kind === "video" && track instanceof RemoteVideoTrack) {
        console.log("🎥 Nouveau remote track :", participant.identity, track);
        setRemoteTracks((prev) => {
          if (prev.some((t) => t.id === participant.identity)) return prev;
          return [...prev, { id: participant.identity, track, nom: participant.identity }];
        });
      }

      if (track.kind === "audio") {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = new MediaStream([track.mediaStreamTrack]);
        document.body.appendChild(audio);
      }
    });

    newRoom.on("trackUnsubscribed", (track, publication, participant) => {
      setRemoteTracks((prev) => prev.filter((t) => t.id !== participant.identity));
    });

    await newRoom.connect(livekitUrl, token, { tracks });

    setRoom(newRoom);
    setInCall(true);

    const localVideoTrack = tracks.find((t) => t.kind === "video");
    if (localVideoTrack) {
      const tryAttach = setInterval(() => {
        const el = document.getElementById("local-video");
        if (el) {
          localVideoTrack.attach(el);
          clearInterval(tryAttach);
        }
      }, 100);
      setTimeout(() => clearInterval(tryAttach), 3000);
    }

    console.log("📡 Envoi appel via Ably :", conversationId, utilisateur.id);
    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("start-call", {
      auteurId: utilisateur.id,
      auteurPseudo: utilisateur.pseudo,
      video,
      conversationId,
    });

  } catch (err) {
    console.error("❌ Erreur lors de l'appel :", err);
    if (err.name === "NotAllowedError") {
      alert("🚫 Accès à la caméra ou au micro refusé. Vérifie les autorisations dans ton navigateur.");
    } else {
      alert("❌ Erreur pendant l’appel : " + err.message);
    }
  }
};



const hangupCall = () => {
if (!inCall) return;
setInCall(false); // ⛔ coupe la boucle avant toute autre action
try {
cleanupLocalTracks(room);
localTracksRef.current.forEach((track) => {
try {
track.stop();
track.mediaStreamTrack?.stop();
} catch (e) {
console.warn("Erreur arrêt localTrack direct :", e);
}
});
localTracksRef.current = [];

if (room) room.disconnect();

const channel = ably.channels.get(`conversation-${conversationId}`);
if (inCall) {
const channel = ably.channels.get(`conversation-${conversationId}`);
channel.publish("end-call", {
auteurId: utilisateur.id,
});
}

channel.publish("end-call", {
auteurId: utilisateur.id,
});

setRoom(null);
setRemoteTracks([]);

const localVideo = document.getElementById("local-video");
if (localVideo) {
localVideo.pause();
localVideo.srcObject = null;
localVideo.removeAttribute("src");
localVideo.load();
}
} catch (error) {
console.error("❌ Erreur pendant le raccrochage :", error);
}
};


const handleChange = (e) => {
setTexte(e.target.value);
adjustTextareaHeight();
notifyTyping();
};

const envoyerMessage = async () => {
if (!texte.trim()) return;
const nouveauMessage = {
auteurId: utilisateur.id,
contenu: texte,
conversationId,
date: new Date().toISOString(),
};

const channel = ably.channels.get(`conversation-${conversationId}`);
channel.publish("message", nouveauMessage);

setMessages((prev) => [...prev, { ...nouveauMessage, id: Date.now() }]);
setTexte("");
textareaRef.current.style.height = "auto";
};

useEffect(() => {
console.log("🎧 ChatBox monté avec ID:", utilisateur.id, "conv:", conversationId);

if (!conversationId) return;
console.log("📥 Conversation ID reçu :", conversationId);
const fetchMessages = async () => {
try {
const res = await fetch(`/api/messages?conversationId=${conversationId}`);
const data = await res.json();
setMessages(data.messages || []);
setParticipantsAutres(data.participants || []);
} catch (err) {
console.error("❌ Erreur chargement messages :", err);
}
};

fetchMessages();

const channel = ably.channels.get(`conversation-${conversationId}`);

const handleStartCall = (msg) => {
console.log("📞 START-CALL EVENT REÇU", msg.data);
if (msg.data.auteurId !== utilisateur.id && !inCall) {
setAppelRecu(msg.data);
ringtoneRef.current?.play();
}
};
const handleEndCall = (msg) => {
if (msg.data.auteurId !== utilisateur.id && inCall) {
console.log("📴 Appel terminé par l’autre utilisateur");
hangupCall();
}
};


const handleTyping = (msg) => {
if (msg.data.auteurId !== utilisateur.id) {
setIsTyping(`${msg.data.pseudo}`);
setTimeout(() => setIsTyping(null), 2000);
}
};

channel.subscribe("start-call", handleStartCall);
channel.subscribe("end-call", handleEndCall);
channel.subscribe("typing", handleTyping);

return () => {
channel.unsubscribe("start-call", handleStartCall);
channel.unsubscribe("end-call", handleEndCall);
channel.unsubscribe("typing", handleTyping);
};
}, [conversationId, inCall]);

useEffect(() => {
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

useEffect(() => {
remoteTracks.forEach(({ id, track }) => {
const el = document.getElementById(`remote-video-${id}`);
if (el && track) {
console.log("📷 Attaching remote track", track, "to element", el);
track.attach(el);
}

});
}, [remoteTracks]);

return (
<div className="chatbox-container">
  <ChatHeader participants={participantsAutres} onCallAudio={()=> startCall(false)}
    onCallVideo={() => startCall(true)}
    onClose={hangupCall}
    inCall={inCall}
    />

    {inCall && (
    <div className="video-call-container">
      <div className="video-box local floating">
        <video id="local-video" autoPlay muted playsInline />
        <div className="video-label">Moi</div>
      </div>
      {remoteTracks.map(({ id, nom }) => (
      <div className="video-box" key={id}>
        <video id={`remote-video-${id}`} autoPlay playsInline />
        <div className="video-label">{nom || "Participant"}</div>
      </div>
      ))}
      <button onClick={hangupCall} className="hangup-button">🛑 Raccrocher</button>
    </div>
    )}

    <div className="chat-messages">
      {messages.map((msg, i) => (
      <MessageBubble key={msg.id} msg={msg} utilisateur={utilisateur} previousMsg={messages[i - 1]}
        lastReads={participantsAutres.map(p=> ({ utilisateurId: p.id, lastReadAt: p.lastReadAt }))}
        />
        ))}
        <div ref={messagesEndRef} />
    </div>

    {isTyping && <div className="typing-indicator">{isTyping} est en train d’écrire...</div>}

    <form className="chat-input" onSubmit={(e)=> { e.preventDefault(); envoyerMessage(); }}>
      <textarea ref={textareaRef} className="input-text" placeholder="Écrire un message..." value={texte}
        onChange={handleChange} rows={1} style={{ overflow: "hidden", resize: "none" }} />
      <button type="button" className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
        <button type="submit" className="message-btn">Envoyer</button>
      </form>

      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              setTexte((prev) => prev + emoji.native);
              setShowEmojiPicker(false);
            }}
            theme="light"
          />
        </div>
      )}
{appelRecu && (
  <div className="appel-recu-popup">
    <div className="appel-popup-contenu">
      <p>
        <strong>{appelRecu.auteurPseudo}</strong> vous appelle pour un {appelRecu.video ? "appel vidéo" : "appel audio"}.
      </p>
      <div className="appel-popup-actions">
        <button
         onClick={() => {
  ringtoneRef.current?.pause();
  setAppelRecu(null);
  setTimeout(() => startCall(appelRecu.video), 50); // appel différé
}}

        >
          ✅ Accepter
        </button>
        <button
          onClick={() => {
            ringtoneRef.current?.pause();
            setAppelRecu(null);
          }}
        >
          ❌ Refuser
        </button>
      </div>
    </div>
  </div>
)}
      <audio ref={ringtoneRef} src="/ringtone.mp3" loop />
    </div>
  );
}