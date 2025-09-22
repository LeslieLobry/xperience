export async function sendPush(to, payload) {
  const tokens = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!tokens.length) return;

  const messages = tokens.map((t) => ({
    to: t,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
}
