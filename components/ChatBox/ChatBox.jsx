"use client";

import {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { Realtime } from "ably";
import dynamic from "next/dynamic";
import ChatInput from "../ChatInput/ChatInput";
import { useMessages } from "../../hook/useMessages";
import { useTyping } from "../../hook/useTyping";
import AddParticipantList from "../AddParticipantList/AddParticipantList";
import "./ChatBox.css";

import ChatHeader from "./ChatHeader";

// ✅ PERF: MessagesList en dynamic pour éviter le gros freeze au clic
const MessagesList = dynamic(() => import("../MessagesList"), {
  ssr: false,
  loading: () => (
    <div className="chat-messages" style={{ padding: 6, opacity: 0.6 }}>
      {/* rien ou mini loader */}
    </div>
  ),
});

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
/* 🔹 Ably : singleton + authUrl (fallback clé publique)                       */
/* --------------------------------------------------------------------------- */
let ablyClient = null;

function getAblyClient() {
  if (ablyClient) return ablyClient;

  try {
    ablyClient = new Realtime({
      authUrl: "/api/ably/token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
    });
    return ablyClient;
  } catch (_) {}

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

function runIdle(fn, timeout = 1200) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 250);
  return () => clearTimeout(t);
}

export default function ChatBox({
  conversationId,
  utilisateur,
  onBack,
  initialParticipants = [],
}) {
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
  const [showEditPrenoms, setShowEditPrenoms] = useState(false);
  const [prenom1, setPrenom1] = useState("");
  const [prenom2, setPrenom2] = useState("");
  const [savingPrenoms, setSavingPrenoms] = useState(false);
  const [errorPrenoms, setErrorPrenoms] = useState("");

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
  const callTimerRef = useRef(null);
  const audioContextRef = useRef(null);

  // ✅ IMPORTANT: on référence MessagesList (handle), pas un div direct
  // -> MessagesList doit être forwardRef + expose { scrollToBottom(), getEl() }
  const messagesListRef = useRef(null);

  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioDataRef = useRef({ buffer: [], length: 0 });

  const roomRef = useRef(null);
  const appelEntrantRef = useRef(null);
  const inCallRef = useRef(false);
  const participantsAutresRef = useRef(null);

  // Auto-scroll maîtrisé
  const lastMsgIdRef = useRef(null);
  const skipNextAutoScrollRef = useRef(false);
  const hasScrolledInitialRef = useRef(false);

  // ✅ Perf: état "at bottom" maintenu par listener scroll
  const atBottomRef = useRef(true);
  const SCROLL_TOLERANCE_PX = 140;

  // ✅ helper: récupérer le vrai élément scrollable
  const getScrollEl = useCallback(() => {
    const handle = messagesListRef.current;
    if (!handle) return null;
    if (typeof handle.getEl === "function") return handle.getEl();
    if (handle.el) return handle.el;
    return null;
  }, []);

  /* =========================================================
     ✅ FIX iOS clavier / vh : stabilise l’écran quand le clavier s’ouvre
     (tu l'avais 2 fois -> on garde UNE seule version propre)
     ========================================================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const setVh = () => {
      const h = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };

    setVh();
    window.visualViewport?.addEventListener("resize", setVh);
    window.addEventListener("resize", setVh);

    return () => {
      window.visualViewport?.removeEventListener("resize", setVh);
      window.removeEventListener("resize", setVh);
    };
  }, []);

  const computeIsNearBottom = useCallback(() => {
    const el = getScrollEl();
    if (!el) return true;
    const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
    return diff < SCROLL_TOLERANCE_PX;
  }, [getScrollEl]);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const handle = messagesListRef.current;
      const el = getScrollEl();
      if (!el) return;

      // ✅ si MessagesList expose une méthode, on l'utilise (plus fiable iOS)
      if (handle && typeof handle.scrollToBottom === "function") {
        handle.scrollToBottom(smooth ? "smooth" : "auto");
        return;
      }

      if (smooth && el.scrollTo) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    },
    [getScrollEl]
  );

  // ✅ Re-scroll si la hauteur change (images/presign/etc.)
  // ➜ actif tant que l’utilisateur est en bas (ou pendant l’ouverture)
  useEffect(() => {
    if (!conversationId) return;
    if (typeof ResizeObserver === "undefined") return;

    const el = getScrollEl();
    if (!el) return;

    let raf1 = null;
    let raf2 = null;

    const reScroll = () => {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (loadingInitial || atBottomRef.current) {
            scrollToBottom(false);
          }
        });
      });
    };

    reScroll();

    const ro = new ResizeObserver(() => {
      reScroll();
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [conversationId, loadingInitial, scrollToBottom, getScrollEl]);

  // ✅ MEGA PERF: précharge le chunk MessagesList dès que la ChatBox est montée
  useEffect(() => {
    import("../MessagesList").catch(() => {});
  }, []);

  const {
    messages,
    lastReads,
    participantsAutres,
    envoyerMessage,
    handleReaction,
    loadMoreMessages,
    hasMore,
    mutate,
    isLoading,
  } = useMessages(conversationId, utilisateur, setTexte);

  const lastNonEmptyParticipantsRef = useRef(initialParticipants);
  useEffect(() => {
    if (Array.isArray(initialParticipants) && initialParticipants.length > 0) {
      lastNonEmptyParticipantsRef.current = initialParticipants;
    }
  }, [initialParticipants]);

  useEffect(() => {
    if (Array.isArray(participantsAutres) && participantsAutres.length > 0) {
      lastNonEmptyParticipantsRef.current = participantsAutres;
    }
  }, [participantsAutres]);

  const displayParticipantsAutres = useMemo(() => {
    if (Array.isArray(participantsAutres) && participantsAutres.length > 0) {
      return participantsAutres;
    }
    return lastNonEmptyParticipantsRef.current || [];
  }, [participantsAutres]);

  // ✅ Optimistic UI: afficher la réaction immédiatement (sans refresh)
  const toggleReactionLocal = useCallback((reactions = [], emoji, userId) => {
    const rx = Array.isArray(reactions) ? [...reactions] : [];
    const idx = rx.findIndex(
      (r) =>
        r?.emoji === emoji &&
        (r?.utilisateurId === userId || r?.userId === userId)
    );

    if (idx >= 0) rx.splice(idx, 1);
    else rx.push({ emoji, utilisateurId: userId });

    return rx;
  }, []);

  const handleReactionOptimistic = useCallback(
    async (messageId, emoji) => {
      mutate(
        (old) => {
          const list = old?.messages || old?.data || old || [];
          if (old?.messages) {
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      reactions: toggleReactionLocal(
                        m.reactions,
                        emoji,
                        utilisateur?.id
                      ),
                    }
                  : m
              ),
            };
          }

          if (Array.isArray(list)) {
            return list.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reactions: toggleReactionLocal(
                      m.reactions,
                      emoji,
                      utilisateur?.id
                    ),
                  }
                : m
            );
          }

          return old;
        },
        false
      );

      try {
        await handleReaction(messageId, emoji);
      } catch (e) {
        console.error("Erreur reaction:", e);
        mutate(
          (old) => {
            if (!old?.messages) return old;
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      reactions: toggleReactionLocal(
                        m.reactions,
                        emoji,
                        utilisateur?.id
                      ),
                    }
                  : m
              ),
            };
          },
          false
        );
      }
    },
    [handleReaction, mutate, toggleReactionLocal, utilisateur?.id]
  );

  const { isTyping, typingPseudo, envoyerTyping } = useTyping(
    conversationId,
    utilisateur
  );

  const participantsWithMe = useMemo(() => {
    const others = Array.isArray(displayParticipantsAutres)
      ? displayParticipantsAutres
      : [];
    return others.concat(utilisateur);
  }, [displayParticipantsAutres, utilisateur]);

  /* ======================================================================= */
  /*                        SYNC REFS AVEC LES STATES                        */
  /* ======================================================================= */
  useEffect(() => {
    appelEntrantRef.current = appelEntrant;
  }, [appelEntrant]);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  useEffect(() => {
    participantsAutresRef.current = participantsAutres;
  }, [participantsAutres]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  /* ======================================================================= */
  /* ✅ LISTENER scroll : met à jour atBottomRef (passive)                    */
  /* ======================================================================= */
  useEffect(() => {
    const el = getScrollEl();
    if (!el) return;

    const onScroll = () => {
      atBottomRef.current = computeIsNearBottom();
    };

    atBottomRef.current = computeIsNearBottom();

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [computeIsNearBottom, getScrollEl]);

  /* ======================================================================= */
  /*                              USE EFFECTS                                */
  /* ======================================================================= */

  // ✅ Préload LiveKit en idle (moins de freeze au 1er appel)
  useEffect(() => {
    return runIdle(async () => {
      try {
        if (!Room || !createLocalTracks) {
          const livekit = await import("livekit-client");
          Room = livekit.Room;
          createLocalTracks = livekit.createLocalTracks;
        }
      } catch (_) {}
    }, 1800);
  }, []);

  /* --------------------- Notifications d'appel Ably ---------------------- */
  useEffect(() => {
    if (!utilisateur?.id) return;
    const client = getAblyClient();
    if (!client) return;

    const channel = client.channels.get(`notification-${utilisateur.id}`);

    const handleIncomingCall = ({ data }) => {
      if (data.from?.id === utilisateur.id) return;
      if (appelEntrantRef.current || inCallRef.current) return;
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
      const others = participantsAutresRef.current;
      if (others && others.length === 1) {
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
  }, [utilisateur?.id]);

  /* --------------------- Prénoms couple (idle + abort) ------------------- */
  useEffect(() => {
    if (utilisateur.type !== "couple" || !conversationId) {
      setPrenomsCouple(null);
      return;
    }

    let cancelIdle = null;
    const controller = new AbortController();

    cancelIdle = runIdle(() => {
      fetch(`/api/prenoms-couple?conversationId=${conversationId}`, {
        signal: controller.signal,
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.prenoms) setPrenomsCouple(data.prenoms);
          else setPrenomsCouple(null);
        })
        .catch(() => setPrenomsCouple(null));
    }, 800);

    return () => {
      try {
        controller.abort();
      } catch (_) {}
      if (typeof cancelIdle === "function") cancelIdle();
    };
  }, [conversationId, utilisateur.type]);

  useEffect(() => {
    if (prenomsCouple) {
      setPrenom1(prenomsCouple.prenom1 || "");
      setPrenom2(prenomsCouple.prenom2 || "");
    } else {
      setPrenom1("");
      setPrenom2("");
    }
  }, [prenomsCouple]);

  useEffect(() => {
    setLoadingInitial(true);
    lastMsgIdRef.current = null;
    skipNextAutoScrollRef.current = false;
    hasScrolledInitialRef.current = false;
  }, [conversationId]);

  // ✅ scroll initial: iPhone friendly
  useLayoutEffect(() => {
    if (!conversationId) return;
    if (!loadingInitial) return;
    if (!messages?.length) return;

    let tries = 0;
    const maxTries = 8;

    const attempt = () => {
      tries += 1;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = getScrollEl();
          if (!el) {
            if (tries < maxTries) setTimeout(attempt, 60);
            return;
          }

          scrollToBottom(false);
          hasScrolledInitialRef.current = true;
          lastMsgIdRef.current = messages[messages.length - 1]?.id || null;
          setLoadingInitial(false);
        });
      });
    };

    attempt();
  }, [
    conversationId,
    loadingInitial,
    messages?.length,
    scrollToBottom,
    getScrollEl,
  ]);

  // ✅ auto-scroll new messages (uniquement si on est en bas)
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

    if (lastMsg.auteurId === utilisateur?.id) {
      scrollToBottom(true);
      return;
    }

    if (atBottomRef.current) {
      scrollToBottom(true);
    }
  }, [messages?.length, utilisateur?.id, scrollToBottom]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopAllMediaStreams();
      if (roomRef.current) {
        roomRef.current.disconnect().catch(() => {});
      }
    };
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
    if (inCallRef.current) {
      (participantsAutresRef.current || []).forEach((p) => {
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
      (participantsAutresRef.current || [])
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
    roomRef.current = newRoom;

    newRoom.on("participantConnected", (participant) => {
      console.log("[LiveKit] participantConnected", participant.identity);
    });

    newRoom.on("participantDisconnected", (participant) => {
      console.log("[LiveKit] participantDisconnected", participant.identity);
    });

    newRoom.on("trackSubscribed", (track, publication, participant) => {
      const id = participant.identity + "-" + track.kind;
      setRemoteTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        return [...filtered, { id, nom: participant.identity, track }];
      });
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
    inCallRef.current = true;
    startTimer();
  };

  const hangupCall = () => {
    const currentRoom = roomRef.current;

    if (currentRoom) {
      const others = participantsAutresRef.current;
      if (others && others.length === 1) {
        const otherId = others[0]?.id;
        if (otherId && utilisateur.id !== otherId) {
          publishNotification(otherId, "call:hangup", {
            from: utilisateur,
            room: conversationId,
          });
        }
      }

      currentRoom.localParticipant?.tracks?.forEach((pub) => pub.track?.stop());

      currentRoom.disconnect().then(() => {
        roomRef.current = null;
        setRoom(null);
        setRemoteTracks([]);
        setInCall(false);
        inCallRef.current = false;
        stopTimer();
        stopAllMediaStreams();
      });
    } else {
      setInCall(false);
      inCallRef.current = false;
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
      const res = await fetch("/api/messages/audio", {
        method: "POST",
        body: formData,
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Erreur API upload audio :", result);
        throw new Error(result?.error || "Erreur upload audio");
      }

      // ✅ adapte si ton endpoint ne renvoie pas { message: ... }
      const savedMessage = result?.message || result;

      if (!savedMessage?.id) {
        console.error("Réponse audio inattendue :", result);
        throw new Error("Réponse audio invalide (message manquant)");
      }

      // ✅ injecte le message final (anti-doublon si Ably renvoie aussi)
      mutate(
        (old) => {
          const list = old?.messages || [];
          if (list.some((m) => m.id === savedMessage.id)) return old;
          return {
            ...old,
            messages: [...list, { ...savedMessage, statut: "sent" }],
          };
        },
        false
      );

      scrollToBottom(true);
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
              messages: currentData.messages.filter((m) => m.id !== messageId),
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
    if (!addUserInput.trim()) return setAddUserError("Champ vide !");
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

  const handleBackClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    skipNextAutoScrollRef.current = true;
    onBack?.();
  };

  const handleSavePrenomsCouple = async () => {
    setErrorPrenoms("");

    const p1 = (prenom1 || "").trim();
    const p2 = (prenom2 || "").trim();

    if (!p1 || !p2) {
      setErrorPrenoms("Les deux prénoms sont obligatoires.");
      return;
    }

    if (!conversationId) {
      setErrorPrenoms("Conversation introuvable.");
      return;
    }

    setSavingPrenoms(true);

    try {
      const res = await fetch("/api/prenoms-couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          prenom1: p1,
          prenom2: p2,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setErrorPrenoms(
          data?.message || data?.error || "Erreur lors de l'enregistrement."
        );
        setSavingPrenoms(false);
        return;
      }

      setPrenomsCouple(data.prenoms);
      setSavingPrenoms(false);
      setShowEditPrenoms(false);
    } catch (err) {
      console.error("Erreur sauvegarde prénoms couple :", err);
      setErrorPrenoms("Erreur réseau.");
      setSavingPrenoms(false);
    }
  };

  const userWithPrenoms = useMemo(() => {
    return prenomsCouple
      ? {
          ...utilisateur,
          prenom1: prenomsCouple.prenom1 || utilisateur.prenom1,
          prenom2: prenomsCouple.prenom2 || utilisateur.prenom2,
        }
      : utilisateur;
  }, [prenomsCouple, utilisateur]);

  // ✅ remplace le message tmp par le message final (serveur)
  const replaceTmpMessage = useCallback(
    (tmpId, realMsg) => {
      mutate(
        (old) => ({
          ...old,
          messages: (old?.messages || []).map((m) =>
            m.id === tmpId ? { ...realMsg, statut: "sent" } : m
          ),
        }),
        false
      );
    },
    [mutate]
  );

  const handleMessageSent = useCallback(
    async (contenu, type = "TEXTE", membreParlant, isImage = false) => {
      const tmpId =
        "tmp-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

      let optimisticMessage;

      if (isImage && contenu instanceof FormData) {
        optimisticMessage = {
          id: tmpId,
          auteurId: utilisateur.id,
          auteur: utilisateur,
          pseudo: utilisateur.pseudo,
          type: "IMAGE",
          contenu: "[Image]",
          createdAt: new Date().toISOString(),
          statut: "pending",
          ephemere: false,
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
          contenu: typeof contenu === "string" ? contenu : contenu?.contenu,
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
        if (isImage && contenu instanceof FormData) {
          const res = await fetch("/api/messages", {
            method: "POST",
            body: contenu,
          });
          const result = await res.json();
          if (!res.ok || !result?.message?.id) {
            throw new Error("Erreur enregistrement image");
          }

          // ✅ remplace tmp par message final (imageUrl dispo)
          replaceTmpMessage(tmpId, result.message);
        } else {
          const message = await envoyerMessage(contenu, type, membreParlant);
          if (!message?.id) throw new Error("Message non créé");

          // ✅ remplace tmp par message final (texte/éphémère)
          replaceTmpMessage(tmpId, message);
        }
      } catch (err) {
        console.error("Erreur envoi message :", err);
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
    },
    [envoyerMessage, mutate, scrollToBottom, utilisateur, replaceTmpMessage]
  );

  return (
    <div className="chatbox-container">
      {/* ✅ wrapper sticky fiable */}
      <div className="chat-header-wrapper">
        <ChatHeader
          participants={displayParticipantsAutres}
          inCall={inCall}
          onCallAudio={() => startCall(false)}
          onCallVideo={() => startCall(true)}
          onClose={hangupCall}
          onAddParticipant={() => setShowAddParticipant(true)}
          onBack={handleBackClick}
        />
      </div>

      {utilisateur?.type === "couple" && (
        <div className="couple-prenoms-bar">
          <span>
            Prénoms du couple :{" "}
            <strong>
              {prenom1 ||
                prenomsCouple?.prenom1 ||
                utilisateur?.prenom1 ||
                "Membre 1"}
            </strong>{" "}
            &{" "}
            <strong>
              {prenom2 ||
                prenomsCouple?.prenom2 ||
                utilisateur?.prenom2 ||
                "Membre 2"}
            </strong>
          </span>
          <button
            type="button"
            className="btn-edit-prenoms"
            onClick={() => setShowEditPrenoms(true)}
          >
            Modifier
          </button>
        </div>
      )}

      {showEditPrenoms && utilisateur?.type === "couple" && (
        <div className="edit-prenoms-modal">
          <div className="edit-prenoms-modal__content">
            <h3>Modifier les prénoms du couple</h3>

            <label className="edit-prenoms-modal__label">
              Prénom 1
              <input
                type="text"
                value={prenom1}
                onChange={(e) => setPrenom1(e.target.value)}
              />
            </label>

            <label className="edit-prenoms-modal__label">
              Prénom 2
              <input
                type="text"
                value={prenom2}
                onChange={(e) => setPrenom2(e.target.value)}
              />
            </label>

            {errorPrenoms && (
              <div className="edit-prenoms-modal__error">{errorPrenoms}</div>
            )}

            <div className="edit-prenoms-modal__buttons">
              <button
                type="button"
                onClick={() => {
                  setShowEditPrenoms(false);
                  setErrorPrenoms("");
                }}
                disabled={savingPrenoms}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSavePrenomsCouple}
                disabled={savingPrenoms}
              >
                {savingPrenoms ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {inCall && <div className="call-timer-badge">⏱️ {callDuration}</div>}

      {showAddParticipant && (
        <div className="add-participant-modal">
          <h3>Ajouter un membre</h3>
          <AddParticipantList
            conversationId={conversationId}
            participants={participantsWithMe}
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
        ref={messagesListRef}
        conversationId={conversationId}
        messages={messages}
        utilisateur={userWithPrenoms}
        onReact={handleReactionOptimistic}
        lastReads={lastReads}
        typingPseudo={isTyping ? typingPseudo : null}
        hasMore={hasMore}
        onLoadMore={loadMoreMessages}
        onDelete={handleDelete}
        prenomsCouple={prenomsCouple}
      />

      <ChatInput
        utilisateur={utilisateur}
        conversationId={conversationId}
        texte={texte}
        setTexte={setTexte}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        onMessageSent={handleMessageSent}
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
          if (sonnerieRef.current) sonnerieRef.current.currentTime = 0;

          if (appelEntrant?.from?.id) {
            publishNotification(appelEntrant.from.id, "call:accepted", {
              from: utilisateur,
              room: conversationId,
              type,
            });
          }

          startCall(type === "video", false);
          setInCall(true);
          inCallRef.current = true;
          startTimer();
        }}
        onRefuser={() => {
          clearTimeout(appelTimeoutRef.current);
          setAppelEntrant(null);
          sonnerieRef.current?.pause();
          if (sonnerieRef.current) sonnerieRef.current.currentTime = 0;

          if (appelEntrant?.from?.id) {
            publishNotification(appelEntrant.from.id, "call:refused", {
              from: utilisateur,
              room: conversationId,
            });
          } else {
            (participantsAutresRef.current || []).forEach((p) => {
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

      {appelRefuse && <div className="call-refused-notif">Appel refusé 📵</div>}
      {appelOccupe && (
        <div className="call-busy-notif">
          Utilisateur occupé sur un autre appel 🚫
        </div>
      )}
    </div>
  );
}
