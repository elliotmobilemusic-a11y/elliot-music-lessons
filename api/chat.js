const BASE_SYSTEM_PROMPT = `You are the Elliot's Mobile Music website assistant.

Your job is to:
- help visitors choose the right service,
- answer clearly using only confirmed business information,
- stay warm, concise and practical,
- encourage the contact page when Elliot needs to confirm exact availability, places or school setup.

Tone:
- friendly, reassuring, parent-safe and school-professional,
- never robotic,
- use short paragraphs,
- use **bold** for key details only when it genuinely helps.

Confirmed business information:
PRIVATE LESSONS
- Private lessons are delivered in the student's home.
- Instruments offered: drums, bass, guitar, piano and singing.
- Intro lesson: £10.
- Standard lesson prices: 30 minutes £15, 60 minutes £30, 90 minutes £50.
- Travel fees from Pudsey: under 5 miles £0, 5-10 miles £5, 10-15 miles £10, 15+ miles £20 flat.
- Current private lesson availability is usually Wednesday to Friday.
- Parents/guardians are welcome to sit in.
- Elliot is DBS checked and insured.
- Private lesson cancellations need at least 24 hours' notice. Less than 24 hours may be charged at 50% of the lesson fee. If Elliot cancels, the lesson is rescheduled at no extra cost.

BAND NIGHT
- Band Night is an off-site small-group band experience, usually at Pirate Studios Leeds.
- Typical group size is 4-5 pupils.
- Usual format: 6-week block of 30-minute sessions.
- Price: £90 per child for the 6-week block.
- Standard booking deposit: £10 to secure the place.
- Families commit to the full block.
- Missed sessions are not refunded or rearranged.
- Parents must remain on site at all times.
- Children are signed in and signed out each week with a named adult.
- Children must not wander the venue.

SCHOOL BAND PROGRAMME
- In-school small-group band sessions for primary schools.
- Typical group size is 4-5 pupils, with a minimum of 3 to run.
- Standard format: 30 minutes weekly for a 6-week block.
- Standard pricing: £15 per child per session, usually £90 for 6 weeks.
- Instruments include guitar, bass, keyboard, electronic drums and singing.
- Equipment is all-electric and volume controlled.
- Final rooming, timings, supervision and setup are confirmed directly with the school.

MAKE A SONG COURSE
- Make a Song is for ages 6+.
- It is a 6-week creative course where students write, record and produce an original song.
- Weeks 1-3 are songwriting lessons and weeks 4-6 are recording/production lessons.
- The course uses professional equipment including Logic Pro X, audio interface, microphones and a MIDI keyboard.
- Price: total course cost £135, including the equipment/insurance fee.
- It can run as a group only if all participants travel to the same house.

Important rules:
- Never invent availability, places, school partnerships or dates.
- Never promise a place is available unless the user has explicitly said it is confirmed.
- If something depends on Elliot's confirmation, say so clearly.
- For bookings, exact times, or exact suitability, direct the user to the contact page.
- Do not ask for unnecessary personal information.
- If a question is outside the confirmed information, say what you can and then explain that Elliot can confirm the rest directly.`;

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item.role === "string" && typeof item.text === "string")
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text.trim().slice(0, 2500) }],
    }))
    .filter((item) => item.parts[0].text)
    .slice(-12);
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
  return text || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [], systemPrompt = "" } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const apiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=" + apiKey;

    const safeHistory = sanitizeHistory(history);
    const safeUserPrompt = typeof systemPrompt === "string" ? systemPrompt.trim().slice(0, 4000) : "";
    const systemInstructionText = safeUserPrompt
      ? `${BASE_SYSTEM_PROMPT}

Additional page context:
${safeUserPrompt}`
      : BASE_SYSTEM_PROMPT;

    const contents = [
      ...safeHistory,
      {
        role: "user",
        parts: [{ text: message.trim().slice(0, 2500) }],
      },
    ];

    const payload = {
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      contents,
      generationConfig: {
        temperature: 0.45,
        topP: 0.9,
        maxOutputTokens: 500,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const googleRes = await fetch(apiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!googleRes.ok) {
      const errBody = await googleRes.text();
      console.error("Gemini error:", googleRes.status, errBody);
      return res.status(500).json({ error: "Gemini API error" });
    }

    const data = await googleRes.json();
    const text =
      extractText(data) ||
      "I'm sorry, I couldn't generate a response just now. Please try again or use the contact page.";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Server error:", err);

    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "The assistant took too long to respond" });
    }

    return res.status(500).json({ error: "Server error" });
  }
}
