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

export default function ChatBox({ conversationId, utilisateur, onBack }) {
  // --------------------- STATES ----------------------
  const [texte, setTexte] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [room, setRoom] = useState(null);
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [appelEntrant, setAppelEntrant] = useState(null);
  const [appelRefuse, setAppelRefuse] = useState(false);
  const [appelOccupe, setAppelOccupe] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [prenomsCouple, setPrenomsCouple] = useState(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [addUserInput, setAddUserInput] = useState("");
  const [addUserError, setAddUserError] = useState("");
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState("0:00");
  const [recording, setRecording] = useState(false);

  // --------------------- REFS ----------------------
  const sonnerieRef = useRef(null);
  const appelTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);

  // --------------------- HOOKS (à placer AVANT les useEffect qui les utilisent) ----------------------
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

  const { isTyping, typingPseudo, envoyerTyping } = useTyping(conversationId, utilisateur);

  // --------------------- USEEFFECTS ----------------------

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
      startTimer();
    };
    channel.subscribe("call:accepted", handleCallAccepted);
    return () => {
      channel.unsubscribe("call:accepted", handleCallAccepted);
    };
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
  }, [utilisateur?.id]);

  // Listen "call:hangup"
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);
    const handleCallHangup = ({ data }) => {
      if (participantsAutres && participantsAutres.length === 1) {
        hangupCall();
      }
    };
    channel.subscribe("call:hangup", handleCallHangup);
    return () => {
      channel.unsubscribe("call:hangup", handleCallHangup);
    };
  }, [utilisateur?.id, participantsAutres?.length]); // SAFE

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

  useEffect(() => {
    if (messages.length) setLoadingInitial(false);
  }, [messages.length]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --------------------- TIMER APPEL ----------------------

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

  const stopTimer = () => {
    clearInterval(callTimerRef.current);
    setCallStartTime(null);
    setCallDuration("0:00");
  };

  // --------------------- APPEL LIVEKIT ----------------------

  const startCall = async (video = true, initiateur = true) => {
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

  // 🔴 Évite de publier un nouvel appel si on est en réponse d'un appel existant
  if (initiateur) {
    participantsAutres
      .filter((p) => p.id !== utilisateur.id)
      .forEach((p) => {
        ably.channels.get(`notification-${p.id}`).publish("call:incoming", {
          from: utilisateur,
          room: conversationId,
          type: video ? "video" : "audio",
        });
      });
  }

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

  newRoom.on("participantConnected", (participant) => {
    console.log("[LiveKit] participantConnected", participant.identity);
  });

  newRoom.on("participantDisconnected", (participant) => {
    console.log("[LiveKit] participantDisconnected", participant.identity);
  });

  newRoom.on("trackSubscribed", (track, publication, participant) => {
    const id = participant.identity + '-' + track.kind;
    setRemoteTracks((prev) => [
      ...prev.filter((t) => t.id !== id),
      { id, nom: participant.identity, track },
    ]);
  });

  newRoom.on("trackUnsubscribed", (track, publication, participant) => {
    const id = participant.identity + '-' + track.kind;
    setRemoteTracks((prev) => prev.filter((t) => t.id !== id));
  });

  const localTracks = await createLocalTracks({ audio: true, video });
  localTracks.forEach((track) => newRoom.localParticipant.publishTrack(track));
  await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
  setInCall(true);
  startTimer();
};


const hangupCall = () => {
  if (room) {
    if (participantsAutres && participantsAutres.length === 1) {
      const otherId = participantsAutres[0]?.id;
      if (otherId && utilisateur.id !== otherId) {
        ably.channels.get(`notification-${otherId}`).publish("call:hangup", {
          from: utilisateur,
          room: conversationId,
        });
      }
    }
    room.localParticipant?.tracks?.forEach((pub) => pub.track?.stop());
    room.disconnect();
    setRoom(null);
    setRemoteTracks([]);
    setInCall(false);
    stopTimer();
    stopAllMediaStreams(); // <--- 👈 nettoie tout proprement
  } else {
    setInCall(false);
    stopTimer();
    stopAllMediaStreams();
  }
};

function stopAllMediaStreams() {
  // Arrête tous les tracks des <video> et <audio>
  document.querySelectorAll("video, audio").forEach((el) => {
    if (el.srcObject && el.srcObject.getTracks) {
      el.srcObject.getTracks().forEach((track) => track.stop());
      el.srcObject = null;
    }
  });
  // Arrête aussi les flux stockés en variable globale
  if (window.localStream && window.localStream.getTracks) {
    window.localStream.getTracks().forEach((track) => track.stop());
    window.localStream = null;
  }
  if (window.localVideoTrack) {
    window.localVideoTrack.stop();
    delete window.localVideoTrack;
  }
}

  // --------------------- ENREGISTREMENT AUDIO ----------------------

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

        await fetch("/api/messages/audio", { method: "POST", body: formData });
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

  // --------------------- HANDLERS MESSAGES ----------------------

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

  // --------------------- RENDER ----------------------

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
            await fetch("/api/messages", {
              method: "POST",
              body: contenu,
            });
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
  startCall(type === "video", false); // <-- Ici initiateur = false (appel entrant)
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
