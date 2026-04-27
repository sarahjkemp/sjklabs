(function () {
  function $(root, selector) {
    return root.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderSources(sources) {
    if (!Array.isArray(sources) || !sources.length) {
      return "<p class=\"footer-note\">No public sources were returned for this run.</p>";
    }
    return `<div class="source-list">${sources
      .filter(Boolean)
      .map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`)
      .join("")}</div>`;
  }

  function renderErrorState(message) {
    return `
      <div class="panel panel-error-state">
        <div class="empty-badge">Tool issue</div>
        <h2>The audit could not be generated right now.</h2>
        <p>${escapeHtml(message || "Something went wrong.")}</p>
      </div>
    `;
  }

  function renderLiteAudit(audit) {
    const scores = audit.lens_scores || {};
    return `
      <div class="result-header">
        <div class="result-eyebrow">The Legibility Audit</div>
        <div class="result-title">
          <div>
            <h2>${escapeHtml(audit.brand_name || "Untitled brand")}</h2>
            <p class="result-summary">${escapeHtml(audit.headline_verdict || "")}</p>
          </div>
          <div class="score-block">
            <div class="num">${escapeHtml(audit.overall_signal_score || "—")}</div>
            <div class="label">Signal score</div>
          </div>
        </div>
        <p class="footer-note">${escapeHtml(audit.confidence_note || "")}</p>
      </div>

      <div class="score-grid">
        <div class="score-chip"><strong>Market visibility</strong><span>${escapeHtml(scores.market_visibility || "—")}/10</span></div>
        <div class="score-chip"><strong>Trust signal</strong><span>${escapeHtml(scores.trust_signal || "—")}/10</span></div>
        <div class="score-chip"><strong>Narrative clarity</strong><span>${escapeHtml(scores.narrative_clarity || "—")}/10</span></div>
      </div>

      <div class="cards-grid">
        <article class="result-card oxblood">
          <div class="card-label">The Gap</div>
          <p>${escapeHtml(audit.the_gap || "")}</p>
        </article>
        <article class="result-card">
          <div class="card-label">The Asset</div>
          <p>${escapeHtml(audit.the_asset || "")}</p>
        </article>
        <article class="result-card amber">
          <div class="card-label">The Window</div>
          <p>${escapeHtml(audit.the_window || "")}</p>
        </article>
      </div>

      <div class="panel-block">
        <h3>Snapshot</h3>
        <p>${escapeHtml(audit.snapshot || "")}</p>
        <p><strong>Why this matters:</strong> ${escapeHtml(audit.why_this_matters || "")}</p>
        <p><strong>Best next move:</strong> ${escapeHtml(audit.best_next_move || "")}</p>
      </div>

      <div class="panel-block">
        <h3>Research basis</h3>
        <p class="footer-note">Likely website: ${escapeHtml(audit.likely_website || "Not confidently identified")}<br>Likely sector: ${escapeHtml(audit.likely_sector || "Not confidently identified")}</p>
        ${renderSources(audit.sources)}
      </div>
    `;
  }

  function renderFullAudit(audit) {
    const dimensions = audit.dimension_scores || {};
    const scriptwriter = audit.scriptwriter_test || {};
    const whyGapPersists = Array.isArray(audit.why_the_gap_persists) ? audit.why_the_gap_persists : [];
    const shorthand = Array.isArray(audit.sharper_public_shorthand) ? audit.sharper_public_shorthand : [];

    return `
      <div class="result-header">
        <div class="result-eyebrow">SJK Labs Studio</div>
        <div class="result-title">
          <div>
            <h2>${escapeHtml(audit.brand_name || "Untitled brand")}</h2>
            <p class="result-summary">${escapeHtml(audit.verdict || "")}</p>
          </div>
          <div class="score-block">
            <div class="num">${escapeHtml(audit.score_out_of_10 || "—")}</div>
            <div class="label">Legibility score</div>
          </div>
        </div>
        <p class="footer-note">${escapeHtml(audit.sector || "")}${audit.website ? ` · ${escapeHtml(audit.website)}` : ""}</p>
      </div>

      <div class="score-grid">
        <div class="score-chip"><strong>Category clarity</strong><span>${escapeHtml(dimensions.category_clarity || "—")}/5</span></div>
        <div class="score-chip"><strong>Narrative distinctiveness</strong><span>${escapeHtml(dimensions.narrative_distinctiveness || "—")}/5</span></div>
        <div class="score-chip"><strong>Credibility stack</strong><span>${escapeHtml(dimensions.credibility_stack || "—")}/5</span></div>
        <div class="score-chip"><strong>Message consistency</strong><span>${escapeHtml(dimensions.message_consistency || "—")}/5</span></div>
        <div class="score-chip"><strong>Market recall</strong><span>${escapeHtml(dimensions.market_recall || "—")}/5</span></div>
        <div class="score-chip"><strong>AI legibility</strong><span>${escapeHtml(dimensions.ai_legibility || "—")}/5</span></div>
      </div>

      <div class="cards-grid">
        <article class="result-card oxblood">
          <div class="card-label">Pattern named</div>
          <p>${escapeHtml(audit.pattern_named || "")}</p>
        </article>
        <article class="result-card">
          <div class="card-label">The Asset</div>
          <p>${escapeHtml(audit.the_asset || "")}</p>
        </article>
        <article class="result-card amber">
          <div class="card-label">The Window</div>
          <p>${escapeHtml(audit.the_window || "")}</p>
        </article>
      </div>

      <div class="panel-block">
        <h3>The Gap</h3>
        <p>${escapeHtml(audit.the_gap || "")}</p>
        <p><strong>Why this matters:</strong> ${escapeHtml(audit.why_this_matters || "")}</p>
      </div>

      <div class="panel-block">
        <h3>Why the gap persists</h3>
        <ul class="bullet-list">${whyGapPersists.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>

      <div class="panel-block">
        <h3>Sharper public shorthand</h3>
        <ul class="bullet-list">${shorthand.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>

      <div class="panel-block">
        <h3>Commercial consequence</h3>
        <p>${escapeHtml(audit.commercial_consequence || "")}</p>
      </div>

      <div class="cards-grid">
        <article class="result-card">
          <div class="card-label">Scriptwriter Test™ — Protagonist</div>
          <p>${escapeHtml(scriptwriter.protagonist || "")}</p>
        </article>
        <article class="result-card">
          <div class="card-label">Scriptwriter Test™ — Stakes</div>
          <p>${escapeHtml(scriptwriter.stakes || "")}</p>
        </article>
        <article class="result-card">
          <div class="card-label">Scriptwriter Test™ — Dialogue</div>
          <p>${escapeHtml(scriptwriter.dialogue || "")}</p>
        </article>
      </div>

      <div class="panel-block">
        <h3>Sources reviewed</h3>
        ${renderSources(audit.sources)}
      </div>
    `;
  }

  function toMarkdownFull(audit) {
    const d = audit.dimension_scores || {};
    const s = audit.scriptwriter_test || {};
    const why = Array.isArray(audit.why_the_gap_persists) ? audit.why_the_gap_persists : [];
    const short = Array.isArray(audit.sharper_public_shorthand) ? audit.sharper_public_shorthand : [];
    const sources = Array.isArray(audit.sources) ? audit.sources : [];

    return `# ${audit.brand_name || "Brand"} Legibility Audit

Website: ${audit.website || ""}
Sector: ${audit.sector || ""}

## Score

\`${audit.score_out_of_10 || ""} / 10\`

### Dimension breakdown

- Category Clarity: \`${d.category_clarity || ""}/5\`
- Narrative Distinctiveness: \`${d.narrative_distinctiveness || ""}/5\`
- Credibility stack: \`${d.credibility_stack || ""}/5\`
- Message Consistency: \`${d.message_consistency || ""}/5\`
- Market Recall: \`${d.market_recall || ""}/5\`
- AI Legibility: \`${d.ai_legibility || ""}/5\`

## Verdict

${audit.verdict || ""}

## The Pattern Named

${audit.pattern_named || ""}

## The Gap

${audit.the_gap || ""}

## The Asset

${audit.the_asset || ""}

## The Window

${audit.the_window || ""}

## Why This Matters

${audit.why_this_matters || ""}

## Why The Gap Persists

${why.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Sharper Public Shorthand

${short.map((item) => `- ${item}`).join("\n")}

## Commercial Consequence

${audit.commercial_consequence || ""}

## The Scriptwriter Test™

- Protagonist: ${s.protagonist || ""}
- Stakes: ${s.stakes || ""}
- Dialogue: ${s.dialogue || ""}

## Sources

${sources.map((item) => `- ${item}`).join("\n")}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const root = event.currentTarget.closest("[data-audit-tool]");
    const endpoint = root.getAttribute("data-endpoint");
    const mode = root.getAttribute("data-mode");
    const results = $(".results-shell", root);
    const status = $(".status", root);
    const button = $("button[type='submit']", root);
    const markdownBox = $(".markdown-box", root);
    const copyBtn = $(".copy-markdown", root);

    const originalButtonText = button.textContent;
    status.className = "status";
    status.textContent = "Researching public signals and building the audit...";
    results.innerHTML = "";
    if (markdownBox) {
      markdownBox.value = "";
      markdownBox.classList.add("hidden");
    }
    if (copyBtn) {
      copyBtn.classList.add("hidden");
    }
    button.disabled = true;
    button.textContent = "Generating…";

    const payload = {
      email: $("input[name='email']", root)?.value?.trim() || "",
      brandName: $("input[name='brandName']", root)?.value?.trim() || "",
      website: $("input[name='website']", root)?.value?.trim() || "",
      sector: $("input[name='sector']", root)?.value?.trim() || "",
      extraContext: $("textarea[name='extraContext']", root)?.value?.trim() || "",
    };

    try {
      status.textContent = "Researching public signals and building the audit...";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const audit = data.audit;
      results.innerHTML = mode === "lite" ? renderLiteAudit(audit) : renderFullAudit(audit);
      status.textContent = "Audit ready.";

      if (mode === "full" && markdownBox) {
        markdownBox.value = toMarkdownFull(audit);
        markdownBox.classList.remove("hidden");
        copyBtn.classList.remove("hidden");
      }
    } catch (error) {
      status.className = "status error";
      status.textContent = error.message || "The audit could not be generated.";
      results.innerHTML = renderErrorState(error.message || "The audit could not be generated.");
    } finally {
      button.disabled = false;
      button.textContent = originalButtonText;
    }
  }

  function initCopy(root) {
    const button = $(".copy-markdown", root);
    const markdownBox = $(".markdown-box", root);
    if (!button || !markdownBox) return;

    button.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(markdownBox.value);
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy Markdown";
        }, 1500);
      } catch (_) {
        button.textContent = "Copy failed";
      }
    });
  }

  document.querySelectorAll("[data-audit-tool]").forEach((root) => {
    const form = $("form", root);
    if (form) {
      form.addEventListener("submit", handleSubmit);
    }
    initCopy(root);
  });
})();
