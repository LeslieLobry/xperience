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
const NotificationAppelEntrant = dynamic(
  () => import("../NotificationAppelEntrant/NotificationAppelEntrant"),
  { ssr: false }
);
const VideoCallView = dynamic(() => import("../VideoCallView/VideoCallView"), {
  ssr: false,
});
const EmojiPicker = dynamic(() => import("./EmojiPickerWrapper"), {
  ssr: false,
});

/* --------------------------------------------------------------------------- */
/* 🔹 Ably : singleton + helper pour éviter new Realtime partout               */
/* --------------------------------------------------------------------------- */
let ablyClient = null;

function getAblyClient() {
  if (ablyClient) return ablyClient;
  if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) {
    console.error("❌ NEXT_PUBLIC_ABLY_API_KEY manquant pour Ably");
    return null;
  }
  ablyClient = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);
  return ablyClient;
}

function publishNotification(targetId, event, data) {
  const client = getAblyClient();
  if (!client || !targetId) return;
  client.channels.get(`notification-${targetId}`).publish(event, data);
}

/* --------------------------------------------------------------------------- */
/* 🔹 LiveKit (chargé à la demande)                                            */
/* --------------------------------------------------------------------------- */
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
  const audioContextRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioDataRef = useRef({ buffer: [], length: 0 });

  // Auto-scroll maîtrisé
  const lastMsgIdRef = useRef(null);
  const skipNextAutoScrollRef = useRef(false);

  // Helpers scroll
  const SCROLL_TOLERANCE_PX = 120;
  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
    return diff < SCROLL_TOLERANCE_PX;
  };
  const scrollToBottom = (smooth = true) => {
    const el = messagesContainerRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    } else {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  };

  const {
    messages,
    lastReads,
    setMessages,
    participantsAutres,
    envoyerMessage,
    handleReaction,
    loadMoreMessages,
    hasMore,
    mutate,
    isLoading,
  } = useMessages(conversationId, utilisateur, setTexte);

  const { isTyping, typingPseudo, envoyerTyping } = useTyping(
    conversationId,
    utilisateur
  );

  /* ======================================================================= */
  /*                              USE EFFECTS                                */
  /* ======================================================================= */

  /* --------------------- Notifications d'appel Ably ---------------------- */
  useEffect(() => {
    if (!utilisateur?.id) return;
    const client = getAblyClient();
    if (!client) return;

    const channel = client.channels.get(`notification-${utilisateur.id}`);

    const handleIncomingCall = ({ data }) => {
      if (data.from?.id === utilisateur.id) return;
      if (appelEntrant || inCall) return;
      setAppelEntrant(data);
      if (sonnerieRef.current) {
        sonnerieRef.current.currentTime = 0;
        sonnerieRef.current.play().catch(() => {});
      }
    };

    const handleCallAccepted = ({ data }) => {
      setAppelEntrant(null);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      startCall(data.type === "video", false);
      setInCall(true);
      startTimer();
    };

    const handleCallRefused = () => {
      setAppelEntrant(null);
      setAppelRefuse(true);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      stopTimer();
      setTimeout(() => setAppelRefuse(false), 4000);
    };

    const handleCallBusy = () => {
      setAppelEntrant(null);
      setAppelOccupe(true);
      if (sonnerieRef.current) {
        sonnerieRef.current.pause();
        sonnerieRef.current.currentTime = 0;
      }
      stopTimer();
      setTimeout(() => setAppelOccupe(false), 4000);
    };

    const handleCallHangup = () => {
      if (participantsAutres && participantsAutres.length === 1) {
        hangupCall();
      }
    };

    channel.subscribe("call:incoming", handleIncomingCall);
    channel.subscribe("call:accepted", handleCallAccepted);
    channel.subscribe("call:refused", handleCallRefused);
    channel.subscribe("call:busy", handleCallBusy);
    channel.subscribe("call:hangup", handleCallHangup);

    return () => {
      channel.unsubscribe("call:incoming", handleIncomingCall);
      channel.unsubscribe("call:accepted", handleCallAccepted);
      channel.unsubscribe("call:refused", handleCallRefused);
      channel.unsubscribe("call:busy", handleCallBusy);
      channel.unsubscribe("call:hangup", handleCallHangup);
      clearTimeout(appelTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur?.id, appelEntrant, inCall, participantsAutres?.length]);

  /* --------------------- Prénoms couple ---------------------- */
  useEffect(() => {
    if (utilisateur.type !== "couple" || !conversationId) {
      setPrenomsCouple(null);
      return;
    }
    fetch(`/api/prenoms-couple?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.prenoms) setPrenomsCouple(data.prenoms);
        else setPrenomsCouple(null);
      })
      .catch(() => setPrenomsCouple(null));
  }, [conversationId, utilisateur.type]);
// 🔁 Quand la conversation change, on reset l'état de scroll
useEffect(() => {
  setLoadingInitial(true);
  lastMsgIdRef.current = null;
  skipNextAutoScrollRef.current = false;
}, [conversationId]);

// --------------------- Scroll initial quand les messages sont là ----------------------
useEffect(() => {
  if (!messages?.length || !loadingInitial) return;

  const lastMsg = messages[messages.length - 1];

  // ⚠️ Si les messages sont encore ceux de l’ancienne conversation, on ignore
  if (
    lastMsg?.conversationId &&
    Number(lastMsg.conversationId) !== Number(conversationId)
  ) {
    return;
  }

  // On force le scroll en bas SANS animation quand on ouvre la conversation
  scrollToBottom(false);
  lastMsgIdRef.current = lastMsg?.id || null;

  // On considère que le chargement initial est terminé pour CETTE conversation
  setLoadingInitial(false);
}, [messages, loadingInitial, conversationId]);

  /* --------------------- Auto-scroll intelligent ---------------------- */
  useEffect(() => {
    if (!messages?.length) return;

    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      lastMsgIdRef.current =
        messages[messages.length - 1]?.id || lastMsgIdRef.current;
      return;
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    const isNew = lastMsgIdRef.current !== lastMsg.id;
    lastMsgIdRef.current = lastMsg.id;
    if (!isNew) return;

    // si c'est toi qui viens d'envoyer → scroll
    if (lastMsg.auteurId === utilisateur?.id) {
      scrollToBottom(true);
      return;
    }

    // nouveau message entrant → scroll seulement si on est déjà près du bas
    if (isNearBottom()) {
      scrollToBottom(true);
    }
  }, [messages, utilisateur?.id]);

  /* --------------------- Cleanup global à l’unmount ---------------------- */
  useEffect(() => {
    return () => {
      stopTimer();
      stopAllMediaStreams();
      if (room) {
        room.disconnect().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======================================================================= */
  /*                              TIMER APPEL                                */
  /* ======================================================================= */

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

  /* ======================================================================= */
  /*                              APPEL LIVEKIT                              */
  /* ======================================================================= */

  const startCall = async (video = true, initiateur = true) => {
    if (inCall) {
      (participantsAutres || []).forEach((p) => {
        if (p.id !== utilisateur.id) {
          publishNotification(p.id, "call:busy", {
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

    if (initiateur) {
      (participantsAutres || [])
        .filter((p) => p.id !== utilisateur.id)
        .forEach((p) => {
          publishNotification(p.id, "call:incoming", {
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
      const id = participant.identity + "-" + track.kind;
      setRemoteTracks((prev) => [
        ...prev.filter((t) => t.id !== id),
        { id, nom: participant.identity, track },
      ]);
    });

    newRoom.on("trackUnsubscribed", (track, publication, participant) => {
      const id = participant.identity + "-" + track.kind;
      setRemoteTracks((prev) => prev.filter((t) => t.id !== id));
    });

    await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);

    const localTracks = await createLocalTracks({ audio: true, video });

    const localVideoTrack = localTracks.find((t) => t.kind === "video");
    if (localVideoTrack) {
      window.localVideoTrack = localVideoTrack;
    }

    localTracks.forEach((track) =>
      newRoom.localParticipant.publishTrack(track)
    );

    setInCall(true);
    startTimer();
  };

  const hangupCall = () => {
    if (room) {
      if (participantsAutres && participantsAutres.length === 1) {
        const otherId = participantsAutres[0]?.id;
        if (otherId && utilisateur.id !== otherId) {
          publishNotification(otherId, "call:hangup", {
            from: utilisateur,
            room: conversationId,
          });
        }
      }

      room.localParticipant?.tracks?.forEach((pub) => pub.track?.stop());

      room.disconnect().then(() => {
        setRoom(null);
        setRemoteTracks([]);
        setInCall(false);
        stopTimer();
        stopAllMediaStreams();
      });
    } else {
      setInCall(false);
      stopTimer();
      stopAllMediaStreams();
    }
  };

  function stopAllMediaStreams() {
    document.querySelectorAll("video, audio").forEach((el) => {
      if (el.srcObject && el.srcObject.getTracks) {
        el.srcObject.getTracks().forEach((track) => track.stop());
        el.srcObject = null;
      }
    });
    if (window.localStream && window.localStream.getTracks) {
      window.localStream.getTracks().forEach((track) => track.stop());
      window.localStream = null;
    }
    if (window.localVideoTrack) {
      window.localVideoTrack.stop();
      delete window.localVideoTrack;
    }
  }

  /* ======================================================================= */
  /*                         ENREGISTREMENT AUDIO                            */
  /* ======================================================================= */

  const startRecording = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const source = audioCtx.createMediaStreamSource(mediaStreamRef.current);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      audioDataRef.current = { buffer: [], length: 0 };

      processor.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        audioDataRef.current.buffer.push(new Float32Array(channelData));
        audioDataRef.current.length += channelData.length;
      };

      setRecording(true);
    } catch (err) {
      console.error("Erreur démarrage enregistrement :", err);
    }
  };

  const stopRecording = async () => {
    if (!audioContextRef.current) return;

    const sampleRate = audioContextRef.current.sampleRate || 44100;
    scriptProcessorRef.current.disconnect();
    audioContextRef.current.close();

    mediaStreamRef.current.getTracks().forEach((t) => t.stop());

    const flatBuffer = flattenBuffers(
      audioDataRef.current.buffer,
      audioDataRef.current.length
    );
    const wavBlob = encodeWAV(flatBuffer, sampleRate);

    audioDataRef.current = { buffer: [], length: 0 };
    setRecording(false);

    const formData = new FormData();
    formData.append("audio", wavBlob, "recording.wav");
    formData.append("conversationId", conversationId);
    formData.append("type", "AUDIO");

    try {
      await fetch("/api/messages/audio", { method: "POST", body: formData });
    } catch (e) {
      console.error("Erreur upload audio :", e);
    }
  };

  function flattenBuffers(buffers, length) {
    const result = new Float32Array(length);
    let offset = 0;
    buffers.forEach((buffer) => {
      result.set(buffer, offset);
      offset += buffer.length;
    });
    return result;
  }

  function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: "audio/wav" });
  }

  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      output.setInt16(offset, s, true);
    }
  }

  /* ======================================================================= */
  /*                          HANDLERS MESSAGES                              */
  /* ======================================================================= */

  const handleDelete = async (messageId) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              messages: currentData.messages.filter(
                (m) => m.id !== messageId
              ),
            };
          },
          false
        );
      }
    } catch (err) {
      console.error("Erreur suppression message :", err);
    }
  };

  const handleAddParticipant = async () => {
    setAddUserError("");
    if (!addUserInput.trim())
      return setAddUserError("Champ vide !");
    setAddUserLoading(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/add-participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIdOrPseudo: addUserInput.trim() }),
        }
      );
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

  /* --------------------- BACK HANDLER ---------------------- */
  const handleBackClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    skipNextAutoScrollRef.current = true;
    onBack?.();
  };

  /* ======================================================================= */
  /*                                 RENDER                                  */
  /* ======================================================================= */

  return (
    <div className="chatbox-container">
      <ChatHeader
        participants={participantsAutres}
        inCall={inCall}
        onCallAudio={() => startCall(false)}
        onCallVideo={() => startCall(true)}
        onClose={hangupCall}
        onAddParticipant={() => setShowAddParticipant(true)}
        onBack={handleBackClick}
      />

      {inCall && <div className="call-timer-badge">⏱️ {callDuration}</div>}

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
        ref={messagesContainerRef}
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

      <div ref={messagesEndRef} />

      {isTyping && typingPseudo && (
        <div className="typing-notif">
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
        onMessageSent={async (
          contenu,
          type = "TEXTE",
          membreParlant,
          isImage = false
        ) => {
          const tmpId =
            "tmp-" +
            Date.now() +
            "-" +
            Math.floor(Math.random() * 10000);

          let optimisticMessage;
          if (isImage && contenu instanceof FormData) {
            optimisticMessage = {
              id: tmpId,
              auteurId: utilisateur.id,
              auteur: utilisateur,
              pseudo: utilisateur.pseudo,
              type: contenu.get("type") || "IMAGE",
              contenu: "[Image]",
              createdAt: new Date().toISOString(),
              statut: "pending",
              ephemere:
                !!contenu.get("type") &&
                contenu.get("type").toUpperCase() === "EPHEMERE",
            };
          } else if (type === "AUDIO") {
            optimisticMessage = {
              id: tmpId,
              auteurId: utilisateur.id,
              auteur: utilisateur,
              pseudo: utilisateur.pseudo,
              type,
              contenu: "[Audio]",
              createdAt: new Date().toISOString(),
              statut: "pending",
              ephemere: false,
            };
          } else {
            optimisticMessage = {
              id: tmpId,
              auteurId: utilisateur.id,
              auteur: utilisateur,
              pseudo: utilisateur.pseudo,
              type: type || "TEXTE",
              contenu:
                typeof contenu === "string"
                  ? contenu
                  : contenu.contenu,
              createdAt: new Date().toISOString(),
              statut: "pending",
              ephemere: type === "EPHEMERE",
            };
          }

          mutate(
            (old) => ({
              ...old,
              messages: [...(old?.messages || []), optimisticMessage],
            }),
            false
          );

          scrollToBottom(true);

          try {
            let result;
            if (isImage && contenu instanceof FormData) {
              const res = await fetch("/api/messages", {
                method: "POST",
                body: contenu,
              });
              result = await res.json();
              if (result?.message?.id) {
                mutate();
              }
            } else {
              const message = await envoyerMessage(
                contenu,
                type,
                membreParlant
              );
              if (message?.id) {
                mutate();
              }
            }
          } catch (err) {
            mutate(
              (old) => ({
                ...old,
                messages: (old?.messages || []).map((m) =>
                  m.id === tmpId ? { ...m, statut: "failed" } : m
                ),
              }),
              false
            );
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
        appel={
          appelEntrant && appelEntrant.from?.id !== utilisateur.id
            ? appelEntrant
            : null
        }
        onAccepter={(type) => {
          clearTimeout(appelTimeoutRef.current);
          setAppelEntrant(null);
          sonnerieRef.current?.pause();
          if (sonnerieRef.current) {
            sonnerieRef.current.currentTime = 0;
          }
          if (appelEntrant?.from?.id) {
            publishNotification(appelEntrant.from.id, "call:accepted", {
              from: utilisateur,
              room: conversationId,
              type,
            });
          }
          startCall(type === "video", false);
          setInCall(true);
          startTimer();
        }}
        onRefuser={() => {
          clearTimeout(appelTimeoutRef.current);
          setAppelEntrant(null);
          sonnerieRef.current?.pause();
          if (sonnerieRef.current) {
            sonnerieRef.current.currentTime = 0;
          }
          if (appelEntrant?.from?.id) {
            publishNotification(appelEntrant.from.id, "call:refused", {
              from: utilisateur,
              room: conversationId,
            });
          } else {
            (participantsAutres || []).forEach((p) => {
              publishNotification(p.id, "call:refused", {
                from: utilisateur,
                room: conversationId,
              });
            });
          }
          stopTimer();
        }}
      />

      <audio ref={sonnerieRef} src="/sonnerie.mp3" preload="auto" />

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
