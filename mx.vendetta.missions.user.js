// ==UserScript==
// @name         mx.vendetta.missioni
// @namespace    mx.vendetta.missioni
// @version      2.0.0
// @description  Missions-Script für vendettagame.es: Save/Clear für Einheiten, Ressourcen, Koordinaten & Mission + Send </> Autoloop + Gebäude +/- im Sidebar
// @match        https://vendettagame.es/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/mxOneScripts/mx.vendetta.missioni/raw/refs/heads/main/mx.vendetta.missions.user.js
// @downloadURL  https://github.com/mxOneScripts/mx.vendetta.missioni/raw/refs/heads/main/mx.vendetta.missions.user.js
// ==/UserScript==


(function () {
  'use strict';

  /* =========================================================
     Helpers
  ========================================================= */
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const LS_M = (k) => 'vd:missions:' + k;
  const LS_VG = (k) => 'vd:vg:collapse:' + k;

  const toInt = (v) => {
    const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const norm = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const isMissionsPage = () => /\/misiones\b/.test(location.pathname);
  const isVisionGeneralPage = () => /\/vision-general\b/.test(location.pathname);

  /* =========================================================
     Styles (dein aktuelles CSS + Toggle CSS)
  ========================================================= */
  function ensureStyle() {
    if ($('#vdMissionFinalStyle')) return;

    const css = `
      .vd-sc-wrap{
        display:inline-flex;
        gap:6px;
        margin-left:auto;
        white-space:nowrap;
      }

      .vd-btn{
        padding:2px 6px;
        border:1px solid #888;
        border-radius:3px;
        background:#eee;
        font-size:11px;
        cursor:pointer;
      }

      .vd-btn:hover{ filter:brightness(1.05); }

      .unit-name, .resource-name, .goal-label{
        display:flex;
        align-items:center;
        min-width:220px;
      }

      .vd-side-wrap{
        display:flex;
        align-items:center;
        gap:6px;
        margin-top:6px;
      }

      .vd-side-btn{
        padding:10px 4px;
        border-radius:3px;
        border:1px solid #800000;
        background:#f0e6d0;
        color:#800000;
        font-weight:bold;
        cursor:pointer;
        transition:
         background-color 0.15s ease,
         box-shadow 0.15s ease,
         transform 0.05s ease;
      }

      .vd-side-btn:hover{
        background:#e8dbb5;
        box-shadow: inset 0 0 0 1px rgba(128,0,0,0.25);
      }

      .vd-side-btn:active{
        transform: translateY(1px);
      }

      /* ===== NUR Visión general: Toggle Button im roten Header ===== */
     .vd-vg-toggle{
  display:inline-flex;
  align-items:center;
  justify-content:center;

  width:19px;
  height:16px;
  line-height:18px;

  padding-bottom:3px;
  padding-top:0;

  border-radius:3px;
  border:1px solid rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.10);
  color:#fff;
  font-weight:700;
  font-size:14px;        /* optional, aber konsistent */
  cursor:pointer;
  user-select:none;

  transition: background .15s ease, transform .05s ease;
}

      .vd-vg-toggle:hover{ background: rgba(255,255,255,0.20); }
      .vd-vg-toggle:active{ transform: translateY(1px); }

      .vd-vg-collapsed{
        display:none !important;
      }
      /* FIX: Section-Header einheitlich ausrichten */
      .vd-vg-header{
       display:flex !important;
       align-items:center;
       justify-content:space-between;
     }
    `;

    const st = document.createElement('style');
    st.id = 'vdMissionFinalStyle';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function makeBtn(label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vd-btn';
    b.textContent = label;
    return b;
  }

  function makeSaveClear(saveFn, clearFn) {
    const wrap = document.createElement('span');
    wrap.className = 'vd-sc-wrap';

    const s = makeBtn('Save');
    const c = makeBtn('Clear');

    s.onclick = saveFn;
    c.onclick = clearFn;

    wrap.append(s, c);
    return wrap;
  }

  /* =========================================================
     Missions: Save/Clear (nur /misiones)
  ========================================================= */
  function enhanceUnits() {
    if (!isMissionsPage()) return;

    $$('.unit-row').forEach(row => {
      if (row.dataset.vdDone) return;

      const label = row.querySelector('.unit-name');
      const input = row.querySelector('input[data-tropa]');
      if (!label || !input) return;

      row.dataset.vdDone = '1';

      const key = 'unit:' + input.dataset.tropa;
      const saved = localStorage.getItem(LS_M(key));
      if (saved !== null) input.value = saved;

      label.append(
        makeSaveClear(
          () => localStorage.setItem(LS_M(key), String(toInt(input.value))),
          () => { localStorage.removeItem(LS_M(key)); input.value = 0; }
        )
      );
    });
  }

  function enhanceResources() {
    if (!isMissionsPage()) return;

    $$('.resource-row').forEach(row => {
      if (row.dataset.vdDone) return;

      const label = row.querySelector('.resource-name');
      const input = row.querySelector('input[data-recurso]');
      if (!label || !input) return;

      row.dataset.vdDone = '1';

      const key = 'res:' + input.dataset.recurso;
      const saved = localStorage.getItem(LS_M(key));
      if (saved !== null) input.value = saved;

      label.append(
        makeSaveClear(
          () => localStorage.setItem(LS_M(key), String(toInt(input.value))),
          () => { localStorage.removeItem(LS_M(key)); input.value = 0; }
        )
      );
    });
  }

  function enhanceGoal() {
    if (!isMissionsPage()) return;

    const coords = $$('.coordinate-input');
    if (coords.length === 3) {
      const row = coords[0].closest('.goal-row');
      if (row && !row.dataset.vdCoords) {
        row.dataset.vdCoords = '1';

        const label = row.querySelector('.goal-label');
        if (!label) return;

        const saved = localStorage.getItem(LS_M('coords'));
        if (saved) {
          try {
            const c = JSON.parse(saved);
            coords[0].value = c.x ?? coords[0].value;
            coords[1].value = c.y ?? coords[1].value;
            coords[2].value = c.z ?? coords[2].value;
          } catch {}
        }

        label.append(
          makeSaveClear(
            () => localStorage.setItem(
              LS_M('coords'),
              JSON.stringify({
                x: toInt(coords[0].value),
                y: toInt(coords[1].value),
                z: toInt(coords[2].value)
              })
            ),
            () => {
              localStorage.removeItem(LS_M('coords'));
              coords.forEach(i => i.value = 0);
            }
          )
        );
      }
    }

    const sel = $('.mission-select');
    if (sel && !sel.dataset.vdMission) {
      sel.dataset.vdMission = '1';

      const row = sel.closest('.goal-row');
      const label = row?.querySelector('.goal-label');
      if (!label) return;

      const saved = localStorage.getItem(LS_M('mission'));
      if (saved) sel.value = saved;

      label.append(
        makeSaveClear(
          () => localStorage.setItem(LS_M('mission'), sel.value),
          () => { localStorage.removeItem(LS_M('mission')); sel.selectedIndex = 0; }
        )
      );
    }
  }

  /* =========================================================
     Sidebar Gebäude +/- (global, alle Seiten)
  ========================================================= */
  function enhanceSidebar() {
    $$('#edificio_selector').forEach(sel => {
      if (sel.dataset.vdSide) return;
      sel.dataset.vdSide = '1';

      const wrap = document.createElement('div');
      wrap.className = 'vd-side-wrap';

      const minus = document.createElement('button');
      minus.className = 'vd-side-btn';
      minus.textContent = '−';

      const plus = document.createElement('button');
      plus.className = 'vd-side-btn';
      plus.textContent = '+';

      minus.onclick = () => switchBuilding(sel, -1);
      plus.onclick  = () => switchBuilding(sel, +1);

      sel.parentElement.insertBefore(wrap, sel);
      wrap.append(minus, sel, plus);
    });
  }

  function switchBuilding(sel, dir) {
    const i = sel.selectedIndex + dir;
    if (i < 0 || i >= sel.options.length) return;
    if (typeof window.cambiarEdificio === 'function') {
      window.cambiarEdificio(sel.options[i].value);
    }
  }

  /* =========================================================
     Send Buttons (nur /misiones)
  ========================================================= */
  function addSendButtons() {
    if (!isMissionsPage()) return;

    const bar = $('.action-buttons');
    const send = $('.send-button');
    if (!bar || !send || bar.dataset.vdSend) return;

    bar.dataset.vdSend = '1';

    const mk = (txt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'action-button';
      b.textContent = txt;
      return b;
    };

    const prev = mk('< Send');
    const next = mk('Send >');

    prev.onclick = () => runAutoloop(-1, send);
    next.onclick = () => runAutoloop(1, send);

    bar.insertBefore(prev, bar.firstChild);
    bar.appendChild(next);
  }

  const AUTO_KEY = 'vd:autoDir';

  function runAutoloop(dir, sendBtn) {
    sessionStorage.setItem(AUTO_KEY, String(dir));

    const origConfirm = window.confirm;
    const origAlert   = window.alert;

    window.confirm = function () { return true; };

    window.alert = function (msg) {
      try {
        if (typeof msg === 'string' && norm(msg).includes('mision')) {
          setTimeout(() => switchBuildingAfterMission(), 250);
        }
      } catch {}
      origAlert(msg);
    };

    sendBtn.click();

    setTimeout(() => {
      window.confirm = origConfirm;
      window.alert   = origAlert;
    }, 5000);
  }

  function switchBuildingAfterMission() {
    const dir = parseInt(sessionStorage.getItem(AUTO_KEY) || '0', 10);
    if (!dir) return;

    const sels = document.querySelectorAll('#edificio_selector');
    const sel = Array.from(sels).find(s => s.offsetWidth > 0) || sels[0];
    if (!sel) return;

    sessionStorage.removeItem(AUTO_KEY);

    const i = sel.selectedIndex + dir;
    if (i < 0 || i >= sel.options.length) return;

    if (typeof window.cambiarEdificio === 'function') {
      window.cambiarEdificio(sel.options[i].value);
    }
  }

  /* =========================================================
     Visión general: Global Collapse (NUR /vision-general)
     FIX: echte Abschnitt-Header erkennen (inkl. <header> bei MISIÓNES),
          keine Punkte-Kacheln mehr
  ========================================================= */

  const VG_SECTION_KEYS = {
    'misiones': 'misiones',
    'habitaciones en construccion': 'hab_construccion',
    'habitaciones en construcción': 'hab_construccion',
    'reclutamiento': 'reclutamiento',
    'seguridad': 'seguridad',
    'entrenamiento': 'entrenamiento',
    'tropas en edificio': 'tropas_edificio',
    'tropas en el edificio': 'tropas_edificio'
  };

  // ✅ NUR diese "rot + px-2 py-1 text-xs" Header sind Sektionen
  function getSectionHeaders() {
    return $$('[class*="bg-[#800000]"]')
      .filter(el =>
        el.classList.contains('bg-[#800000]') &&
        el.classList.contains('text-white') &&
        el.classList.contains('font-bold') &&
        el.classList.contains('px-2') &&
        el.classList.contains('py-1') &&
        el.classList.contains('text-xs')
      );
  }

  function attachToggleToHeader(header, collapsed, onClick) {
    const toggle = document.createElement('span');
    toggle.className = 'vd-vg-toggle';
    toggle.textContent = collapsed ? '+' : '−';
    toggle.addEventListener('click', onClick);

    // Wenn rechts schon ein <span>(x/y)</span> existiert, packen wir Toggle daneben.
    const spans = header.querySelectorAll('span');
    const rightSpan = spans.length >= 2 ? spans[1] : null;

    if (rightSpan && rightSpan.parentElement === header) {
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '10px';

      header.replaceChild(wrap, rightSpan);
      wrap.appendChild(rightSpan);
      wrap.appendChild(toggle);
    } else {
      const wrap = document.createElement('span');
      wrap.style.marginLeft = 'auto';
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.appendChild(toggle);
      header.appendChild(wrap);
    }

    return toggle;
  }

  function enhanceVisionGeneralCollapse() {
    if (!isVisionGeneralPage()) return;

    const headers = getSectionHeaders();

    headers.forEach(h => {
      if (h.dataset.vdVgDone) return;

      const titleText = h.querySelector('span')?.textContent || h.textContent || '';
      const title = norm(titleText);

      const keyMatch = Object.keys(VG_SECTION_KEYS).find(k => title.includes(norm(k)));
      if (!keyMatch) return;

      h.dataset.vdVgDone = '1';
      h.classList.add('vd-vg-header');

      const sectionId = VG_SECTION_KEYS[keyMatch];
      const storageKey = LS_VG(sectionId);

      // MISIÓNES: klappt bis zum nächsten "echten" Section-Header ein
      if (sectionId === 'misiones') {
        enhanceVisionGeneralMissionsBlock(h, storageKey);
        return;
      }

      // Standard: Header + nächstes Element
      const content = h.nextElementSibling;
      if (!content) return;

      let collapsed = localStorage.getItem(storageKey) === '1';
      if (collapsed) content.classList.add('vd-vg-collapsed');

      attachToggleToHeader(h, collapsed, () => {
        collapsed = !collapsed;
        content.classList.toggle('vd-vg-collapsed', collapsed);
        localStorage.setItem(storageKey, collapsed ? '1' : '0');
        const t = h.querySelector('.vd-vg-toggle');
        if (t) t.textContent = collapsed ? '+' : '−';
      });
    });
  }

  function enhanceVisionGeneralMissionsBlock(mHeader, storageKey) {
    if (!isVisionGeneralPage()) return;

    const headers = getSectionHeaders();
    const headerSet = new Set(headers);

    const toToggle = [];
    let el = mHeader.nextElementSibling;

    while (el) {
      if (headerSet.has(el)) break; // nächster "echter" Abschnittheader
      toToggle.push(el);
      el = el.nextElementSibling;
    }

    let collapsed = localStorage.getItem(storageKey) === '1';
    if (collapsed) toToggle.forEach(n => n.classList.add('vd-vg-collapsed'));

    attachToggleToHeader(mHeader, collapsed, () => {
      collapsed = !collapsed;
      toToggle.forEach(n => n.classList.toggle('vd-vg-collapsed', collapsed));
      localStorage.setItem(storageKey, collapsed ? '1' : '0');
      const t = mHeader.querySelector('.vd-vg-toggle');
      if (t) t.textContent = collapsed ? '+' : '−';
    });
  }

  /* =========================================================
     BOOT
  ========================================================= */
  function boot() {
    ensureStyle();

    // global
    enhanceSidebar();

    // nur /misiones
    enhanceUnits();
    enhanceResources();
    enhanceGoal();
    addSendButtons();

    // NUR /vision-general
    enhanceVisionGeneralCollapse();
  }

  boot();
  new MutationObserver(boot).observe(document.body, { childList:true, subtree:true });

})();

