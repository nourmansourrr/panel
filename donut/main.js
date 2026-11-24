(function () {
  const DEFAULTS = {
    title: "ASSET COMPOSITION", subtitle: "Current vs Non-Current Assets",
    label1: "", label2: "", label3: "", label4: "", label5: "", label6: "",
    manualJson: "",
    percentDecimals: 1, showPercentInLegend: true, showValueInLegend: false,
    showCenterTotal: false, centerLabel: "Total", legendPosition: "right",
    color1: "#2b5a8c", color2: "#1c2b40", color3: "#6fa8dc", color4: "#9fb4c9", color5: "#c9d6e3", color6: "#e6edf4",
    ringThickness: 37, sliceGap: 0,
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", backgroundColor: "#ffffff", borderColor: "#e5e9ef",
    borderRadius: 12, padding: 20,
    titleColor: "#1c2b40", titleFontSize: 20, titleFontWeight: 700, titleLetterSpacing: 1,
    subtitleColor: "#64748b", subtitleFontSize: 14,
    legendColor: "#5b6b7f", legendFontSize: 15, legendMarkerSize: 20,
    centerColor: "#1c2b40", centerFontSize: 22
  };

  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host { display:block; }
      .card { box-sizing:border-box; width:100%; height:100%; display:flex; flex-direction:column; overflow:hidden;
              background:var(--bg); border:1px solid var(--bc); border-radius:var(--br); padding:var(--pad); font-family:var(--ff); }
      .title { color:var(--tc); font-size:var(--tfs); font-weight:var(--tfw); letter-spacing:var(--tls); text-transform:uppercase; line-height:1.2; }
      .sub { color:var(--sc); font-size:var(--sfs); margin-top:2px; }
      .body { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; gap:28px; margin-top:8px; }
      .body.bottom { flex-direction:column; gap:12px; }
      .chart { flex:0 1 auto; height:100%; max-width:62%; aspect-ratio:1/1; min-width:0; }
      .body.bottom .chart { height:auto; width:60%; max-width:none; max-height:68%; }
      svg { width:100%; height:100%; display:block; }
      .legend { display:flex; flex-direction:column; gap:12px; }
      .body.bottom .legend { flex-direction:row; flex-wrap:wrap; justify-content:center; gap:8px 20px; }
      .item { display:flex; align-items:center; gap:10px; color:var(--lc); font-size:var(--lfs); white-space:nowrap; }
      .dot { width:var(--ms); height:var(--ms); border-radius:50%; flex:none; }
      .pct { font-weight:600; }
    </style>
    <div class="card"></div>`;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const natural = (a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0);

  class CompositionDonut extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._props = Object.assign({}, DEFAULTS);
      this._db = null;
    }

    onCustomWidgetBeforeUpdate(changed) {
      this._props = Object.assign({}, this._props, changed);
      if (changed && changed.dataBinding) this._db = changed.dataBinding;
    }
    onCustomWidgetAfterUpdate(changed) {
      if (changed && changed.dataBinding) this._db = changed.dataBinding;
      this._render();
    }
    set dataBinding(v) { this._db = v; this._render(); }
    get dataBinding() { return this._db; }
    connectedCallback() { this._render(); }

    // ---- read the measures SAC feeds in ----
    _fromBinding() {
      const db = this._db;
      if (!db || !Array.isArray(db.data) || !db.data.length) return [];
      const msm = (db.metadata && db.metadata.mainStructureMembers) || {};
      const out = [];

      // optional dimension: one slice per dimension member, using the first measure
      const dimKeys = r => Object.keys(r).filter(k => /^dimensions_\d+$/.test(k)).sort(natural);
      if (db.data.some(r => dimKeys(r).length)) {
        const mk = Object.keys(db.data[0]).filter(k => /^measures_\d+$/.test(k)).sort(natural)[0];
        if (mk) {
          return db.data.map(r => {
            const c = r[mk] || {};
            return {
              label: dimKeys(r).map(k => r[k] && (r[k].label || r[k].id)).filter(Boolean).join(" / "),
              value: Number(c.raw !== undefined ? c.raw : c.rawValue), formatted: c.formatted
            };
          });
        }
      }

      const row = db.data[0];
      Object.keys(row).filter(k => /^measures_\d+$/.test(k)).sort(natural).forEach(k => {
        const c = row[k] || {};
        out.push({ label: (msm[k] && (msm[k].label || msm[k].id)) || k, value: Number(c.raw !== undefined ? c.raw : c.rawValue), formatted: c.formatted });
      });
      if (!out.length) {
        // alternative shape: one row per measure
        db.data.forEach(r => {
          const m = r["@MeasureDimension"];
          if (m) out.push({ label: m.label || m.id, value: Number(m.rawValue), formatted: m.formattedValue });
        });
      }
      return out;
    }
    _fromManual() {
      try {
        const v = JSON.parse(this._props.manualJson);
        return Array.isArray(v) ? v.map(x => ({ label: x.label, value: Number(x.value) })) : [];
      } catch (e) { return []; }
    }
    _items() {
      let items = this._fromBinding();
      if (!items.length) items = this._fromManual();
      if (!items.length) items = [{ label: "Measure 1", value: 40 }, { label: "Measure 2", value: 60 }];   // design-time sample
      const p = this._props;
      return items.map((it, i) => ({
        label: p["label" + (i + 1)] || it.label,
        value: isFinite(it.value) ? Math.max(it.value, 0) : 0,
        formatted: it.formatted,
        color: p["color" + ((i % 6) + 1)]
      }));
    }

    _render() {
      const p = this._props, card = this._shadow.querySelector(".card");
      const v = {
        "--bg": p.backgroundColor, "--bc": p.borderColor, "--br": p.borderRadius + "px", "--pad": p.padding + "px",
        "--ff": p.fontFamily, "--tc": p.titleColor, "--tfs": p.titleFontSize + "px", "--tfw": p.titleFontWeight,
        "--tls": p.titleLetterSpacing + "px", "--sc": p.subtitleColor, "--sfs": p.subtitleFontSize + "px",
        "--lc": p.legendColor, "--lfs": p.legendFontSize + "px", "--ms": p.legendMarkerSize + "px"
      };
      Object.keys(v).forEach(k => card.style.setProperty(k, v[k]));

      const items = this._items();
      const total = items.reduce((s, i) => s + i.value, 0);
      const dec = Math.max(0, Number(p.percentDecimals) || 0);
      const outerR = 95, t = outerR * (Number(p.ringThickness) / 100), r = outerR - t / 2;
      const C = 2 * Math.PI * r, gap = Number(p.sliceGap) || 0;

      let svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;
      if (total <= 0) {
        svg += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${t}"/>`;
      } else {
        let cum = 0;
        items.forEach(it => {
          const frac = it.value / total;
          if (frac <= 0) return;
          const dash = Math.max(frac * C - (items.length > 1 ? gap : 0), 0.01);
          const pct = (frac * 100).toFixed(dec) + "%";
          svg += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${esc(it.color)}" stroke-width="${t}"
                    stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-cum * C}"
                    transform="rotate(-90 100 100)"><title>${esc(it.label)}: ${esc(it.formatted || it.value)} (${pct})</title></circle>`;
          cum += frac;
        });
      }
      if (p.showCenterTotal) {
        svg += `<text x="100" y="${p.centerLabel ? 98 : 106}" text-anchor="middle" font-size="${p.centerFontSize}" font-weight="700" fill="${esc(p.centerColor)}">${esc(total.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</text>`;
        if (p.centerLabel) svg += `<text x="100" y="118" text-anchor="middle" font-size="11" fill="${esc(p.subtitleColor)}">${esc(p.centerLabel)}</text>`;
      }
      svg += `</svg>`;

      const legend = items.map(it => {
        const extra = [];
        if (p.showPercentInLegend) extra.push(`<span class="pct">${total > 0 ? (it.value / total * 100).toFixed(dec) : (0).toFixed(dec)}%</span>`);
        if (p.showValueInLegend) extra.push(`<span>${esc(it.formatted || it.value.toLocaleString())}</span>`);
        return `<div class="item"><span class="dot" style="background:${esc(it.color)}"></span><span>${esc(it.label)}</span>${extra.length ? "<span>" + extra.join(" · ") + "</span>" : ""}</div>`;
      }).join("");

      card.innerHTML =
        (p.title ? `<div class="title">${esc(p.title)}</div>` : "") +
        (p.subtitle ? `<div class="sub">${esc(p.subtitle)}</div>` : "") +
        `<div class="body ${p.legendPosition === "bottom" ? "bottom" : ""}"><div class="chart">${svg}</div><div class="legend">${legend}</div></div>`;
    }
  }
  customElements.define("com-custom-compositiondonut", CompositionDonut);
})();
