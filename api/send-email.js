// api/send-email.js
import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }
  const { to, subject, text, html, turnstileToken } = req.body;

  if (!turnstileToken) {
    return res.status(400).json({ error: { message: "Security check token missing. Please try again." } });
  }

  // Use environment variable, or fallback to Cloudflare's always-pass testing secret
  const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

  try {
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(turnstileToken)}`
    });

    const verifyData = await verifyResponse.json();
    if (!verifyData.success) {
      return res.status(403).json({ error: { message: "Security check failed. Are you a bot?" } });
    }
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return res.status(500).json({ error: { message: "Internal server error during security check." } });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // Must use this for unverified domains
      to,
      subject,
      text,
      html,
    });

    if (error) return res.status(400).json({ error });
    return res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}