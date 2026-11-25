(function () {
  const FIELDS = [
    { section: "Typography" },
    { key: "fontFamily", label: "Font family", type: "text" },
    { key: "fontSize", label: "Font size (px)", type: "number" },
    { key: "activeFontWeight", label: "Active weight", type: "select", options: [400, 500, 600, 700, 800] },
    { key: "inactiveFontWeight", label: "Inactive weight", type: "select", options: [400, 500, 600, 700, 800] },

    { section: "Colors" },
    { key: "backgroundColor", label: "Background", type: "color" },
    { key: "activeColor", label: "Active text", type: "color" },
    { key: "inactiveColor", label: "Inactive text", type: "color" },
    { key: "hoverColor", label: "Hover text", type: "color" },

    { section: "Active tab underline" },
    { key: "underlineColor", label: "Underline color", type: "color" },
    { key: "underlineThickness", label: "Underline thickness (px)", type: "number" },

    { section: "Bottom line & dividers" },
    { key: "baselineColor", label: "Bottom line color", type: "color" },
    { key: "baselineThickness", label: "Bottom line thickness (px)", type: "number" },
    { key: "dividerColor", label: "Divider color", type: "color" },
    { key: "showEdgeLine", label: "Show left edge line", type: "bool" },
    { key: "showLinkDivider", label: "Show divider between links", type: "bool" },

    { section: "Spacing" },
    { key: "tabGap", label: "Gap between tabs (px)", type: "number" },
    { key: "tabPaddingX", label: "Tab horizontal padding (px)", type: "number" },
    { key: "leftOffset", label: "Left offset (px)", type: "number" },
    { key: "linkPaddingX", label: "Link horizontal padding (px)", type: "number" },
    { key: "rightOffset", label: "Right offset (px)", type: "number" }
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

  class NavTabsStyling extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._root = this._shadow.getElementById("root");
      this._props = {};
      this._built = false;
    }

    onCustomWidgetBeforeUpdate(changed) { this._props = Object.assign({}, this._props, changed); }
    onCustomWidgetAfterUpdate() { this._built ? this._sync() : this._build(); }

    _emit(key, value) {
      this._props[key] = value;
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: { [key]: value } } }));
    }

    _build() {
      const r = this._root;
      r.innerHTML = "";
      FIELDS.forEach(f => {
        if (f.section) { r.insertAdjacentHTML("beforeend", `<h4>${f.section}</h4>`); return; }
        const row = document.createElement("div");
        row.className = "f";
        const lab = document.createElement("label"); lab.textContent = f.label; row.appendChild(lab);

        let el;
        if (f.type === "color") {
          const wrap = document.createElement("div"); wrap.className = "c";
          const pick = document.createElement("input"); pick.type = "color";
          const txt = document.createElement("input"); txt.type = "text";
          pick.dataset.key = txt.dataset.key = f.key;
          pick.addEventListener("input", () => { txt.value = pick.value; this._emit(f.key, pick.value); });
          txt.addEventListener("change", () => {
            if (/^#[0-9a-fA-F]{6}$/.test(txt.value)) { pick.value = txt.value; this._emit(f.key, txt.value); }
          });
          wrap.append(pick, txt); el = wrap;
        } else if (f.type === "bool") {
          el = document.createElement("input"); el.type = "checkbox"; el.dataset.key = f.key;
          el.addEventListener("change", () => this._emit(f.key, el.checked));
        } else if (f.type === "select") {
          el = document.createElement("select"); el.dataset.key = f.key;
          f.options.forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o; el.appendChild(op); });
          el.addEventListener("change", () => this._emit(f.key, parseInt(el.value, 10)));
        } else {
          el = document.createElement("input"); el.type = f.type; el.dataset.key = f.key;
          el.addEventListener("change", () => this._emit(f.key, f.type === "number" ? Number(el.value) : el.value));
        }
        row.appendChild(el);
        r.appendChild(row);
      });
      this._built = true;
      this._sync();
    }

    _sync() {
      this._root.querySelectorAll("[data-key]").forEach(el => {
        const v = this._props[el.dataset.key];
        if (v === undefined) return;
        if (el.type === "checkbox") el.checked = !!v;
        else if (el.type === "color") el.value = v;
        else el.value = v;
      });
    }
  }
  customElements.define("com-custom-navtabs2-styling", NavTabsStyling);
})();
