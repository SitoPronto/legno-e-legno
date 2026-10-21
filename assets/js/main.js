/* LEGNO e LEGNO — script del sito (nessun cookie, nessun tracciamento) */
(function () {
  'use strict';

  var WA_NUMBER = '393472738447';
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

  // Orari in minuti dalla mezzanotte (fonte: scheda Google, ottobre 2026)
  var MATTINA = [480, 750];       // 8:00-12:30
  var POMERIGGIO = [840, 1110];   // 14:00-18:30
  var ORARI = {
    0: [],
    1: [MATTINA, POMERIGGIO],
    2: [MATTINA, POMERIGGIO],
    3: [MATTINA, POMERIGGIO],
    4: [MATTINA, POMERIGGIO],
    5: [MATTINA, POMERIGGIO],
    6: [MATTINA]
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- ora italiana (Europe/Rome) ---------- */
  function oraDiRoma() {
    var d = new Date();
    try {
      var parti = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23'
      }).formatToParts(d);
      var p = {};
      parti.forEach(function (x) { p[x.type] = x.value; });
      var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
      var h = parseInt(p.hour, 10) % 24;
      if (wd >= 0) {
        return { y: +p.year, m: +p.month, d: +p.day, h: h, min: +p.minute, wd: wd };
      }
    } catch (e) { /* browser senza fusi orari: uso l'ora del dispositivo */ }
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), min: d.getMinutes(), wd: d.getDay() };
  }

  /* ---------- festività nazionali (orari da verificare) ---------- */
  function pasqua(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1;
    return { m: mese, d: giorno };
  }

  var FESTE = {
    '1-1': 'Capodanno', '1-6': 'Epifania', '4-25': 'Festa della Liberazione', '5-1': 'Festa del lavoro',
    '6-2': 'Festa della Repubblica', '8-15': 'Ferragosto', '10-4': 'San Francesco, patrono d’Italia',
    '11-1': 'Ognissanti', '12-8': 'Immacolata', '12-25': 'Natale', '12-26': 'Santo Stefano'
  };

  function festa(y, m, d) {
    if (FESTE[m + '-' + d]) return FESTE[m + '-' + d];
    var p = pasqua(y);
    var lunedi = new Date(Date.UTC(y, p.m - 1, p.d + 1));
    if (lunedi.getUTCMonth() + 1 === m && lunedi.getUTCDate() === d) return 'Lunedì dell’Angelo';
    return null;
  }

  function hhmm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ---------- aperto / chiuso ---------- */
  function statoApertura(now) {
    var t = now.h * 60 + now.min;
    var nomeFesta = festa(now.y, now.m, now.d);
    if (nomeFesta) {
      return {
        state: 'holiday', short: 'Oggi festivo', title: 'Oggi è festivo',
        sub: nomeFesta + ': gli orari possono variare, meglio chiamare prima.',
        line: 'Oggi è festivo: meglio chiamare prima'
      };
    }
    var oggi = ORARI[now.wd];
    for (var i = 0; i < oggi.length; i++) {
      if (t >= oggi[i][0] && t < oggi[i][1]) {
        var resta = oggi[i][1] - t;
        var sub = resta <= 30
          ? 'Chiude tra ' + resta + (resta === 1 ? ' minuto' : ' minuti') + ', alle ' + hhmm(oggi[i][1]) + '.'
          : 'Chiude alle ' + hhmm(oggi[i][1]) + '.';
        return { state: 'open', short: 'Aperto ora', title: 'Aperto ora', sub: sub, line: 'Aperto ora · ' + sub.replace(/\.$/, '').replace(/^C/, 'c') };
      }
    }
    var quando = null;
    for (var j = 0; j < oggi.length; j++) {
      if (oggi[j][0] > t) { quando = 'oggi alle ' + hhmm(oggi[j][0]); break; }
    }
    if (!quando) {
      for (var k = 1; k <= 9; k++) {
        var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + k));
        var wd = dt.getUTCDay();
        if (festa(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) continue;
        if (ORARI[wd].length) {
          quando = (k === 1 ? 'domani' : GIORNI[wd]) + ' alle ' + hhmm(ORARI[wd][0][0]);
          break;
        }
      }
    }
    var testo = 'Riapre ' + (quando || 'presto') + '.';
    return { state: 'closed', short: 'Chiuso ora', title: 'Chiuso ora', sub: testo, line: 'Chiuso ora · riapre ' + (quando || 'presto') };
  }

  function aggiornaStato() {
    var now = oraDiRoma();
    var s = statoApertura(now);
    $$('[data-status]').forEach(function (el) {
      el.setAttribute('data-state', s.state);
      var a = $('[data-status-short]', el); if (a) a.textContent = s.short;
      var b = $('[data-status-title]', el); if (b) b.textContent = s.title;
      var c = $('[data-status-line]', el); if (c) c.textContent = s.line;
    });
    var pill = $('.status-pill');
    if (pill) pill.setAttribute('aria-label', s.title + '. ' + s.sub + ' Vai agli orari.');
    var sub = $('[data-status-sub]'); if (sub) sub.textContent = s.sub;
    $$('.hours tr').forEach(function (tr) {
      tr.classList.toggle('is-today', +tr.getAttribute('data-day') === now.wd);
    });
    return now;
  }

  /* ---------- messaggio WhatsApp per il preventivo ---------- */
  function pulisci(s) {
    return String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function initBuilder() {
    var box = $('[data-builder]');
    if (!box) return;
    var preview = $('[data-preview]', box);
    var link = $('[data-wa-link]', box);
    var misure = $('#misure', box);
    var luogo = $('#luogo', box);
    var quando = $('#quando', box);
    var foto = $('input[name="foto"]', box);

    var LAVORI = {
      armadio: { frase: 'un armadio in legno', esempio: 'es. parete di 3 m, alta 2,70 m' },
      infissi: { frase: 'degli infissi in legno', esempio: 'es. 2 finestre da 120 × 140 cm' },
      persiane: { frase: 'delle persiane in legno', esempio: 'es. 3 finestre da 100 × 150 cm' },
      altro: { frase: 'un lavoro in legno', esempio: 'es. lunghezza, larghezza e altezza' }
    };
    var TEMPI = {
      presto: 'Mi servirebbe il prima possibile.',
      mese: 'Mi servirebbe entro un mese.',
      mesi: 'Mi servirebbe nei prossimi mesi.',
      valuto: 'Per ora sto solo valutando.'
    };

    function componi() {
      var sel = $('input[name="lavoro"]:checked', box);
      var tipo = LAVORI[sel ? sel.value : 'armadio'] || LAVORI.armadio;
      misure.placeholder = tipo.esempio;
      var righe = ['Buongiorno, vorrei un preventivo per ' + tipo.frase + '.'];
      var mis = pulisci(misure.value);
      var dove = pulisci(luogo.value);
      if (mis) righe.push('Misure indicative: ' + mis);
      if (dove) righe.push('Luogo: ' + dove);
      if (quando.value && TEMPI[quando.value]) righe.push(TEMPI[quando.value]);
      if (foto && foto.checked) righe.push('Ho anche foto o disegni: ve li mando qui in chat.');
      if (righe.length > 1) righe.push('Grazie!');
      var testo = righe.join('\n');
      preview.textContent = testo;
      link.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(testo);
    }

    box.addEventListener('input', componi);
    box.addEventListener('change', componi);
    componi();
  }

  /* ---------- menu del telefono ---------- */
  function initMenu() {
    var dlg = $('#menu');
    var apri = $('[data-menu-open]');
    if (!dlg || !apri) return;
    if (typeof dlg.showModal !== 'function') {
      apri.addEventListener('click', function () { location.hash = '#orari'; });
      return;
    }
    apri.addEventListener('click', function () {
      dlg.showModal();
      apri.setAttribute('aria-expanded', 'true');
    });
    dlg.addEventListener('close', function () { apri.setAttribute('aria-expanded', 'false'); });
    $('[data-menu-close]', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    $$('a[href^="#"]', dlg).forEach(function (a) {
      a.addEventListener('click', function () { dlg.close(); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960 && dlg.open) dlg.close();
    });
  }

  /* ---------- intestazione al primo scorrimento ---------- */
  function initHeader() {
    var header = $('[data-header]');
    if (!header) return;
    var ticking = false;
    function check() {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
    }, { passive: true });
    check();
  }

  /* ---------- comparsa dei blocchi ---------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  function init() {
    var now = aggiornaStato();
    var anno = $('[data-year]'); if (anno) anno.textContent = String(now.y);
    initBuilder();
    initMenu();
    initHeader();
    initReveal();
    window.setInterval(aggiornaStato, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) aggiornaStato();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
