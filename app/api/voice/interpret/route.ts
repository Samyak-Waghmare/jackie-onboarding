import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * OPTIONAL intelligence layer. The voice flow works fully without this — it
 * only calls here when the on-device rule parser can't read an answer. If no
 * GROQ_API_KEY is configured, we return { value: null } and the client keeps
 * using its rule-based parsing. Set GROQ_API_KEY in the environment to enable.
 */
export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return Response.json({ value: null, reason: "no-key" });
  }

  let body: {
    kind?: string;
    question?: string;
    transcript?: string;
    options?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ value: null, reason: "bad-request" }, { status: 400 });
  }

  const { kind, question, transcript, options } = body;
  if (!transcript) return Response.json({ value: null, reason: "empty" });

  const instruction =
    kind === "multiselect"
      ? `Return a JSON array "value" of any of these exact options the user mentioned (may be empty): ${JSON.stringify(
          options
        )}.`
      : options?.length
        ? `Return JSON {"value": <exactly one of ${JSON.stringify(
            options
          )} or null>} that best matches the user.`
        : `Return JSON {"value": <the number the user said as a string, or null>}.`;

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You map a spoken answer onto a jeans fit-quiz field. Reply ONLY with minified JSON. " +
                instruction,
            },
            {
              role: "user",
              content: `Question: ${question}\nUser said: "${transcript}"`,
            },
          ],
        }),
      }
    );
    if (!res.ok) return Response.json({ value: null, reason: "upstream" });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return Response.json({ value: parsed.value ?? null });
  } catch {
    return Response.json({ value: null, reason: "exception" });
  }
}
