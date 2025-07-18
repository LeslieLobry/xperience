"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import dynamic from "next/dynamic";
import ChatInput from "../ChatInput/ChatInput";
import { useMessages } from "../../hook/useMessages";
import { useTyping } from "../../hook/useTyping";
import AddParticipantList from "../AddParticipantList/AddParticipantList";
import "./ChatBox.css";

const ChatHeader = dynamic(() => import("./ChatHeader"), { ssr: false });
import MessagesList from "../MessagesList";
const NotificationAppelEntrant = dynamic(() => import("../NotificationAppelEntrant/NotificationAppelEntrant"), { ssr: false });
const VideoCallView = dynamic(() => import("../VideoCallView/VideoCallView"), { ssr: false });
const EmojiPicker = dynamic(() => import("./EmojiPickerWrapper"), { ssr: false });

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);
let Room, createLocalTracks;

export default function ChatBox({ conversationId, utilisateur,onBack, }) {
  const [texte, setTexte] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inCall, setInCall] = useState(false);
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
  const [prenomsCouple, setPrenomsCouple] = useState(null);
  const messagesEndRef = useRef(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [addUserInput, setAddUserInput] = useState("");
  const [addUserError, setAddUserError] = useState("");
  const [addUserLoading, setAddUserLoading] = useState(false);

  // === TIMER D'APPEL ===
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState("0:00");
  const callTimerRef = useRef(null);

  // Appel quand tu démarres/acceptes l'appel
const startTimer = () => {
  const start = Date.now();
  setCallStartTime(start);
  setCallDuration("0:00");
  if (callTimerRef.current) clearInterval(callTimerRef.current);

  callTimerRef.current = setInterval(() => {
    const diff = Math.floor((Date.now() - start) / 1000);
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    setCallDuration(`${min}:${sec < 10 ? "0" + sec : sec}`);
  }, 1000);
};


  // Appel quand tu raccroches
  const stopTimer = () => {
    clearInterval(callTimerRef.current);
    setCallStartTime(null);
    setCallDuration("0:00");
  };

  // Listen notifications d'appel entrant (Ably)
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);
    const handleIncomingCall = ({ data }) => {
      if (data.from?.id === utilisateur.id) return;
      if (appelEntrant || inCall) return;
      setAppelEntrant(data);

      if (sonnerieRef.current) {
        sonnerieRef.current.currentTime = 0;
        sonnerieRef.current.play().catch(() => {});
      }
    };
    channel.subscribe("call:incoming", handleIncomingCall);
    return () => {
      channel.unsubscribe("call:incoming", handleIncomingCall);
      clearTimeout(appelTimeoutRef.current);
    };
  }, [utilisateur?.id, appelEntrant, inCall]);

  // Listen "call:accepted"
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);
    const handleCallAccepted = ({ data }) => {
      setAppelEntrant(null);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      startCall(data.type === "video");
      setInCall(true);
      startTimer(); // <-- Ajoute ici le timer quand tu acceptes
    };
    channel.subscribe("call:accepted", handleCallAccepted);
    return () => {
      channel.unsubscribe("call:accepted", handleCallAccepted);
    };
    // eslint-disable-next-line
  }, [utilisateur?.id]);

  // Listen "call:refused"
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
      stopTimer();
      setTimeout(() => setAppelRefuse(false), 4000);
    };
    channel.subscribe("call:refused", handleCallRefused);
    return () => {
      channel.unsubscribe("call:refused", handleCallRefused);
    };
    // eslint-disable-next-line
  }, [utilisateur?.id]);

  // Listen "call:busy"
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
      stopTimer();
      setTimeout(() => setAppelOccupe(false), 4000);
    };
    channel.subscribe("call:busy", handleCallBusy);
    return () => {
      channel.unsubscribe("call:busy", handleCallBusy);
    };
    // eslint-disable-next-line
  }, [utilisateur?.id]);

  // Fetch prénoms couple
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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
  participantsAutres
    .filter((p) => p.id !== utilisateur.id)
    .forEach((p) => {
      ably.channels.get(`notification-${p.id}`).publish("call:incoming", {
        from: utilisateur,
        room: conversationId,
        type: video ? "video" : "audio",
      });
    });

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

  // === LOG les événements de la room
  newRoom.on("participantConnected", (participant) => {
    console.log("[LiveKit] participantConnected", participant.identity);
  });
  newRoom.on("participantDisconnected", (participant) => {
    console.log("[LiveKit] participantDisconnected", participant.identity);
  });

  newRoom.on("trackSubscribed", (track, publication, participant) => {
    const id = participant.identity + '-' + track.kind;
    console.log("[LiveKit] trackSubscribed", { id, kind: track.kind, participant: participant.identity, track });
    setRemoteTracks((prev) => [
      ...prev.filter((t) => t.id !== id), // << ID unique !
      { id, nom: participant.identity, track }, // << ID unique !
    ]);
  });

  newRoom.on("trackUnsubscribed", (track, publication, participant) => {
    const id = participant.identity + '-' + track.kind;
    console.log("[LiveKit] trackUnsubscribed", { id, kind: track.kind, participant: participant.identity, track });
    setRemoteTracks((prev) => prev.filter((t) => t.id !== id));
  });

  const localTracks = await createLocalTracks({ audio: true, video });
  console.log("[startCall] localTracks (créés):", localTracks, "user:", utilisateur.id);

  // LOG le publishing des tracks
  localTracks.forEach((track) => {
    console.log("[startCall] Publishing local track", track.kind, "track:", track, "user:", utilisateur.id);
  });

  const localVideoTrack = localTracks.find((t) => t.kind === "video");
  if (localVideoTrack) window.localVideoTrack = localVideoTrack;

  await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
  console.log("[startCall] Room joined:", conversationId, "Identity:", utilisateur.id);

  localTracks.forEach((track) => newRoom.localParticipant.publishTrack(track));
  setInCall(true);
  startTimer(); // <-- Timer démarré à chaque appel lancé
};


  const hangupCall = () => {
    if (room) {
      room.localParticipant?.tracks?.forEach((pub) => pub.track?.stop());
      room.disconnect();
      setRoom(null);
      setRemoteTracks([]);
      setInCall(false);
      stopTimer();
      if (window.localVideoTrack) {
        window.localVideoTrack.stop();
        delete window.localVideoTrack;
      }
    } else {
      setInCall(false);
      stopTimer();
    }
  };

  const [recording, setRecording] = useState(false);
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
const handleAddParticipant = async () => {
  setAddUserError("");
  if (!addUserInput.trim()) return setAddUserError("Champ vide !");
  setAddUserLoading(true);
  try {
    const res = await fetch(`/api/conversations/${conversationId}/add-participant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIdOrPseudo: addUserInput.trim() }),
    });
    const data = await res.json();
    setAddUserLoading(false);
    if (data.success) {
      setShowAddParticipant(false);
      setAddUserInput("");
      setAddUserError("");
      window.location.reload();
    } else {
      setAddUserError(data.error || "Erreur lors de l'ajout.");
    }
  } catch (err) {
    setAddUserLoading(false);
    setAddUserError("Erreur réseau.");
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
        onAddParticipant={() => setShowAddParticipant(true)}
        onBack={onBack}
      />

      {/* TIMER D'APPEL */}
      {inCall && (
        <div className="call-timer" style={{ 
          position: "absolute",
          left: 0, right: 0, top: 25, textAlign: "center",
          fontWeight: 500, color: "#7d5d2a", fontSize: "1.1em",
          zIndex: 20, letterSpacing: "1px" 
        }}>
          ⏱️ {callDuration}
        </div>
      )}

      {showAddParticipant && (
        <div className="add-participant-modal">
          <h3>Ajouter un membre</h3>
          <AddParticipantList
            conversationId={conversationId}
            participants={participantsAutres.concat(utilisateur)}
            onClose={() => {
              setShowAddParticipant(false);
              setAddUserError("");
              setAddUserInput("");
            }}
            onAdded={() => window.location.reload()}
          />
        </div>
      )}

      {inCall && (
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
            const res = await fetch("/api/messages", {
              method: "POST",
              body: contenu,
            });
            const data = await res.json();
            if (data.success && data.message) {
              setMessages((prev) => [...prev, data.message]);
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
        appel={appelEntrant && appelEntrant.from?.id !== utilisateur.id ? appelEntrant : null}
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
          setInCall(true);
          startTimer();
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
          stopTimer();
        }}
      />

      <audio ref={sonnerieRef} src="/sonnerie.mp3" preload="auto" />

      {appelRefuse && <div className="call-refused-notif">Appel refusé 📵</div>}
      {appelOccupe && <div className="call-busy-notif">Utilisateur occupé sur un autre appel 🚫</div>}
    </div>
  );
}
