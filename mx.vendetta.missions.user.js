// ==UserScript==
// @name         mx.vendetta.missions
// @namespace    mx.vendetta.missions
// @version      1.2.0
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
  const LS = k => 'vd:missions:' + k;

  const toInt = v => {
    const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  /* =========================================================
     Styles
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

     /* Click */
    .vd-side-btn:active{
      transform: translateY(1px);
     }

      .vd-side-btn:hover{ background:#e8dbb5; }
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
     UNITS
  ========================================================= */
  function enhanceUnits() {
    $$('.unit-row').forEach(row => {
      if (row.dataset.vdDone) return;

      const label = row.querySelector('.unit-name');
      const input = row.querySelector('input[data-tropa]');
      if (!label || !input) return;

      row.dataset.vdDone = '1';

      const key = 'unit:' + input.dataset.tropa;
      const saved = localStorage.getItem(LS(key));
      if (saved !== null) input.value = saved;

      label.append(
        makeSaveClear(
          () => localStorage.setItem(LS(key), toInt(input.value)),
          () => { localStorage.removeItem(LS(key)); input.value = 0; }
        )
      );
    });
  }

  /* =========================================================
     RESOURCES
  ========================================================= */
  function enhanceResources() {
    $$('.resource-row').forEach(row => {
      if (row.dataset.vdDone) return;

      const label = row.querySelector('.resource-name');
      const input = row.querySelector('input[data-recurso]');
      if (!label || !input) return;

      row.dataset.vdDone = '1';

      const key = 'res:' + input.dataset.recurso;
      const saved = localStorage.getItem(LS(key));
      if (saved !== null) input.value = saved;

      label.append(
        makeSaveClear(
          () => localStorage.setItem(LS(key), toInt(input.value)),
          () => { localStorage.removeItem(LS(key)); input.value = 0; }
        )
      );
    });
  }

  /* =========================================================
     COORDINATES + MISSION
  ========================================================= */
  function enhanceGoal() {
    const coords = $$('.coordinate-input');
    if (coords.length === 3) {
      const row = coords[0].closest('.goal-row');
      if (row && !row.dataset.vdCoords) {
        row.dataset.vdCoords = '1';

        const label = row.querySelector('.goal-label');
        if (!label) return;

        const saved = localStorage.getItem(LS('coords'));
        if (saved) {
          try {
            const c = JSON.parse(saved);
            coords[0].value = c.x;
            coords[1].value = c.y;
            coords[2].value = c.z;
          } catch {}
        }

        label.append(
          makeSaveClear(
            () => localStorage.setItem(
              LS('coords'),
              JSON.stringify({
                x: toInt(coords[0].value),
                y: toInt(coords[1].value),
                z: toInt(coords[2].value)
              })
            ),
            () => {
              localStorage.removeItem(LS('coords'));
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

      const saved = localStorage.getItem(LS('mission'));
      if (saved) sel.value = saved;

      label.append(
        makeSaveClear(
          () => localStorage.setItem(LS('mission'), sel.value),
          () => { localStorage.removeItem(LS('mission')); sel.selectedIndex = 0; }
        )
      );
    }
  }

  /* =========================================================
     SIDEBAR BUILDING +/- (links & rechts vom Dropdown)
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
    const id = sel.options[i].value;
    if (typeof window.cambiarEdificio === 'function') {
      window.cambiarEdificio(id);
    }
  }


  /* =========================================================
   SEND < / SEND > AUTOLOOP – CONFIRM/ALERT SAFE
  ======================================================= */
const AUTO_KEY = 'vd:autoDir';

function addSendButtons() {
  const bar = document.querySelector('.action-buttons');
  const send = document.querySelector('.send-button');
  if (!bar || !send || bar.dataset.vdSend) return;

  bar.dataset.vdSend = '1';

  const mk = txt => {
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

function runAutoloop(dir, sendBtn) {
  sessionStorage.setItem(AUTO_KEY, String(dir));

  const origConfirm = window.confirm;
  const origAlert   = window.alert;

  let sent = false;

  // auto-confirm
  window.confirm = function () {
    return true;
  };

  // detect success alert
  window.alert = function (msg) {
    if (typeof msg === 'string' && msg.toLowerCase().includes('misión')) {
      sent = true;
      setTimeout(() => {
        switchBuildingAfterMission();
      }, 200);
    }
    origAlert(msg);
  };

  sendBtn.click();

  // safety restore
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
     BOOT
  ========================================================= */
  function boot() {
    ensureStyle();
    enhanceUnits();
    enhanceResources();
    enhanceGoal();
    enhanceSidebar();
    addSendButtons();
    applyAutoloopAfterReload();
  }

  boot();
  new MutationObserver(boot).observe(document.body, { childList:true, subtree:true });

})();

