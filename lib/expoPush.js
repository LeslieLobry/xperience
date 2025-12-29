export async function sendExpoPush({ to, title, body, data }) {
  const payload = {
    to,
    sound: "default",
    title,
    body,
    data: data || {},
    priority: "high",
  };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}
