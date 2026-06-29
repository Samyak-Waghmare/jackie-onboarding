import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cloud speech-to-text via Groq Whisper (free tier). This is what makes the
 * voice flow work on iPhone Safari, which has no Web Speech API. The client
 * only calls this when the browser's built-in recognition is unavailable.
 *
 * Requires GROQ_API_KEY in the environment. Without it we return
 * { text: null, reason: "no-key" } and the client falls back to typing.
 */
export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ text: null, reason: "no-key" });

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return Response.json({ text: null, reason: "bad-request" }, { status: 400 });
  }

  const audio = inForm.get("audio");
  if (!(audio instanceof Blob)) {
    return Response.json({ text: null, reason: "no-audio" }, { status: 400 });
  }

  const filename =
    audio instanceof File && audio.name ? audio.name : "audio.webm";
  const language = (inForm.get("language") as string) || "en";

  try {
    const upstream = new FormData();
    upstream.append("file", audio, filename);
    upstream.append("model", "whisper-large-v3-turbo");
    upstream.append("response_format", "json");
    upstream.append("language", language.slice(0, 2));
    upstream.append("temperature", "0");

    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: upstream,
      }
    );

    if (!res.ok) {
      return Response.json({ text: null, reason: "upstream", status: res.status });
    }
    const data = await res.json();
    return Response.json({ text: (data?.text ?? "").trim() || null });
  } catch {
    return Response.json({ text: null, reason: "exception" });
  }
}
