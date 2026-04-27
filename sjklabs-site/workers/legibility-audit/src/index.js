const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const FORMSPREE_URL = "https://formspree.io/f/xzdyqqzl";
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 900;
const FETCH_TIMEOUT_MS = 8000;
const CLAUDE_TIMEOUT_MS = 25000;

const SYSTEM_PROMPT = `You are SJK Labs. Write a fast public Legibility Audit for a business.

This is a lead magnet, not a full paid audit. Keep it short, commercially sharp, and direct. Write like a smart operator, not a consultant. No jargon. No generic AI copy. Sound like Sarah Kemp would say it out loud.

The lens:
- Legibility is the gap between what a business knows about itself and what the market can actually understand, trust, remember, and retrieve.
- Focus on what makes a brand easy or hard to hold onto.
- Narrative problem first.

Return JSON only. No markdown, no explanation, just the JSON object.`;

function corsHeaders(origin) {
  const isAllowed =
    origin === "https://sjklabs.co" ||
    origin === "https://www.sjklabs.co" ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://sjklabs.co",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(origin),
    },
  });
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchOne(pattern, text) {
  const match = text.match(pattern);
  return match?.[1] ? stripHtml(match[1]) : "";
}

async function fetchWebsiteEvidence(website) {
  const target = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "SJK-Labs-Legibility-Audit/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const title = matchOne(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
    const description =
      matchOne(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i, html) ||
      matchOne(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i, html);
    const h1 = matchOne(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html);
    const bodyText = stripHtml(html).slice(0, 900);

    const evidence = [
      `Website fetched: ${target}`,
      title ? `Page title: ${title}` : "",
      description ? `Meta description: ${description}` : "",
      h1 ? `Primary heading: ${h1}` : "",
      bodyText ? `Visible page copy sample: ${bodyText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return { website: target, evidence, sources: [target] };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function buildUserPrompt({ brandName, website, sector, extraContext, evidenceText }) {
  const brandContext = [
    `Brand name: ${brandName}`,
    website ? `Known website: ${website}` : "Known website: not supplied",
    sector ? `Known sector: ${sector}` : "Known sector: not supplied",
    extraContext ? `Additional context: ${extraContext}` : "Additional context: none supplied",
  ].join("\n");

  const evidenceSection = evidenceText
    ? `\nPublic evidence:\n${evidenceText}\n\nInstructions: use only the evidence provided. Do not invent facts. If evidence is thin, say so plainly in the confidence note.`
    : `\nInstructions: use your knowledge of publicly available information. If confidence is limited, say so plainly. Do not invent facts.`;

  return `Audit inputs:\n${brandContext}${evidenceSection}

Return JSON only with this exact shape:
{
  "brand_name": "",
  "likely_website": "",
  "likely_sector": "",
  "confidence_note": "",
  "overall_signal_score": 0,
  "lens_scores": {
    "market_visibility": 0,
    "trust_signal": 0,
    "narrative_clarity": 0
  },
  "headline_verdict": "",
  "snapshot": "",
  "the_gap": "",
  "the_asset": "",
  "the_window": "",
  "why_this_matters": "",
  "best_next_move": "",
  "sources": [""]
}

Scoring rules: integers 1–10. If evidence is thin, score conservatively. Sources should be real URLs only, not invented.`;
}

async function callClaude(userPrompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const payload = await res.json();
    const text = payload?.content?.[0]?.text;
    if (!text) throw new Error("The model returned an empty response.");
    return text;
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      throw new Error("The audit took too long to generate. Try again in a moment.");
    }
    throw err;
  }
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last <= first) {
      throw new Error("The model did not return valid JSON.");
    }
    return JSON.parse(text.slice(first, last + 1));
  }
}

function captureLeadNonBlocking({ email, brandName, website, sector, extraContext }) {
  fetch(FORMSPREE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email,
      brand_name: brandName,
      website,
      sector,
      extra_context: extraContext,
      tool: "Legibility Audit",
      source: "sjklabs.co/legibility-audit-tool",
      _subject: `New Legibility Audit lead: ${brandName}`,
    }),
  }).catch(() => {});
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "The audit tool is not configured yet. Please check back shortly." },
        503,
        origin
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid request body." }, 400, origin);
    }

    const email = (body.email || "").trim();
    const brandName = (body.brandName || "").trim();
    const website = (body.website || "").trim();
    const sector = (body.sector || "").trim();
    const extraContext = (body.extraContext || "").trim();

    if (!brandName) {
      return jsonResponse({ error: "Please provide a brand name." }, 400, origin);
    }
    if (!email) {
      return jsonResponse({ error: "Please provide an email address." }, 400, origin);
    }

    captureLeadNonBlocking({ email, brandName, website, sector, extraContext });

    const websiteEvidence = website ? await fetchWebsiteEvidence(website) : null;

    const userPrompt = buildUserPrompt({
      brandName,
      website: websiteEvidence?.website || website,
      sector,
      extraContext,
      evidenceText: websiteEvidence?.evidence || null,
    });

    try {
      const text = await callClaude(userPrompt, env.ANTHROPIC_API_KEY);
      const audit = extractJson(text);

      if (websiteEvidence && Array.isArray(audit.sources)) {
        audit.sources = [
          ...new Set([...websiteEvidence.sources, ...audit.sources.filter(Boolean)]),
        ].slice(0, 3);
      }

      return jsonResponse({ audit }, 200, origin);
    } catch (err) {
      return jsonResponse(
        { error: err.message || "The Legibility Audit could not be generated." },
        500,
        origin
      );
    }
  },
};
