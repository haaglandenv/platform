const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
const fields = ["subject", "html", "text"];
const shortcode = (key) => key.startsWith("{{") ? key : `{{ ${key} }}`;

// The preview is a separate opaque origin. It has no scripts, forms, navigation,
// storage access or remote assets, even when an administrator pastes active HTML.
function previewDocument(html) {
  const template = document.createElement("template");
  template.innerHTML = html.replace(/<body(?=\s|>)/i, "<div").replace(/<\/body\s*>/i, "</div>");
  const parsed = template.content;
  parsed.querySelectorAll("script,iframe,frame,object,embed,form,input,button,textarea,select,meta,base,link,video,audio,source,track,portal").forEach((element) => element.remove());
  parsed.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || attribute.name.endsWith(":href") || (attribute.name === "src" && !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(attribute.value)) || ["href", "target", "action", "formaction", "srcset", "srcdoc", "ping", "autofocus"].includes(attribute.name)) element.removeAttribute(attribute.name);
    }
  });
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>body{font-family:Arial,sans-serif;margin:20px;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{pointer-events:none}</style></head><body>${template.innerHTML}</body></html>`;
}

export function createMailTemplateManager({ request, errorMessage, toast }) {
  let root = null, generation = 0, items = [], selected = "", lastField = "html";
  const drafts = new Map();
  const current = () => items.find((item) => item.id === selected);
  const read = (form) => Object.fromEntries(fields.map((field) => [field, String(new FormData(form).get(field) || "")]));
  const path = (suffix = "") => `admin/mail-templates/${encodeURIComponent(selected)}${suffix}`;
  const dirty = () => { const item = current(), draft = drafts.get(selected); return item && draft && fields.some((field) => draft[field] !== item[field]); };
  function clear() { generation++; items = []; selected = ""; drafts.clear(); if (root?.isConnected) root.replaceChildren(); root = null; }
  function render() {
    if (!root?.isConnected) return;
    const item = current();
    const list = (type, title) => `<section class="mail-template-group"><h3>${title}</h3><div class="mail-template-list">${items.filter((row) => row.type === type).map((row) => `<button type="button" class="mail-template-choice" data-template-select="${escape(row.id)}" aria-pressed="${row.id === selected}"><strong>${escape(row.name)}</strong><span>${escape(row.description)}</span><small>${row.status === "custom" ? "Aangepast" : "Standaard"}</small></button>`).join("")}</div></section>`;
    if (!items.length) { root.innerHTML = '<div class="empty-state"><h3>Nog geen e-mailtemplates</h3><p>De server heeft geen beschikbare templates teruggegeven.</p></div>'; return; }
    const draft = drafts.get(item.id) || Object.fromEntries(fields.map((field) => [field, item[field] || ""])); drafts.set(item.id, draft);
    const auth = item.type === "supabase-auth";
    root.innerHTML = `<div class="mail-template-layout"><nav class="mail-template-navigation" aria-label="E-mailtemplates">${list("supabase-auth", "Supabase Auth")}${list("resend-api", "Resend API")}</nav><div class="mail-template-workspace"><header class="section-heading"><div><h3>${escape(item.name)}</h3><p>${escape(item.description)}</p></div><span class="context-tag">${auth ? "Supabase Auth" : "Resend API"}</span></header>${auth ? '<div class="notice warning"><strong>Publicatie bij Supabase niet gecontroleerd</strong><p>Opslaan bewaart deze template in het platform. Exporteer daarna de inhoud voor de Supabase Auth-instellingen. Aanmeldcodes worden uitsluitend door Supabase verstuurd en bestaan uit zes cijfers.</p></div>' : '<p class="muted">Deze template wordt gebruikt voor platformmeldingen via de opgeslagen Resend-instellingen.</p>'}<form data-template-editor><div class="mail-template-fields"><label class="field">Onderwerp<input name="subject" required maxlength="200" value="${escape(draft.subject)}"></label><label class="field">HTML-inhoud<textarea name="html" required maxlength="60000" class="mail-code" spellcheck="false">${escape(draft.html)}</textarea></label><label class="field">Platte tekst<textarea name="text" required maxlength="20000" class="mail-code" spellcheck="false">${escape(draft.text)}</textarea></label></div><div class="mail-shortcodes"><h4>Beschikbare shortcodes</h4><p class="muted">Voeg een shortcode in bij de cursor in het laatst gekozen veld.</p><div>${(item.shortcodes || []).map((code) => `<button type="button" class="mail-shortcode" data-template-code="${escape(code.key)}" title="${escape(code.label)}"><code>${escape(shortcode(code.key))}</code><span>${escape(code.label)}</span></button>`).join("")}</div></div><p class="muted" data-template-status>${dirty() ? "Niet-opgeslagen wijzigingen" : `Opgeslagen versie ${escape(item.revision ?? 0)} · ${item.status === "custom" ? "Aangepaste template" : "Standaardtemplate"}`}</p><div class="error-summary" data-template-feedback role="alert"></div><div class="mail-template-actions"><button type="submit" class="hv-button hv-button-dark">Template opslaan</button><button type="button" class="hv-button hv-button-outline" data-template-action="preview">Voorbeeld van invoer</button><button type="button" class="hv-button hv-button-outline" data-template-action="reset-ask">Standaard herstellen</button>${auth ? '<button type="button" class="hv-button hv-button-outline" data-template-action="export">Export voor Supabase</button>' : ""}</div><div class="notice warning" data-template-reset hidden><strong>Standaardtemplate herstellen?</strong><p>Hiermee vervang je de opgeslagen template en je huidige invoer door de standaardinhoud.</p><div class="section-actions"><button type="button" class="hv-button hv-button-outline" data-template-action="reset">Ja, standaard herstellen</button><button type="button" class="hv-button hv-button-outline" data-template-action="reset-cancel">Invoer behouden</button></div></div></form><section class="mail-template-preview" data-template-preview hidden aria-label="Voorbeeld e-mail"><h4>Voorbeeld met voorbeeldgegevens</h4><p class="muted">Alleen een weergave. Er wordt geen e-mail verstuurd; externe afbeeldingen, links en actieve inhoud zijn uitgeschakeld.</p><p><strong data-template-preview-subject></strong></p><iframe title="Veilig voorbeeld van e-mail" sandbox="" referrerpolicy="no-referrer" data-template-frame></iframe><details><summary>Voorbeeld als platte tekst</summary><pre data-template-preview-text></pre></details></section><div data-template-export></div>${auth ? "" : '<form data-template-test class="mail-template-test"><h4>Opgeslagen template testen</h4><p class="muted">Sla wijzigingen eerst op. Een geaccepteerd testbericht is aangeboden aan Resend; dit bevestigt geen bezorging.</p><label class="field">Testbericht aan<input name="to" type="email" required autocomplete="email" placeholder="jouw@e-mailadres.nl"></label><div class="error-summary" data-template-test-feedback role="alert"></div><button type="submit" class="hv-button hv-button-outline">Opgeslagen template aanbieden</button></form>'}</div></div>`;
    root.querySelectorAll('[data-template-editor] input,[data-template-editor] textarea').forEach((element) => {
      element.addEventListener("focus", () => { lastField = element.name; });
      element.addEventListener("input", () => { drafts.set(selected, read(element.form)); root.querySelector("[data-template-status]").textContent = dirty() ? "Niet-opgeslagen wijzigingen" : "Geen wijzigingen"; root.querySelector("[data-template-preview]").hidden = true; root.querySelector("[data-template-export]").replaceChildren(); });
    });
    root.querySelectorAll("[data-template-select]").forEach((button) => button.addEventListener("click", () => { selected = button.dataset.templateSelect; render(); }));
    root.querySelectorAll("[data-template-code]").forEach((button) => button.addEventListener("click", () => { const field = root.querySelector(`[data-template-editor] [name="${lastField}"]`); field.setRangeText(shortcode(button.dataset.templateCode), field.selectionStart, field.selectionEnd, "end"); field.dispatchEvent(new Event("input")); field.focus(); }));
    root.querySelector("[data-template-editor]").addEventListener("submit", (event) => { event.preventDefault(); perform("save"); });
    root.querySelectorAll("[data-template-action]").forEach((button) => button.addEventListener("click", () => perform(button.dataset.templateAction)));
    root.querySelector("[data-template-test]")?.addEventListener("submit", (event) => { event.preventDefault(); perform("test"); });
  }
  async function perform(action) {
    const activeRoot = root, epoch = generation, item = current(), form = root.querySelector("[data-template-editor]"), test = root.querySelector("[data-template-test]");
    if (action === "reset-ask" || action === "reset-cancel") { root.querySelector("[data-template-reset]").hidden = action === "reset-cancel"; return; }
    if (action === "test" && !test.reportValidity() || ["save", "preview"].includes(action) && !form.reportValidity()) return;
    const feedback = root.querySelector(action === "test" ? "[data-template-test-feedback]" : "[data-template-feedback]"); feedback.textContent = "";
    activeRoot.setAttribute("aria-busy", "true");
    const buttons = [...root.querySelectorAll("button")]; buttons.forEach((button) => { button.disabled = true; });
    try {
      let response;
      if (action === "preview") {
        response = await request(path("/render"), { method: "POST", body: read(form) });
        if (epoch !== generation || !activeRoot.isConnected) return;
        const preview = response.preview;
        root.querySelector("[data-template-preview]").hidden = false;
        root.querySelector("[data-template-preview-subject]").textContent = preview.subject;
        root.querySelector("[data-template-preview-text]").textContent = preview.text;
        root.querySelector("[data-template-frame]").srcdoc = previewDocument(preview.html);
      } else if (action === "test") {
        if (dirty()) { feedback.textContent = "Sla je wijzigingen eerst op voordat je deze template test. Je invoer blijft staan."; return; }
        response = await request(path("/test"), { method: "POST", body: { to: String(new FormData(test).get("to")), requestId: crypto.randomUUID() } });
        if (epoch !== generation || !activeRoot.isConnected) return;
        toast("Het testbericht is aangeboden aan Resend.");
      } else if (action === "export") {
        if (dirty()) { feedback.textContent = "Sla je wijzigingen eerst op voordat je de template exporteert. Je invoer blijft staan."; return; }
        response = await request(path("/export"));
        if (epoch !== generation || !activeRoot.isConnected) return;
        root.querySelector("[data-template-export]").innerHTML = `<details class="mail-template-export" open><summary>Export voor Supabase Auth</summary><p>Deze export wijzigt de Supabase-instellingen niet. Plaats onderwerp en HTML in de juiste Auth-template.</p><label class="field">Onderwerp<input readonly value="${escape(response.template.subject)}"></label><label class="field">HTML voor Supabase<textarea readonly class="mail-code">${escape(response.template.content)}</textarea></label><p class="muted">Supabase-velden: ${escape(response.template.fieldNames?.subject || "")} · ${escape(response.template.fieldNames?.content || "")}</p></details>`;
      } else {
        response = await request(path(action === "reset" ? "/reset" : ""), { method: action === "reset" ? "POST" : "PUT", body: { ...(action === "reset" ? {} : read(form)), expectedRevision: item.revision } });
        if (epoch !== generation || !activeRoot.isConnected) return;
        const latest = response.item || response.template;
        if (latest) items = items.map((row) => row.id === item.id ? latest : row);
        else { const result = await request("admin/mail-templates"); if (epoch !== generation || !activeRoot.isConnected) return; items = result.items; }
        drafts.delete(item.id); render(); toast(action === "reset" ? "De standaardtemplate is hersteld." : "De e-mailtemplate is opgeslagen.");
      }
    } catch (error) { if (epoch === generation && activeRoot.isConnected) feedback.textContent = errorMessage(error); }
    finally { activeRoot.removeAttribute("aria-busy"); buttons.filter((button) => button.isConnected).forEach((button) => { button.disabled = false; }); }
  }
  async function mount(element) {
    root = element; const activeRoot = root, epoch = generation;
    try { const result = await request("admin/mail-templates"); if (epoch !== generation || !activeRoot.isConnected) return; items = result.items || []; if (!items.some((item) => item.id === selected)) selected = items[0]?.id || ""; render(); }
    catch (error) { if (epoch !== generation || !activeRoot.isConnected) return; root.innerHTML = `<div class="notice error">${escape(errorMessage(error))}</div><button type="button" class="hv-button hv-button-outline" data-template-retry>Templates opnieuw ophalen</button>`; root.querySelector("[data-template-retry]").addEventListener("click", () => mount(root)); }
  }
  return { mount, clear };
}
