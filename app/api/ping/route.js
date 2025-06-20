export async function POST(req) {
  const raw = await req.text();
  console.log("📩 PING reçu :", raw);

  return new Response("ok");
}
