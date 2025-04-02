export async function POST(req) {
    const { captchaToken } = await req.json();
  
    if (!captchaToken) {
      return new Response(JSON.stringify({ success: false, message: "Token manquant" }), {
        status: 400,
      });
    }
  
    const secret = process.env.RECAPTCHA_SECRET_KEY;
  
    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${captchaToken}`,
    });
  
    const data = await verifyRes.json();
  
    if (!data.success) {
      return new Response(JSON.stringify({ success: false, message: "Captcha invalide" }), {
        status: 403,
      });
    }
  
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  }
  