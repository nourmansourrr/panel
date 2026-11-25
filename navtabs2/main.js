(function () {
  const DEFAULTS = {
    tabsJson: '[{"id":"overview","label":"Overview","pageId":""},{"id":"pl","label":"P&L","pageId":""},{"id":"cashflow","label":"Cash Flow","pageId":""},{"id":"balance","label":"Balance Sheet","pageId":""}]',
    linksJson: '[{"id":"group","label":"Group Performance","storyId":"","pageId":"","newTab":false},{"id":"company","label":"Company Performance","storyId":"","pageId":"","newTab":false}]',
    storyId: "", selectedTab: "overview", selectedTabPageId: "", activeLink: "company",
    clickedLinkLabel: "", clickedLinkStoryId: "", clickedLinkPageId: "", clickedLinkNewTab: false,
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", fontSize: 16,
    activeFontWeight: 600, inactiveFontWeight: 500,
    backgroundColor: "#ffffff", activeColor: "#1b2a3b", inactiveColor: "#6b7a8c", hoverColor: "#1b2a3b",
    underlineColor: "#1b2a3b", underlineThickness: 3, baselineColor: "#1b2a3b", baselineThickness: 2,
    dividerColor: "#e3e6ea", showEdgeLine: true, showLinkDivider: true,
    tabGap: 28, tabPaddingX: 8, leftOffset: 24, linkPaddingX: 16, rightOffset: 16
  };

  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host { display: block; }
      .bar { position: relative; display: flex; justify-content: space-between; align-items: stretch;
             width: 100%; height: 100%; box-sizing: border-box; background: var(--bg);
             font-family: var(--ff); font-size: var(--fs); overflow: hidden; }
      .baseline { position: absolute; left: 0; right: 0; bottom: 0; height: var(--blt); background: var(--blc); pointer-events: none; }
      .left, .right { display: flex; align-items: stretch; }
      .left  { padding-left: var(--lo); }
      .right { padding-right: var(--ro); }
      .edge { width: 1px; background: var(--div); margin: 8px 0; margin-right: var(--lo-gap, 0); align-self: stretch; }
      .item { position: relative; display: flex; align-items: center; cursor: pointer; user-select: none;
              color: var(--inactive); font-weight: var(--fw-i); white-space: nowrap;
              background: none; border: 0; font: inherit; font-weight: var(--fw-i); }
      .item:hover { color: var(--hover); }
      .item.active { color: var(--active); font-weight: var(--fw-a); }
      .tab { padding: 0 var(--tpx); margin-right: var(--gap); }
      .tab:last-child { margin-right: 0; }
      .tab.active::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: var(--ult); background: var(--ul); }
      .link { padding: 0 var(--lpx); }
      .sep { width: 1px; background: var(--div); margin: 14px 0; }
      .sep.off { display: none; }
    </style>
    <div class="bar">
      <div class="left"></div>
      <div class="right"></div>
      <div class="baseline"></div>
    </div>`;

  const parse = (s, fb) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : fb; } catch (e) { return fb; } };

  class NavTabs extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._props = Object.assign({}, DEFAULTS);
      this._lastLink = null;
    }

    onCustomWidgetBeforeUpdate(changed) { this._props = Object.assign({}, this._props, changed); }
    onCustomWidgetAfterUpdate() { this._render(); this._syncPageId(); }
    onCustomWidgetResize() { }
    connectedCallback() { this._render(); }

    _emitProps(obj) {
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: obj } }));
    }

    _render() {
      const p = this._props;
      const bar = this._shadow.querySelector(".bar");
      const s = bar.style;
      s.setProperty("--bg", p.backgroundColor);
      s.setProperty("--ff", p.fontFamily);
      s.setProperty("--fs", p.fontSize + "px");
      s.setProperty("--fw-a", p.activeFontWeight);
      s.setProperty("--fw-i", p.inactiveFontWeight);
      s.setProperty("--active", p.activeColor);
      s.setProperty("--inactive", p.inactiveColor);
      s.setProperty("--hover", p.hoverColor);
      s.setProperty("--ul", p.underlineColor);
      s.setProperty("--ult", p.underlineThickness + "px");
      s.setProperty("--blc", p.baselineColor);
      s.setProperty("--blt", p.baselineThickness + "px");
      s.setProperty("--div", p.dividerColor);
      s.setProperty("--gap", p.tabGap + "px");
      s.setProperty("--tpx", p.tabPaddingX + "px");
      s.setProperty("--lpx", p.linkPaddingX + "px");
      s.setProperty("--lo", p.leftOffset + "px");
      s.setProperty("--ro", p.rightOffset + "px");

      const left = this._shadow.querySelector(".left");
      const right = this._shadow.querySelector(".right");
      left.innerHTML = ""; right.innerHTML = "";

      if (p.showEdgeLine) {
        // thin vertical line at the very left, like the screenshot
        const edge = document.createElement("div");
        edge.className = "edge";
        edge.style.marginRight = "24px";
        left.style.paddingLeft = "0";
        edge.style.marginLeft = p.leftOffset + "px";
        left.appendChild(edge);
      }

      parse(p.tabsJson, []).forEach(t => {
        const b = document.createElement("button");
        b.className = "item tab" + (t.id === p.selectedTab ? " active" : "");
        b.textContent = t.label;
        b.addEventListener("click", () => this._selectTab(t.id));
        left.appendChild(b);
      });

      const links = parse(p.linksJson, []);
      links.forEach((l, i) => {
        if (i > 0) {
          const sep = document.createElement("div");
          sep.className = "sep" + (p.showLinkDivider ? "" : " off");
          right.appendChild(sep);
        }
        const b = document.createElement("button");
        b.className = "item link" + (l.id === p.activeLink ? " active" : "");
        b.textContent = l.label;
        b.addEventListener("click", () => {
          this._props.clickedLinkLabel   = l.label || "";
          this._props.clickedLinkStoryId = l.storyId || "";
          this._props.clickedLinkPageId  = (l.pageMap && l.pageMap[this._props.selectedTab]) || l.pageId || "";
          this._props.clickedLinkNewTab  = !!l.newTab;
          this._emitProps({
            clickedLinkLabel: this._props.clickedLinkLabel,
            clickedLinkStoryId: this._props.clickedLinkStoryId,
            clickedLinkPageId: this._props.clickedLinkPageId,
            clickedLinkNewTab: this._props.clickedLinkNewTab
          });
          this.dispatchEvent(new Event("onLinkClick"));
        });
        right.appendChild(b);
      });
    }

    // ---- internal helpers (scripting methods in widget.json read properties) ----
    _pageIdFor(tabId) {
      const t = parse(this._props.tabsJson, []).find(x => x.id === tabId);
      return t ? (t.pageId || "") : "";
    }
    _syncPageId() {
      const pid = this._pageIdFor(this._props.selectedTab);
      if (pid !== this._props.selectedTabPageId) {
        this._props.selectedTabPageId = pid;
        this._emitProps({ selectedTabPageId: pid });
      }
    }
    _selectTab(id) {
      const pid = this._pageIdFor(id);
      this._props.selectedTab = id;
      this._props.selectedTabPageId = pid;
      this._render();
      this._emitProps({ selectedTab: id, selectedTabPageId: pid });
      this.dispatchEvent(new Event("onTabSelect"));
    }
  }

  customElements.define("com-custom-navtabs2", NavTabs);
})();
