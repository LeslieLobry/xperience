// lib/presenceManager.js
import { getAbly } from "./ably";

const g = globalThis;

function ensureState() {
  if (!g.__xpPresence) {
    g.__xpPresence = {
      started: false,
      refCount: 0,
      channel: null,
      online: new Map(), // clientId(string) -> true
      listeners: new Set(), // callbacks
      handler: null,
      userId: null,
    };
  }
  return g.__xpPresence;
}

// ✅ helper: récupère un id fiable depuis un member/message Ably Presence
function pickId(obj) {
  // Priorité absolue: clientId (fiable et identique web+app)
  const cid = obj?.clientId;
  if (cid !== null && cid !== undefined && String(cid).trim()) return String(cid).trim();

  // fallback (si un jour tu remets userId dans data)
  const did = obj?.data?.userId;
  if (did !== null && did !== undefined && String(did).trim()) return String(did).trim();

  return null;
}

export async function startPresence(userId) {
  const st = ensureState();
  st.refCount += 1;

  if (!userId) return () => stopPresence();

  // déjà démarré
  if (st.started && st.userId === String(userId)) return () => stopPresence();

  const ably = getAbly();
  if (!ably) return () => stopPresence();

  st.userId = String(userId);
  st.channel = ably.channels.get("presence:online");

  // handler unique
  st.handler = (msg) => {
    const id = pickId(msg);
    if (!id) return;

    if (msg.action === "leave") st.online.delete(id);
    else st.online.set(id, true);

    const snapshot = Array.from(st.online.keys());
    st.listeners.forEach((cb) => cb(snapshot));
  };

  // subscribe unique
  st.channel.presence.subscribe(st.handler);

  // snapshot initial
  st.channel.presence.get((err, members) => {
    if (err) return;
    st.online.clear();

    (members || []).forEach((m) => {
      const id = pickId(m);
      if (id) st.online.set(id, true);
    });

    const snapshot = Array.from(st.online.keys());
    st.listeners.forEach((cb) => cb(snapshot));
  });

  // ✅ enter: pas besoin d'envoyer userId en data (optionnel)
  // On peut quand même envoyer le userId en data pour debug, mais pas obligatoire
  st.channel.presence.enter({ userId: st.userId }, () => {});

  st.started = true;

  return () => stopPresence();
}

export function subscribePresence(cb) {
  const st = ensureState();
  st.listeners.add(cb);

  // push l’état actuel immédiatement
  cb(Array.from(st.online.keys()));

  return () => {
    st.listeners.delete(cb);
  };
}

function stopPresence() {
  const st = ensureState();
  st.refCount = Math.max(st.refCount - 1, 0);

  // seul le dernier stoppe réellement
  if (st.refCount !== 0) return;

  try {
    if (st.channel && st.handler) st.channel.presence.unsubscribe(st.handler);
  } catch {}
  try {
    if (st.channel) st.channel.presence.leave();
  } catch {}

  st.started = false;
  st.channel = null;
  st.handler = null;
  st.userId = null;
  st.online.clear();
}
