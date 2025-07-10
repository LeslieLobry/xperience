"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import dynamic from "next/dynamic";
import ChatInput from "../ChatInput/ChatInput";
import Spinner from "../Spinner/Spinner";

import { useMessages } from "../../hook/useMessages";
import { useTyping } from "../../hook/useTyping";
import "./ChatBox.css";

const ChatHeader = dynamic(() => import("./ChatHeader"), { ssr: false });
import MessagesList from "../MessagesList";
const NotificationAppelEntrant = dynamic(() => import("../NotificationAppelEntrant/NotificationAppelEntrant"), { ssr: false });
const VideoCallView = dynamic(() => import("../VideoCallView/VideoCallView"), { ssr: false });
const EmojiPicker = dynamic(() => import("./EmojiPickerWrapper"), { ssr: false });

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);
let Room, createLocalTracks;

export default function ChatBox({ conversationId, utilisateur }) {
  const [texte, setTexte] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [recording, setRecording] = useState(false);
  const [room, setRoom] = useState(null);
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [appelEntrant, setAppelEntrant] = useState(null);
  const [appelRefuse, setAppelRefuse] = useState(false);
  const [appelOccupe, setAppelOccupe] = useState(false);
  const sonnerieRef = useRef(null);
  const appelTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // 👇 Etat pour les prénoms du couple
  const [prenomsCouple, setPrenomsCouple] = useState(null);

  function formatDurationFront(seconds) {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
  }

  // Listen notifications d'appel entrant (Ably)
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);

const handleIncomingCall = ({ data }) => {
  // Si j’ai envoyé l’appel, je n’affiche pas la notif
  if (data.from?.id === utilisateur.id) {
    console.log("Je reçois mon propre appel, je n'affiche rien.");
    return;
  }
  if (appelEntrant || inCall) {
    console.log("Ignoré : appel déjà en attente ou en cours");
    return;
  }
  setAppelEntrant(data);
  // ... (le reste inchangé)
};



    channel.subscribe("call:incoming", handleIncomingCall);

    return () => {
      channel.unsubscribe("call:incoming", handleIncomingCall);
      clearTimeout(appelTimeoutRef.current);
    };
  }, [utilisateur?.id]);

  // Listen "call:accepted" pour stopper notif/sonnerie côté appelant
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);

    const handleCallAccepted = ({ data }) => {
      setAppelEntrant(null);
      setInCall(true);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      if (!inCall) {
        startCall(data.type === "video");
      }
    };

    channel.subscribe("call:accepted", handleCallAccepted);

    return () => {
      channel.unsubscribe("call:accepted", handleCallAccepted);
    };
  }, [utilisateur?.id, inCall]);

  // Listen "call:refused" pour notif refus (appelant) -- CORRIGÉ ICI
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);

    const handleCallRefused = ({ data }) => {
      setAppelEntrant(null);
      setAppelRefuse(true);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      setTimeout(() => setAppelRefuse(false), 4000);
    };

    channel.subscribe("call:refused", handleCallRefused);

    return () => {
      channel.unsubscribe("call:refused", handleCallRefused);
    };
  }, [utilisateur?.id]);

  // Listen "call:busy" pour notif occupé (appelant)
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);

    const handleCallBusy = ({ data }) => {
      setAppelEntrant(null);
      setAppelOccupe(true);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      setTimeout(() => setAppelOccupe(false), 4000);
    };

    channel.subscribe("call:busy", handleCallBusy);

    return () => {
      channel.unsubscribe("call:busy", handleCallBusy);
    };
  }, [utilisateur?.id]);

  // Fetch des prénoms du couple pour cette conversation
  useEffect(() => {
    if (utilisateur.type !== "couple" || !conversationId) {
      setPrenomsCouple(null);
      return;
    }
    fetch(`/api/prenoms-couple?conversationId=${conversationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.prenoms) setPrenomsCouple(data.prenoms);
        else setPrenomsCouple(null);
      });
  }, [conversationId, utilisateur.type]);

  const {
    messages,
    lastReads,
    setMessages,
    participantsAutres,
    envoyerMessage,
    handleReaction,
    loadMoreMessages,
    hasMore,
  } = useMessages(conversationId, utilisateur, setTexte);

  useEffect(() => {
    if (messages.length) setLoadingInitial(false);
  }, [messages.length]);

  const { isTyping, typingPseudo, envoyerTyping } = useTyping(conversationId, utilisateur);

const startCall = async (video = true) => {
  if (inCall) {
    participantsAutres.forEach((p) => {
      if (p.id !== utilisateur.id) {
        ably.channels.get(`notification-${p.id}`).publish("call:busy", {
          from: utilisateur,
          room: conversationId,
        });
      }
    });
    return;
  }
  if (!Room || !createLocalTracks) {
    const livekit = await import("livekit-client");
    Room = livekit.Room;
    createLocalTracks = livekit.createLocalTracks;
  }
console.log("participantsAutres", participantsAutres, "utilisateur", utilisateur);

  participantsAutres
  .filter((p) => p.id !== utilisateur.id)
  .forEach((p) => {
    ably.channels.get(`notification-${p.id}`).publish("call:incoming", {
      from: utilisateur,
      room: conversationId,
      type: video ? "video" : "audio",
    });
  });
console.log("Appel lancé, notifications envoyées à :", participantsAutres.filter((p) => p.id !== utilisateur.id).map(p => p.id));

  const res = await fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: `user_${utilisateur.id}`,
      room: conversationId,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    console.error("❌ Erreur token LiveKit :", data);
    return;
  }

  const token = data.token;
  const newRoom = new Room();
  setRoom(newRoom);

  newRoom.on("trackSubscribed", (track, publication, participant) => {
    setRemoteTracks((prev) => [
      ...prev.filter((t) => t.id !== participant.identity),
      { id: participant.identity, nom: participant.identity, track },
    ]);
  });

  newRoom.on("trackUnsubscribed", (_, __, participant) => {
    setRemoteTracks((prev) => prev.filter((t) => t.id !== participant.identity));
  });

  const localTracks = await createLocalTracks({ audio: true, video });
  const localVideoTrack = localTracks.find((t) => t.kind === "video");
  if (localVideoTrack) window.localVideoTrack = localVideoTrack;

  await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
  localTracks.forEach((track) => newRoom.localParticipant.publishTrack(track));
  setInCall(true);
};

  const hangupCall = () => {
    if (room) {
      room.localParticipant?.tracks?.forEach((pub) => pub.track?.stop());
      room.disconnect();
      setRoom(null);
      setRemoteTracks([]);
      setInCall(false);
      if (window.localVideoTrack) {
        window.localVideoTrack.stop();
        delete window.localVideoTrack;
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

        const duree = await new Promise((resolve) => {
          const audio = document.createElement("audio");
          audio.src = URL.createObjectURL(audioBlob);
          audio.preload = "metadata";

          let resolved = false;

          audio.onloadedmetadata = () => {
            if (audio.duration === Infinity) {
              audio.currentTime = 1e101;
              audio.ontimeupdate = () => {
                audio.ontimeupdate = null;
                let seconds = audio.duration;
                if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
                  resolve("0:00");
                } else {
                  const m = Math.floor(seconds / 60);
                  const s = Math.floor(seconds % 60);
                  const dureeStr = `${m}:${s < 10 ? "0" + s : s}`;
                  console.log("[AUDIO] HACKED duration:", seconds, dureeStr);
                  resolve(dureeStr);
                }
                URL.revokeObjectURL(audio.src);
                resolved = true;
              };
            } else {
              let seconds = audio.duration;
              if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
                resolve("0:00");
              } else {
                const m = Math.floor(seconds / 60);
                const s = Math.floor(seconds % 60);
                const dureeStr = `${m}:${s < 10 ? "0" + s : s}`;
                console.log("[AUDIO] duration:", seconds, dureeStr);
                resolve(dureeStr);
              }
              URL.revokeObjectURL(audio.src);
              resolved = true;
            }
          };

          setTimeout(() => {
            if (!resolved) {
              resolve("0:00");
              URL.revokeObjectURL(audio.src);
            }
          }, 3000);
        });

        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("conversationId", conversationId);
        formData.append("type", "AUDIO");
        formData.append("duree", duree);

        const res = await fetch("/api/messages/audio", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) setMessages((prev) => [...prev, data.message]);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Erreur enregistrement :", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleDelete = async (messageId) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
      if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Erreur suppression message :", err);
    }
  };

  return (
    <div className="chatbox-container">
      <ChatHeader
        participants={participantsAutres}
        inCall={inCall}
        onCallAudio={() => startCall(false)} 
        onCallVideo={() => startCall(true)}
        onClose={hangupCall}
      />

      {inCall && !!window.localVideoTrack && (
  <VideoCallView
    inCall={inCall}
    remoteTracks={remoteTracks}
    startCall={startCall}
    hangupCall={hangupCall}
  />
)}


      <MessagesList
        messages={messages}
        utilisateur={utilisateur}
        onReact={handleReaction}
        lastReads={lastReads}
        typingPseudo={isTyping ? typingPseudo : null}
        hasMore={hasMore}
        onLoadMore={loadMoreMessages}
        onDelete={handleDelete}
        prenomsCouple={prenomsCouple}
      />

      {isTyping && typingPseudo && (
        <div className="typing-notif" style={{ color: "#888", fontStyle: "italic", margin: "0 0 4px 8px" }}>
          {typingPseudo} est en train d&apos;écrire...
        </div>
      )}

      <ChatInput
        utilisateur={utilisateur}
        conversationId={conversationId}
        texte={texte}
        setTexte={setTexte}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        onMessageSent={async (contenu, type = "TEXTE", membreParlant, isImage = false) => {
          if (isImage) {
            // Contenu est un FormData pour image/audio, envoie POST ici
            const res = await fetch("/api/messages", {
              method: "POST",
              body: contenu, // FormData envoyé depuis ChatInput
            });
            const data = await res.json();
            if (data.success && data.message) {
              setMessages((prev) => [...prev, data.message]); // Ajoute message manuellement
            }
          } else {
            await envoyerMessage(contenu, type, membreParlant);
          }
        }}
        onTyping={envoyerTyping}
        startRecording={startRecording}
        stopRecording={stopRecording}
        recording={recording}
      />

      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker
            onSelect={(emoji) => {
              setTexte((prev) => prev + emoji.native);
              setShowEmojiPicker(false);
            }}
          />
        </div>
      )}

      <NotificationAppelEntrant
        appel={appelEntrant}
        onAccepter={(type) => {
          clearTimeout(appelTimeoutRef.current);
          setAppelEntrant(null);
          sonnerieRef.current?.pause();
          sonnerieRef.current.currentTime = 0;
          if (appelEntrant?.from?.id) {
            ably.channels.get(`notification-${appelEntrant.from.id}`).publish("call:accepted", {
              from: utilisateur,
              room: conversationId,
              type,
            });
          }
          startCall(type === "video");
        }}
        onRefuser={() => {
          clearTimeout(appelTimeoutRef.current);
          setAppelEntrant(null);
          sonnerieRef.current?.pause();
          sonnerieRef.current.currentTime = 0;
          if (appelEntrant?.from?.id) {
            ably.channels.get(`notification-${appelEntrant.from.id}`).publish("call:refused", {
              from: utilisateur,
              room: conversationId,
            });
          } else {
            participantsAutres.forEach((p) => {
              ably.channels.get(`notification-${p.id}`).publish("call:refused", {
                from: utilisateur,
                room: conversationId,
              });
            });
          }
        }}
      />

      <audio ref={sonnerieRef} src="/sonnerie.mp3" preload="auto" />

      {appelRefuse && <div className="call-refused-notif">Appel refusé 📵</div>}
      {appelOccupe && <div className="call-busy-notif">Utilisateur occupé sur un autre appel 🚫</div>}
    </div>
  );
}
