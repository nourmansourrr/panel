(function () {
  const W = [400, 500, 600, 700, 800];
  const FIELDS = [
    { section: "Bar" },
    { key: "fontFamily", label: "Font family", type: "text" },
    { key: "backgroundColor", label: "Background", type: "color" },
    { key: "paddingX", label: "Side padding (px)", type: "number" },
    { key: "itemGap", label: "Gap between items (px)", type: "number" },
    { section: "Labels (DATE:, GROUP:)" },
    { key: "labelColor", label: "Color", type: "color" },
    { key: "labelFontSize", label: "Size (px)", type: "number" },
    { key: "labelFontWeight", label: "Weight", type: "select", options: W },
    { key: "labelLetterSpacing", label: "Letter spacing (px)", type: "number" },
    { key: "labelUppercase", label: "Uppercase", type: "bool" },
    { section: "Values (Sep 2026, AQH)" },
    { key: "valueColor", label: "Color", type: "color" },
    { key: "valueFontSize", label: "Size (px)", type: "number" },
    { key: "valueFontWeight", label: "Weight", type: "select", options: W },
    { key: "chevronColor", label: "Chevron color", type: "color" },
    { key: "showDivider", label: "Show divider", type: "bool" },
    { key: "dividerColor", label: "Divider color", type: "color" },
    { section: "YTD / MTD toggle" },
    { key: "toggleBg", label: "Background", type: "color" },
    { key: "toggleBorderColor", label: "Border", type: "color" },
    { key: "toggleActiveBg", label: "Active background", type: "color" },
    { key: "toggleActiveColor", label: "Active text", type: "color" },
    { key: "toggleInactiveColor", label: "Inactive text", type: "color" },
    { key: "toggleRadius", label: "Corner radius (px)", type: "number" },
    { key: "toggleFontSize", label: "Font size (px)", type: "number" },
    { key: "toggleFontWeight", label: "Font weight", type: "select", options: W },
    { key: "toggleGap", label: "Gap between toggles (px)", type: "number" }
  ];

  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host { display:block; font-family:"72", Arial, sans-serif; font-size:13px; color:#32363a; }
      h4 { margin:14px 0 6px; font-size:13px; border-bottom:1px solid #e5e5e5; padding-bottom:3px; }
      .f { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
      .f label { flex:1; }
      input[type=text], input[type=number], select { width:120px; padding:4px 6px; border:1px solid #89919a; border-radius:4px; font:inherit; box-sizing:border-box; }
      input[type=color] { width:36px; height:26px; padding:0; border:1px solid #89919a; border-radius:4px; background:none; }
      .c { display:flex; gap:4px; align-items:center; }
      .c input[type=text] { width:78px; }
    </style>
    <div id="root"></div>`;

  class FilterBarStyling extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._root = this._shadow.getElementById("root");
      this._props = {}; this._built = false;
    }
    onCustomWidgetBeforeUpdate(c) { this._props = Object.assign({}, this._props, c); }
    onCustomWidgetAfterUpdate() { this._built ? this._sync() : this._build(); }

    _emit(k, v) {
      this._props[k] = v;
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: { [k]: v } } }));
    }

    _build() {
      const r = this._root; r.innerHTML = "";
      FIELDS.forEach(f => {
        if (f.section) { r.insertAdjacentHTML("beforeend", `<h4>${f.section}</h4>`); return; }
        const row = document.createElement("div"); row.className = "f";
        const lab = document.createElement("label"); lab.textContent = f.label; row.appendChild(lab);
        let c;
        if (f.type === "color") {
          c = document.createElement("div"); c.className = "c";
          const pick = document.createElement("input"); pick.type = "color";
          const txt = document.createElement("input"); txt.type = "text";
          pick.dataset.key = f.key; txt.dataset.key = f.key;
          pick.addEventListener("input", () => { txt.value = pick.value; this._emit(f.key, pick.value); });
          txt.addEventListener("change", () => { if (/^#[0-9a-fA-F]{6}$/.test(txt.value)) { pick.value = txt.value; this._emit(f.key, txt.value); } });
          c.append(pick, txt);
        } else if (f.type === "bool") {
          c = document.createElement("input"); c.type = "checkbox"; c.dataset.key = f.key;
          c.addEventListener("change", () => this._emit(f.key, c.checked));
        } else if (f.type === "select") {
          c = document.createElement("select"); c.dataset.key = f.key;
          f.options.forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o; c.appendChild(op); });
          c.addEventListener("change", () => this._emit(f.key, parseInt(c.value, 10)));
        } else {
          c = document.createElement("input"); c.type = f.type; c.dataset.key = f.key;
          if (f.type === "number") c.step = "any";
          c.addEventListener("change", () => this._emit(f.key, f.type === "number" ? Number(c.value) : c.value));
        }
        row.appendChild(c); r.appendChild(row);
      });
      this._built = true; this._sync();
    }

    _sync() {
      this._root.querySelectorAll("[data-key]").forEach(e => {
        const v = this._props[e.dataset.key];
        if (v === undefined) return;
        if (e.type === "checkbox") e.checked = !!v; else e.value = v;
      });
    }
  }
  customElements.define("com-custom-filterbar-styling", FilterBarStyling);
})();
