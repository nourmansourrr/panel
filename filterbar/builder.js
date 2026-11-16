(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host { display:block; font-family:"72", Arial, sans-serif; font-size:13px; color:#32363a; }
      h4 { margin:14px 0 6px; font-size:13px; border-bottom:1px solid #e5e5e5; padding-bottom:3px; }
      .f { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
      .f label { flex:1; }
      input[type=text], input[type=number], input[type=date], select { width:140px; padding:4px 6px; border:1px solid #89919a; border-radius:4px; font:inherit; box-sizing:border-box; }
      .card { border:1px solid #d9d9d9; border-radius:6px; padding:8px; margin-bottom:8px; display:flex; gap:6px; align-items:center; }
      .card input[type=text] { flex:1; width:auto; min-width:0; }
      button { padding:4px 10px; border:1px solid #0a6ed1; background:#fff; color:#0a6ed1; border-radius:4px; cursor:pointer; font:inherit; }
      button.del { border-color:#bb0000; color:#bb0000; }
      .hint { font-size:11px; color:#6a6d70; margin-bottom:6px; }
      .info { background:#f4f6f8; border-radius:4px; padding:6px 8px; font-size:12px; margin-top:10px; }
    </style>
    <div id="root"></div>`;

  const parseList = s => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; } };

  class FilterBarBuilder extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._root = this._shadow.getElementById("root");
      this._p = {};
    }
    onCustomWidgetBeforeUpdate(c) { Object.assign(this._p, c); }
    onCustomWidgetAfterUpdate() {
      const a = this._shadow.activeElement;
      if (a && a.tagName === "INPUT") this._updateInfo(); else this._render();
    }

    _set(key, val) {
      this._p[key] = val;
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: { [key]: val } } }));
    }

    _row(label, ctl) {
      const r = document.createElement("div"); r.className = "f";
      const l = document.createElement("label"); l.textContent = label;
      r.append(l, ctl); this._root.appendChild(r);
    }
    _text(key, label, type) {
      const i = document.createElement("input"); i.type = type || "text"; i.value = this._p[key] === undefined ? "" : this._p[key];
      i.addEventListener("input", () => this._set(key, type === "number" ? Number(i.value) : i.value));
      this._row(label, i);
    }
    _check(key, label) {
      const i = document.createElement("input"); i.type = "checkbox"; i.checked = !!this._p[key];
      i.addEventListener("change", () => this._set(key, i.checked));
      this._row(label, i);
    }
    _select(key, label, options) {
      const s = document.createElement("select");
      options.forEach(o => { const op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; op.selected = o[0] === this._p[key]; s.appendChild(op); });
      s.addEventListener("change", () => this._set(key, s.value));
      this._row(label, s);
    }
    _h(t, hint) {
      this._root.insertAdjacentHTML("beforeend", `<h4>${t}</h4>` + (hint ? `<div class="hint">${hint}</div>` : ""));
    }

    _render() {
      const r = this._root; r.innerHTML = "";
      const p = this._p;

      this._h("Controls");
      this._check("showDate", "Show date");
      this._check("showGroup", "Show group");
      this._check("showToggle", "Show period toggle (MTD / QTD / YTD)");
      this._check("showYearToggle", "Show year toggle (CY / PY)");

      this._h("Labels");
      this._text("dateLabel", "Date label");
      this._text("groupLabel", "Group label");

      this._h("Date", "Month grain suits monthly models. Day grain only helps if your model has daily data.");
      this._select("granularity", "Date grain", [["month", "Month"], ["day", "Day"]]);
      this._select("keyFormat", "Filter key format", [["yyyyMM", "202609"], ["yyyy-MM", "2026-09"], ["yyyyMMdd", "20260930"], ["yyyy-MM-dd", "2026-09-30"], ["MM.yyyy", "09.2026"]]);
      this._text("dateLocale", "Display locale");
      this._text("minDate", "Earliest date", "date");
      this._text("maxDate", "Latest date", "date");
      if (p.granularity !== "day") { this._text("yearsBack", "Years back", "number"); this._text("yearsForward", "Years forward", "number"); }
      this._text("dateValue", "Default date", "date");
      const clr = document.createElement("button"); clr.textContent = "Use today's date";
      clr.addEventListener("click", () => { this._set("dateValue", ""); this._render(); });
      r.appendChild(clr);

      this._optionList("Period view toggle", "ID must match the member ID in your Period View dimension.", "modeOptionsJson", "mode");
      this._optionList("Year view toggle", "ID must match the member ID in your Year View dimension.", "yearOptionsJson", "yearView");

      const groups = parseList(p.groupsJson);
      this._h("Groups", "ID is the member ID your model uses; label is what users see.");
      groups.forEach((g, i) => {
        const c = document.createElement("div"); c.className = "card";
        const id = document.createElement("input"); id.type = "text"; id.placeholder = "ID"; id.value = g.id || "";
        const lb = document.createElement("input"); lb.type = "text"; lb.placeholder = "Label"; lb.value = g.label || "";
        const save = () => this._set("groupsJson", JSON.stringify(groups));
        id.addEventListener("input", () => { g.id = id.value; save(); });
        lb.addEventListener("input", () => { g.label = lb.value; save(); });
        const d = document.createElement("button"); d.className = "del"; d.textContent = "✕";
        d.addEventListener("click", () => { groups.splice(i, 1); save(); this._render(); });
        c.append(id, lb, d); r.appendChild(c);
      });
      const add = document.createElement("button"); add.textContent = "+ Add group";
      add.addEventListener("click", () => { groups.push({ id: "", label: "" }); this._set("groupsJson", JSON.stringify(groups)); this._render(); });
      r.appendChild(add);

      this._select("selectedGroup", "Default group", groups.map(g => [g.id, g.label || g.id]));

      const info = document.createElement("div"); info.className = "info"; info.id = "info";
      r.appendChild(info);
      this._updateInfo();
    }

    _optionList(title, hint, jsonKey, valKey) {
      const r = this._root, list = parseList(this._p[jsonKey]);
      this._h(title, hint);
      const save = () => this._set(jsonKey, JSON.stringify(list));
      list.forEach((o, i) => {
        const c = document.createElement("div"); c.className = "card";
        const id = document.createElement("input"); id.type = "text"; id.placeholder = "ID"; id.value = o.id || "";
        const lb = document.createElement("input"); lb.type = "text"; lb.placeholder = "Label"; lb.value = o.label || "";
        id.addEventListener("input", () => { o.id = id.value; save(); });
        lb.addEventListener("input", () => { o.label = lb.value; save(); });
        const d = document.createElement("button"); d.className = "del"; d.textContent = "✕";
        d.addEventListener("click", () => { list.splice(i, 1); save(); this._render(); });
        c.append(id, lb, d); r.appendChild(c);
      });
      const add = document.createElement("button"); add.textContent = "+ Add option";
      add.addEventListener("click", () => { list.push({ id: "", label: "" }); save(); this._render(); });
      r.appendChild(add);
      this._select(valKey, "Default", list.map(o => [o.id, o.label || o.id]));
    }

    _updateInfo() {
      const i = this._shadow.getElementById("info"), p = this._p;
      if (i) i.textContent = "Current range: " + (p.startDate || "–") + " → " + (p.endDate || "–") + "  |  keys: " + (p.startKey || "–") + " → " + (p.endKey || "–");
    }
  }
  customElements.define("com-custom-filterbar-builder", FilterBarBuilder);
})();
