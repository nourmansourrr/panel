(function () {
  const DEFAULTS = {
    granularity: "month", dateValue: "", mode: "YTD",
    groupsJson: '[{"id":"AQH","label":"AQH"}]', selectedGroup: "",
    startDate: "", endDate: "", startKey: "", endKey: "",
    showDate: true, showGroup: true, showToggle: true,
    dateLabel: "DATE:", groupLabel: "GROUP:",
    modeOptionsJson: '[{"id":"MTD","label":"MTD"},{"id":"QTD","label":"QTD"},{"id":"YTD","label":"YTD"}]',
    yearOptionsJson: '[{"id":"CY","label":"CY"},{"id":"PY","label":"PY"}]',
    yearView: "CY", showYearToggle: true, toggleGap: 12,
    dateLocale: "en-GB", keyFormat: "yyyyMM", minDate: "", maxDate: "", yearsBack: 5, yearsForward: 1,
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", backgroundColor: "#1c2b40",
    labelColor: "#9aa7b8", labelFontSize: 13, labelFontWeight: 600, labelLetterSpacing: 0.5, labelUppercase: true,
    valueColor: "#ffffff", valueFontSize: 17, valueFontWeight: 600, chevronColor: "#cfd6df",
    dividerColor: "#3a4a60", showDivider: true, itemGap: 28, paddingX: 24,
    toggleBg: "#26364d", toggleBorderColor: "#4a5a70", toggleActiveBg: "#ffffff", toggleActiveColor: "#1c2b40",
    toggleInactiveColor: "#c4ccd8", toggleRadius: 6, toggleFontSize: 14, toggleFontWeight: 600
  };

  const CHEV = '<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';

  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host { display:block; }
      .bar { display:flex; align-items:center; justify-content:space-between; width:100%; height:100%;
             box-sizing:border-box; background:var(--bg); padding:0 var(--px); font-family:var(--ff); overflow:hidden; }
      .left, .right { display:flex; align-items:center; }
      .left { gap:var(--gap); }
      .right { gap:var(--tgap); }
      .item { display:flex; align-items:center; gap:10px; }
      .lbl { color:var(--lc); font-size:var(--lfs); font-weight:var(--lfw); letter-spacing:var(--lls); white-space:nowrap; }
      .lbl.up { text-transform:uppercase; }
      .field { position:relative; display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
      .val { color:var(--vc); font-size:var(--vfs); font-weight:var(--vfw); white-space:nowrap; }
      .chev { color:var(--cc); width:12px; height:12px; flex:none; }
      .ctl { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; border:0; margin:0; padding:0; font-size:16px; }
      .divider { width:1px; height:28px; background:var(--dc); }
      .toggle { display:inline-flex; gap:2px; padding:2px; border:1px solid var(--tb); background:var(--tbg); border-radius:var(--tr); }
      .toggle button { border:0; background:transparent; color:var(--ti); font:inherit; font-size:var(--tfs); font-weight:var(--tfw);
                       padding:5px 12px; border-radius:calc(var(--tr) - 2px); cursor:pointer; }
      .toggle button.on { background:var(--ta); color:var(--tac); }
    </style>
    <div class="bar"><div class="left"></div><div class="right"></div></div>`;

  const pad = n => String(n).padStart(2, "0");
  const iso = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
  const parseISO = s => { const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return r ? { y: +r[1], m: +r[2], d: +r[3] } : null; };
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fmtKey = (o, f) => f.replace("yyyy", String(o.y)).replace("MM", pad(o.m)).replace("dd", pad(o.d));
  const today = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
  const parseList = s => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  class FilterBar extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._props = Object.assign({}, DEFAULTS);
    }

    onCustomWidgetBeforeUpdate(changed) { this._props = Object.assign({}, this._props, changed); }
    onCustomWidgetAfterUpdate() { this._render(); this._syncDerived(); }
    connectedCallback() { this._render(); }

    _emitProps(o) { this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: o } })); }

    // ----- date logic -----
    _effDate() {
      const d = parseISO(this._props.dateValue) || today();
      d.d = Math.min(d.d, lastDay(d.y, d.m));
      return d;
    }
    _effGroup() {
      const list = parseList(this._props.groupsJson);
      if (list.some(g => g.id === this._props.selectedGroup)) return this._props.selectedGroup;
      return list[0] ? list[0].id : "";
    }
    _effOption(jsonKey, val) {
      const list = parseList(this._props[jsonKey]);
      if (list.some(o => o.id === val)) return val;
      return list[0] ? list[0].id : "";
    }
    _derive() {
      const p = this._props, e = this._effDate();
      const end = p.granularity === "day" ? e : { y: e.y, m: e.m, d: lastDay(e.y, e.m) };
      const mode = String(this._effOption("modeOptionsJson", p.mode)).toUpperCase();
      const start = mode === "YTD" ? { y: e.y, m: 1, d: 1 }
        : mode === "QTD" ? { y: e.y, m: 3 * Math.floor((e.m - 1) / 3) + 1, d: 1 }
        : { y: e.y, m: e.m, d: 1 };
      return {
        startDate: iso(start.y, start.m, start.d), endDate: iso(end.y, end.m, end.d),
        startKey: fmtKey(start, p.keyFormat), endKey: fmtKey(end, p.keyFormat),
        selectedGroup: this._effGroup(),
        mode: this._effOption("modeOptionsJson", p.mode),
        yearView: this._effOption("yearOptionsJson", p.yearView)
      };
    }
    _syncDerived() {
      const d = this._derive();
      if (Object.keys(d).some(k => d[k] !== this._props[k])) {
        Object.assign(this._props, d);
        this._emitProps(d);
      }
    }
    _commit(changes) {
      Object.assign(this._props, changes);
      const d = this._derive();
      Object.assign(this._props, d);
      this._render();
      this._emitProps(Object.assign({}, changes, d));
      this.dispatchEvent(new Event("onChange"));
    }

    _fmt(opts, y, m, d) {
      let loc = this._props.dateLocale || "en-GB";
      try { return new Intl.DateTimeFormat(loc, Object.assign({ timeZone: "UTC" }, opts)).format(new Date(Date.UTC(y, m - 1, d))); }
      catch (e) { return new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: "UTC" }, opts)).format(new Date(Date.UTC(y, m - 1, d))); }
    }

    // ----- rendering -----
    _item(label, text, ctl) {
      const it = el("div", "item");
      if (label) it.appendChild(el("span", "lbl" + (this._props.labelUppercase ? " up" : ""), label));
      const f = el("div", "field");
      f.appendChild(el("span", "val", text));
      f.insertAdjacentHTML("beforeend", CHEV);
      ctl.classList.add("ctl");
      f.appendChild(ctl);
      it.appendChild(f);
      return it;
    }

    _dateItem() {
      const p = this._props, e = this._effDate();
      if (p.granularity === "day") {
        const inp = el("input"); inp.type = "date"; inp.value = iso(e.y, e.m, e.d);
        const mn = parseISO(p.minDate), mx = parseISO(p.maxDate);
        if (mn) inp.min = iso(mn.y, mn.m, mn.d);
        if (mx) inp.max = iso(mx.y, mx.m, mx.d);
        inp.addEventListener("click", () => { try { inp.showPicker(); } catch (x) { } });
        inp.addEventListener("change", () => { if (inp.value) this._commit({ dateValue: inp.value }); });
        return this._item(p.dateLabel, this._fmt({ day: "2-digit", month: "short", year: "numeric" }, e.y, e.m, e.d), inp);
      }
      const sel = el("select");
      const mn = parseISO(p.minDate), mx = parseISO(p.maxDate), base = today().y;
      let y0 = mn ? mn.y : base - Number(p.yearsBack), y1 = mx ? mx.y : base + Number(p.yearsForward);
      y0 = Math.min(y0, e.y); y1 = Math.max(y1, e.y);
      for (let y = y0; y <= y1; y++) for (let m = 1; m <= 12; m++) {
        const o = el("option", "", this._fmt({ month: "short", year: "numeric" }, y, m, 1));
        o.value = y + "-" + pad(m); o.selected = (y === e.y && m === e.m);
        sel.appendChild(o);
      }
      sel.addEventListener("change", () => { const [yy, mm] = sel.value.split("-").map(Number); this._commit({ dateValue: iso(yy, mm, 1) }); });
      return this._item(p.dateLabel, this._fmt({ month: "short", year: "numeric" }, e.y, e.m, 1), sel);
    }

    _groupItem() {
      const p = this._props, list = parseList(p.groupsJson), cur = this._effGroup();
      const sel = el("select");
      list.forEach(g => { const o = el("option", "", g.label || g.id); o.value = g.id; o.selected = g.id === cur; sel.appendChild(o); });
      sel.addEventListener("change", () => this._commit({ selectedGroup: sel.value }));
      const g = list.find(x => x.id === cur);
      return this._item(p.groupLabel, g ? (g.label || g.id) : "—", sel);
    }

    _toggle(jsonKey, valKey) {
      const p = this._props, t = el("div", "toggle");
      const cur = this._effOption(jsonKey, p[valKey]);
      parseList(p[jsonKey]).forEach(o => {
        const b = el("button", cur === o.id ? "on" : "", o.label || o.id);
        b.addEventListener("click", () => { if (cur !== o.id) this._commit({ [valKey]: o.id }); });
        t.appendChild(b);
      });
      return t;
    }

    _render() {
      const p = this._props, s = this._shadow.querySelector(".bar").style;
      const v = {
        "--bg": p.backgroundColor, "--ff": p.fontFamily, "--px": p.paddingX + "px", "--gap": p.itemGap + "px",
        "--lc": p.labelColor, "--lfs": p.labelFontSize + "px", "--lfw": p.labelFontWeight, "--lls": p.labelLetterSpacing + "px",
        "--vc": p.valueColor, "--vfs": p.valueFontSize + "px", "--vfw": p.valueFontWeight, "--cc": p.chevronColor,
        "--dc": p.dividerColor, "--tb": p.toggleBorderColor, "--tbg": p.toggleBg, "--ta": p.toggleActiveBg,
        "--tac": p.toggleActiveColor, "--ti": p.toggleInactiveColor, "--tr": p.toggleRadius + "px",
        "--tfs": p.toggleFontSize + "px", "--tfw": p.toggleFontWeight, "--tgap": p.toggleGap + "px"
      };
      Object.keys(v).forEach(k => s.setProperty(k, v[k]));

      const left = this._shadow.querySelector(".left"), right = this._shadow.querySelector(".right");
      left.innerHTML = ""; right.innerHTML = "";
      if (p.showDate) left.appendChild(this._dateItem());
      if (p.showDate && p.showGroup && p.showDivider) left.appendChild(el("div", "divider"));
      if (p.showGroup) left.appendChild(this._groupItem());
      if (p.showToggle) right.appendChild(this._toggle("modeOptionsJson", "mode"));
      if (p.showYearToggle) right.appendChild(this._toggle("yearOptionsJson", "yearView"));
    }
  }
  customElements.define("com-custom-filterbar", FilterBar);
})();
