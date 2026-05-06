const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...jsonHeaders(),
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function extractText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content?.text === "string" && content.text.trim()) {
        parts.push(content.text);
      }
      if (typeof content?.text === "string" && content.text.trim()) {
        parts.push(content.text);
      }
      if (typeof content?.text?.value === "string" && content.text.value.trim()) {
        parts.push(content.text.value);
      }
    }
  }
  return parts.join("\n").trim();
}

function extractJson(text) {
  if (!text) {
    throw new Error("The model returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("The model did not return valid JSON.");
    }
    return JSON.parse(text.slice(first, last + 1));
  }
}

async function callOpenAI({ prompt, model = "gpt-5", maxOutputTokens = 2200, tools = [{ type: "web_search" }], timeoutMs = 25000 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to Netlify environment variables before using this tool.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        ...(Array.isArray(tools) && tools.length ? { tools } : {}),
        max_output_tokens: maxOutputTokens,
        input: prompt,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === "AbortError") {
      throw new Error("The audit took too long to generate. Try adding the website for a faster read.");
    }
    throw error;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI request failed: ${res.status} ${errorText}`);
  }

  const payload = await res.json();
  return {
    payload,
    text: extractText(payload),
  };
}

function brandContext({ brandName, website = "", sector = "", extraContext = "" }) {
  return [
    `Brand name: ${brandName}`,
    website ? `Known website: ${website}` : "Known website: not supplied",
    sector ? `Known sector: ${sector}` : "Known sector: not supplied",
    extraContext ? `Additional context: ${extraContext}` : "Additional context: none supplied",
  ].join("\n");
}

function buildLitePrompt({ brandName, website, sector, extraContext }) {
  return `You are SJK Labs. You are writing a light-touch public Legibility Audit for a business.

Your job is to research the brand using public information and return a concise but commercially sharp Snapshot.

Use the SJK Labs lens:
- direct, intelligent, commercially sharp
- narrative problem first
- focus on what the market can understand, trust, remember, and retrieve
- do not sound like a generic consultancy
- do not give away the full SJK Labs methodology
- do not write the full paid audit for free

This public tool is deliberately lighter than the full paid audit.

Audit inputs:
${brandContext({ brandName, website, sector, extraContext })}

Research rules:
- use public web information only
- if there are multiple companies with the same name, choose the one most strongly supported by search evidence
- if confidence is limited, say so plainly
- do not invent facts
- keep the readout useful but deliberately incomplete
- surface the likely problem, not the full strategic playbook

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
  "sources": ["", "", ""]
}

Scoring rules:
- scores are integers from 1 to 10
- this is a lead-magnet style read, not a deep operational audit
- the verdict should sound like SJK Labs, not like marketing software
- best_next_move should point toward the most sensible next step without unpacking the full implementation plan
- where relevant, steer toward either "AI Visibility & Narrative Audit" or "The Scriptwriter Test™"

Writing rules:
- short paragraphs, not bullets inside fields
- plain commercial English
- avoid abstract jargon
- avoid “X is not the problem, Y is”
- make it feel like Sarah Kemp would say it out loud
- do not list every flaw you can find
- give just enough specificity to feel credible, while still making the full audit feel valuable`;
}

function buildLitePromptWithEvidence({ brandName, website, sector, extraContext, evidenceText }) {
  return `You are SJK Labs. Write a fast public Legibility Snapshot for a business.

This is a lead magnet, not a full paid audit.

Audit inputs:
${brandContext({ brandName, website, sector, extraContext })}

Public evidence:
${evidenceText || "No direct website evidence supplied."}

Instructions:
- use only the evidence provided
- do not invent facts
- if confidence is limited, say so plainly
- keep the read short and useful
- keep the output strategically helpful but incomplete
- plain commercial English only
- avoid jargon and abstract strategy language
- do not sound like generic AI copy
- do not give away the full paid methodology or implementation path

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

Rules:
- scores are integers from 1 to 10
- keep every field tight
- sources should usually just include the supplied website
- if the evidence is thin, reflect that in the confidence note
- best_next_move should recommend the right next step without spelling out the entire paid audit
- if the evidence points to a broader problem, guide toward AI Visibility & Narrative Audit`;
}

function buildFullPrompt({ brandName, website, sector, extraContext }) {
  return `You are SJK Labs. You are generating a full internal Legibility Audit in the SJK Labs house style.

This is the deeper internal tool, so it should be more detailed than the public lead magnet and closer to the finished SJK Labs report style.

Core ideas to preserve:
- legibility is the gap between what a company knows about itself and what the market can actually understand, trust, remember, and retrieve
- The Scriptwriter Test examines protagonist, stakes, and dialogue
- the strongest brands make the role obvious
- the output must stay commercially sharp, direct, and human

Audit inputs:
${brandContext({ brandName, website, sector, extraContext })}

Research rules:
- use public web information only
- if confidence is limited, say so plainly
- do not invent facts
- cite the most relevant public sources as URLs

Return JSON only with this exact shape:
{
  "brand_name": "",
  "website": "",
  "sector": "",
  "score_out_of_10": 0,
  "dimension_scores": {
    "category_clarity": 0,
    "narrative_distinctiveness": 0,
    "credibility_stack": 0,
    "message_consistency": 0,
    "market_recall": 0,
    "ai_legibility": 0
  },
  "verdict": "",
  "pattern_named": "",
  "the_gap": "",
  "the_asset": "",
  "the_window": "",
  "why_this_matters": "",
  "why_the_gap_persists": ["", "", "", "", ""],
  "sharper_public_shorthand": ["", ""],
  "commercial_consequence": "",
  "scriptwriter_test": {
    "protagonist": "",
    "stakes": "",
    "dialogue": ""
  },
  "sources": ["", "", "", ""]
}

Scoring rules:
- score_out_of_10 should be one decimal place
- dimension scores are integers 1 to 5
- keep the verdict short and memorable

Writing rules:
- write like a smart operator, not a management consultant
- no fluffy abstractions
- no generic AI phrasing
- keep the commercial consequence concrete
- the asset should focus on proof and authority already visible
- the window should focus on the clearest ownable role in the market
- the shorthand options should sound like usable public language
- the scriptwriter test comments should be short but sharp`;
}

module.exports = {
  response,
  callOpenAI,
  extractJson,
  buildLitePrompt,
  buildLitePromptWithEvidence,
  buildFullPrompt,
};
