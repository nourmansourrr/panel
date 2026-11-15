(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host { display:block; font-family: "72", Arial, sans-serif; font-size: 13px; color:#32363a; }
      h4 { margin: 14px 0 6px; font-size: 13px; }
      .row { display:flex; gap:6px; margin-bottom:6px; align-items:center; flex-wrap:wrap; }
      input[type=text], select { flex:1; min-width:90px; padding:5px 6px; border:1px solid #89919a; border-radius:4px; font:inherit; }
      .card { border:1px solid #d9d9d9; border-radius:6px; padding:8px; margin-bottom:8px; }
      button { padding:4px 10px; border:1px solid #0a6ed1; background:#fff; color:#0a6ed1; border-radius:4px; cursor:pointer; font:inherit; }
      button.del { border-color:#bb0000; color:#bb0000; }
      label.k { font-size:11px; color:#6a6d70; display:block; width:100%; }
      .hint { font-size:11px; color:#6a6d70; margin-bottom:6px; }
    </style>
    <div id="root"></div>`;

  const parse = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);

  class NavTabsBuilder extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._root = this._shadow.getElementById("root");
      this._state = { tabs: [], links: [], selectedTab: "", activeLink: "" };
    }

    onCustomWidgetBeforeUpdate(changed) {
      const p = changed;
      if ("tabsJson" in p) this._state.tabs = parse(p.tabsJson);
      if ("linksJson" in p) this._state.links = parse(p.linksJson);
      if ("selectedTab" in p) this._state.selectedTab = p.selectedTab;
      if ("activeLink" in p) this._state.activeLink = p.activeLink;
    }
    onCustomWidgetAfterUpdate() {
      // don't rebuild while the user is typing in one of our inputs
      if (this._shadow.activeElement && this._shadow.activeElement.tagName === "INPUT") return;
      this._render();
    }

    _commit() {
      const s = this._state;
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: {
        tabsJson: JSON.stringify(s.tabs),
        linksJson: JSON.stringify(s.links),
        selectedTab: s.selectedTab,
        activeLink: s.activeLink
      } } }));
    }

    _render() {
      const s = this._state;
      const r = this._root;
      r.innerHTML = "";

      // ---- Tabs ----
      r.insertAdjacentHTML("beforeend", `<h4>Page tabs (left)</h4><div class="hint">Use the selected tab's id in your onTabSelect script to show/hide content.</div>`);
      s.tabs.forEach((t, i) => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<input type="text" value="" placeholder="Label"><button class="del">✕</button>`;
        const inp = row.querySelector("input");
        inp.value = t.label;
        inp.addEventListener("input", () => { t.label = inp.value; this._commit(); });
        row.querySelector("button").addEventListener("click", () => {
          s.tabs.splice(i, 1);
          if (s.selectedTab === t.id) s.selectedTab = s.tabs[0] ? s.tabs[0].id : "";
          this._commit(); this._render();
        });
        r.appendChild(row);
      });
      const addTab = document.createElement("button");
      addTab.textContent = "+ Add tab";
      addTab.addEventListener("click", () => {
        s.tabs.push({ id: uid("tab_"), label: "New tab" });
        this._commit(); this._render();
      });
      r.appendChild(addTab);

      r.insertAdjacentHTML("beforeend", `<h4>Selected tab</h4>`);
      const selTab = document.createElement("select");
      s.tabs.forEach(t => {
        const o = document.createElement("option");
        o.value = t.id; o.textContent = t.label; o.selected = t.id === s.selectedTab;
        selTab.appendChild(o);
      });
      selTab.addEventListener("change", () => { s.selectedTab = selTab.value; this._commit(); });
      r.appendChild(selTab);

      // ---- Links ----
      r.insertAdjacentHTML("beforeend", `<h4>Story links (right)</h4><div class="hint">Story ID is in the story URL (…/story&amp;/s/&lt;ID&gt;). Page ID is optional.</div>`);
      s.links.forEach((l, i) => {
        const c = document.createElement("div");
        c.className = "card";
        c.innerHTML = `
          <label class="k">Label</label><div class="row"><input type="text" class="lbl"></div>
          <label class="k">Story ID</label><div class="row"><input type="text" class="sid"></div>
          <label class="k">Page ID (optional)</label><div class="row"><input type="text" class="pid"></div>
          <div class="row"><label><input type="checkbox" class="nt"> Open in new tab</label><button class="del" style="margin-left:auto">Remove</button></div>`;
        const bind = (sel, key) => {
          const el = c.querySelector(sel); el.value = l[key] || "";
          el.addEventListener("input", () => { l[key] = el.value; this._commit(); });
        };
        bind(".lbl", "label"); bind(".sid", "storyId"); bind(".pid", "pageId");
        const nt = c.querySelector(".nt"); nt.checked = !!l.newTab;
        nt.addEventListener("change", () => { l.newTab = nt.checked; this._commit(); });
        c.querySelector(".del").addEventListener("click", () => {
          s.links.splice(i, 1);
          if (s.activeLink === l.id) s.activeLink = "";
          this._commit(); this._render();
        });
        r.appendChild(c);
      });
      const addLink = document.createElement("button");
      addLink.textContent = "+ Add link";
      addLink.addEventListener("click", () => {
        s.links.push({ id: uid("link_"), label: "New link", storyId: "", pageId: "", newTab: false });
        this._commit(); this._render();
      });
      r.appendChild(addLink);

      r.insertAdjacentHTML("beforeend", `<h4>Active link (this story's section)</h4>`);
      const selLink = document.createElement("select");
      const none = document.createElement("option"); none.value = ""; none.textContent = "(none)"; selLink.appendChild(none);
      s.links.forEach(l => {
        const o = document.createElement("option");
        o.value = l.id; o.textContent = l.label; o.selected = l.id === s.activeLink;
        selLink.appendChild(o);
      });
      selLink.addEventListener("change", () => { s.activeLink = selLink.value; this._commit(); });
      r.appendChild(selLink);
    }
  }
  customElements.define("com-custom-navtabs-builder", NavTabsBuilder);
})();
