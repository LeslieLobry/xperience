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

  // Listen notifications d'appel entrant (Ably)
  useEffect(() => {
    if (!utilisateur?.id) return;
    const channel = ably.channels.get(`notification-${utilisateur.id}`);

    const handleIncomingCall = ({ data }) => {
      setAppelEntrant(data);
      if (sonnerieRef.current) {
        sonnerieRef.current.currentTime = 0;
        sonnerieRef.current.play();
      }
      appelTimeoutRef.current = setTimeout(() => {
        setAppelEntrant(null);
        if (sonnerieRef.current) {
          sonnerieRef.current.pause();
          sonnerieRef.current.currentTime = 0;
        }
      }, 30000);
    };

    channel.subscribe("call:incoming", handleIncomingCall);

    return () => {
      channel.unsubscribe("call:incoming", handleIncomingCall);
      clearTimeout(appelTimeoutRef.current);
    };
    // eslint-disable-next-line
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
      // Si tu veux connecter côté appelant (optionnel, à ajuster selon ton flow)
      if (!inCall) {
        startCall(data.type === "video");
      }
    };

    channel.subscribe("call:accepted", handleCallAccepted);

    return () => {
      channel.unsubscribe("call:accepted", handleCallAccepted);
    };
    // eslint-disable-next-line
  }, [utilisateur?.id, inCall]);

  // Listen "call:refused" pour notif refus (appelant)
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
    // Gestion occupé : si déjà en call, prévient l'autre et ne fait rien
    if (inCall) {
      participantsAutres.forEach((p) => {
        ably.channels.get(`notification-${p.id}`).publish("call:busy", {
          from: utilisateur,
          room: conversationId,
        });
      });
      return;
    }
    if (!Room || !createLocalTracks) {
      const livekit = await import("livekit-client");
      Room = livekit.Room;
      createLocalTracks = livekit.createLocalTracks;
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

    participantsAutres.forEach((p) => {
      ably.channels.get(`notification-${p.id}`).publish("call:incoming", {
        from: utilisateur,
        room: conversationId,
        type: video ? "video" : "audio",
      });
    });
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
          const audio = new Audio();
          audio.src = URL.createObjectURL(audioBlob);
          audio.onloadedmetadata = () => {
            const d = audio.duration;
            const minutes = Math.floor(d / 60);
            const secondes = Math.floor(d % 60);
            resolve(`${minutes}:${secondes < 10 ? "0" : ""}${secondes}`);
          };
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
        onCallAudio={startCall}
        onCallVideo={startCall}
        onClose={hangupCall}
      />

      <VideoCallView
        inCall={inCall}
        remoteTracks={remoteTracks}
        startCall={startCall}
        hangupCall={hangupCall}
      />

      {loadingInitial ? (
        <Spinner />
      ) : (
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
      )}
{isTyping && typingPseudo && (
  <div className="typing-notif" style={{ color: "#888", fontStyle: "italic", margin: "0 0 4px 8px" }}>
    {typingPseudo} est en train d&apos;écrire...
  </div>
)}
      <ChatInput
        {...{
          utilisateur,
          conversationId,
          texte,
          setTexte,
          showEmojiPicker,
          setShowEmojiPicker,
          onMessageSent: async (contenu, type = "TEXTE", membreParlant) =>
            envoyerMessage(contenu, type, membreParlant),
          onTyping: envoyerTyping,
          startRecording,
          stopRecording,
          recording,
        }}
      />

      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onSelect={(emoji) => {
            setTexte((prev) => prev + emoji.native);
            setShowEmojiPicker(false);
          }} />
        </div>
      )}

      <NotificationAppelEntrant
        appel={appelEntrant}
        onAccepter={(type) => {
          clearTimeout(appelTimeoutRef.current);
          setAppelEntrant(null);
          sonnerieRef.current?.pause();
          sonnerieRef.current.currentTime = 0;
          // Ajoute l'envoi du signal call:accepted
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
          // Ajoute l'envoi du signal call:refused
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

      {/* Notifs refus et occupé */}
      {appelRefuse && (
        <div className="call-refused-notif">
          Appel refusé 📵
        </div>
      )}
      {appelOccupe && (
        <div className="call-busy-notif">
          Utilisateur occupé sur un autre appel 🚫
        </div>
      )}
    </div>
  );
}
