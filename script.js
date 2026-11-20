(function () {
  'use strict';

  var KEY = 'bowlRecap.v1';
  var NAMES = ['Tracy', 'Ingrid', 'Jeff', 'Mark'];
  var GAME_LABELS = ['Game 1', 'Game 2', 'Game 3', 'Series'];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var blank = function (name) { return { name: name || '', avg: '', hdcp: '', absent: false, g: ['', '', ''] }; };
  var today = function () { return new Date().toLocaleDateString('en-CA'); };
  var num = function (v) { return (v === '' || v == null || isNaN(+v)) ? null : +v; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var el = function (team, i, field) {
    return $('[data-team="' + team + '"][data-i="' + i + '"][data-field="' + field + '"]');
  };

  var state = {
    date: today(),
    myTeam: '',
    oppTeam: '',
    my: NAMES.map(blank),
    opp: [0, 1, 2, 3].map(function () { return blank(); })
  };

  /* ---------- Persistence ---------- */
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (!s) return;
      state.myTeam = s.myTeam || '';
      if (Array.isArray(s.roster) && s.roster.length === 4) {
        state.my = s.roster.map(function (r) {
          var b = blank(r.name);
          b.avg = r.avg == null ? '' : r.avg;
          b.hdcp = r.hdcp == null ? '' : r.hdcp;
          return b;
        });
      }
    } catch (e) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        myTeam: state.myTeam,
        roster: state.my.map(function (b) { return { name: b.name, avg: b.avg, hdcp: b.hdcp }; })
      }));
    } catch (e) { /* ignore */ }
  }

  /* ---------- Rendering ---------- */
  function renderRosters() {
    $('#myRoster').innerHTML = state.my.map(function (b, i) {
      return '<div class="r-row">' +
        '<span class="pos">' + (i + 1) + '</span>' +
        '<input type="text" aria-label="My bowler ' + (i + 1) + ' name" placeholder="Name" data-team="my" data-i="' + i + '" data-field="name" value="' + esc(b.name) + '">' +
        '<button type="button" class="icon-btn" aria-label="Move up" data-act="up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>&#9650;</button>' +
        '<button type="button" class="icon-btn" aria-label="Move down" data-act="down" data-i="' + i + '"' + (i === 3 ? ' disabled' : '') + '>&#9660;</button>' +
        '</div>';
    }).join('');

    $('#oppRoster').innerHTML = state.opp.map(function (b, i) {
      return '<div class="r-row opp-row">' +
        '<span class="pos">' + (i + 1) + '</span>' +
        '<input type="text" aria-label="Opponent bowler ' + (i + 1) + ' name" placeholder="Opponent ' + (i + 1) + '" data-team="opp" data-i="' + i + '" data-field="name" value="' + esc(b.name) + '">' +
        '</div>';
    }).join('');
  }

  function bowlerBlock(team, i) {
    var b = state[team][i];
    var attrs = 'data-team="' + team + '" data-i="' + i + '"';
    var games = [0, 1, 2].map(function (k) {
      return '<label class="f">Game ' + (k + 1) +
        '<input type="number" inputmode="numeric" pattern="[0-9]*" ' + attrs + ' data-field="g' + k + '" value="' + esc(b.g[k]) + '"></label>';
    }).join('');
    var cell = function (key, label) {
      return '<div class="cell" data-cell="' + team + '-' + i + '-' + key + '"><span>' + label + '</span><b>–</b></div>';
    };
    return '<div class="bowler ' + team + '">' +
      '<div class="b-name"><span class="nm" data-name="' + team + '-' + i + '"></span><span class="hd-diff" data-diff="' + team + '-' + i + '"></span></div>' +
      '<div class="fields">' +
        '<label class="f">AVG<input type="number" inputmode="numeric" pattern="[0-9]*" ' + attrs + ' data-field="avg" value="' + esc(b.avg) + '"></label>' +
        '<label class="f">HDCP<input type="number" inputmode="numeric" pattern="[0-9]*" ' + attrs + ' data-field="hdcp" value="' + esc(b.hdcp) + '"></label>' +
        '<label class="abs"><input type="checkbox" ' + attrs + ' data-field="absent"' + (b.absent ? ' checked' : '') + '> Absent</label>' +
      '</div>' +
      '<div class="games">' + games + '</div>' +
      '<div class="res res-games">' + cell('g0', 'G1 + HDCP') + cell('g1', 'G2 + HDCP') + cell('g2', 'G3 + HDCP') + '</div>' +
      '<div class="res res-series">' + cell('ss', 'Scratch Series') + cell('hs', 'HDCP Series') + '</div>' +
      '</div>';
  }

  function renderMatchups() {
    $('#matchups').innerHTML = [0, 1, 2, 3].map(function (i) {
      return '<section class="card">' +
        '<div class="card-head"><h2>Matchup ' + (i + 1) + '</h2><span class="chip" data-mp="' + i + '">0.0 – 0.0</span></div>' +
        '<div class="versus">' + bowlerBlock('my', i) + '<div class="vs">VS</div>' + bowlerBlock('opp', i) + '</div>' +
        '</section>';
    }).join('');
  }

  function renderTotals() {
    var html = '<div></div><div class="tt-h" data-team-name="my">My Team</div><div class="tt-h" data-team-name="opp">Opponent</div>';
    ['g0', 'g1', 'g2', 'ts'].forEach(function (key, k) {
      html += '<div class="tt-l">' + GAME_LABELS[k] + '</div>';
      ['my', 'opp'].forEach(function (t) {
        html += '<div class="cell" data-cell="t-' + t + '-' + key + '"><b>–</b><small data-p></small></div>';
      });
    });
    $('#totalsGrid').innerHTML = html;
  }

  function renderAll() {
    renderRosters();
    renderMatchups();
    renderTotals();
    syncInputs();
    calc();
  }

  /* ---------- Handicap from average ---------- */
  function calcHdcp(avg) {
    var a = num(avg);
    return a == null ? '' : String(Math.max(0, Math.floor((230 - a) * 0.8)));
  }

  /* ---------- Absent handling ---------- */
  function applyAbsent(b) {
    if (!b.absent) return;
    var a = num(b.avg);
    var v = a == null ? '' : String(a - 10);
    b.g = [v, v, v];
  }

  function syncInputs() {
    ['my', 'opp'].forEach(function (team) {
      state[team].forEach(function (b, i) {
        for (var k = 0; k < 3; k++) {
          var inp = el(team, i, 'g' + k);
          if (!inp) continue;
          if (b.absent) inp.value = b.g[k];
          inp.disabled = b.absent;
          inp.closest('label').classList.toggle('locked', b.absent);
        }
      });
    });
  }

  /* ---------- Calculations ---------- */
  function duel(x, y, pts) {
    if (x == null || y == null) return { a: 0, b: 0, w: '', ok: false };
    if (x > y) return { a: pts, b: 0, w: 'a', ok: true };
    if (y > x) return { a: 0, b: pts, w: 'b', ok: true };
    return { a: pts / 2, b: pts / 2, w: 't', ok: true };
  }

  function bowlerCalc(b) {
    var h = num(b.hdcp) || 0;
    var s = b.g.map(num);
    var hg = s.map(function (v) { return v == null ? null : v + h; });
    var full = s.every(function (v) { return v != null; });
    var ss = full ? s[0] + s[1] + s[2] : null;
    return { hg: hg, ss: ss, hs: full ? ss + 3 * h : null };
  }

  function fmtDiff(v) {
    return v > 0 ? '+' + v : v < 0 ? '\u2212' + Math.abs(v) : '0';
  }

  function setCell(id, val, mark) {
    var c = $('[data-cell="' + id + '"]');
    if (!c) return;
    $('b', c).textContent = val == null ? '–' : val;
    c.classList.toggle('win', mark === true);
    c.classList.toggle('tie', mark === 't');
  }

  function markFor(r, side) { return r.w === 't' ? 't' : r.w === side; }

  function calc() {
    var myPts = 0, oppPts = 0;
    var tot = { my: [0, 0, 0], opp: [0, 0, 0] };
    var cnt = { my: [0, 0, 0], opp: [0, 0, 0] };

    // Labels
    var myName = state.myTeam.trim() || 'My Team';
    var oppName = state.oppTeam.trim() || 'Opponent';
    $$('[data-team-name="my"]').forEach(function (n) { n.textContent = myName; });
    $$('[data-team-name="opp"]').forEach(function (n) { n.textContent = oppName; });

    for (var i = 0; i < 4; i++) {
      var a = state.my[i], b = state.opp[i];
      $('[data-name="my-' + i + '"]').textContent = a.name.trim() || ('Bowler ' + (i + 1));
      $('[data-name="opp-' + i + '"]').textContent = b.name.trim() || ('Opponent ' + (i + 1));

      var dh = Math.round(((num(a.hdcp) || 0) - (num(b.hdcp) || 0)) * 10) / 10;
      [['my', dh], ['opp', -dh]].forEach(function (p) {
        var d = $('[data-diff="' + p[0] + '-' + i + '"]');
        d.textContent = 'HDCP ' + fmtDiff(p[1]);
        d.classList.toggle('pos', p[1] > 0);
        d.classList.toggle('neg', p[1] < 0);
      });

      var A = bowlerCalc(a), B = bowlerCalc(b);
      var ia = 0, ib = 0;

      [['g0', A.hg[0], B.hg[0]], ['g1', A.hg[1], B.hg[1]], ['g2', A.hg[2], B.hg[2]], ['hs', A.hs, B.hs]].forEach(function (row) {
        var r = duel(row[1], row[2], 1);
        ia += r.a; ib += r.b;
        setCell('my-' + i + '-' + row[0], row[1], markFor(r, 'a'));
        setCell('opp-' + i + '-' + row[0], row[2], markFor(r, 'b'));
      });
      setCell('my-' + i + '-ss', A.ss, false);
      setCell('opp-' + i + '-ss', B.ss, false);

      $('[data-mp="' + i + '"]').textContent = ia.toFixed(1) + ' – ' + ib.toFixed(1);
      myPts += ia; oppPts += ib;

      for (var k = 0; k < 3; k++) {
        if (A.hg[k] != null) { tot.my[k] += A.hg[k]; cnt.my[k]++; }
        if (B.hg[k] != null) { tot.opp[k] += B.hg[k]; cnt.opp[k]++; }
      }
    }

    // Team totals
    var tg = { my: [], opp: [] };
    ['my', 'opp'].forEach(function (t) {
      for (var k = 0; k < 3; k++) tg[t][k] = cnt[t][k] === 4 ? tot[t][k] : null;
    });
    var ts = {
      my: tg.my.every(function (v) { return v != null; }) ? tg.my[0] + tg.my[1] + tg.my[2] : null,
      opp: tg.opp.every(function (v) { return v != null; }) ? tg.opp[0] + tg.opp[1] + tg.opp[2] : null
    };

    var tmy = 0, topp = 0;
    [['g0', tg.my[0], tg.opp[0]], ['g1', tg.my[1], tg.opp[1]], ['g2', tg.my[2], tg.opp[2]], ['ts', ts.my, ts.opp]].forEach(function (row) {
      var r = duel(row[1], row[2], 3);
      tmy += r.a; topp += r.b;
      setCell('t-my-' + row[0], row[1], markFor(r, 'a'));
      setCell('t-opp-' + row[0], row[2], markFor(r, 'b'));
      $('[data-cell="t-my-' + row[0] + '"] [data-p]').textContent = r.ok ? r.a.toFixed(1) + ' pts' : '';
      $('[data-cell="t-opp-' + row[0] + '"] [data-p]').textContent = r.ok ? r.b.toFixed(1) + ' pts' : '';
    });
    myPts += tmy; oppPts += topp;

    $('#teamPtsChip').textContent = tmy.toFixed(1) + ' – ' + topp.toFixed(1);
    $('#ptsMy').textContent = myPts.toFixed(1);
    $('#ptsOpp').textContent = oppPts.toFixed(1);
    $('#sbMy').classList.toggle('lead', myPts > oppPts);
    $('#sbOpp').classList.toggle('lead', oppPts > myPts);
  }

  /* ---------- Saved matches (by date) ---------- */
  var MKEY = 'bowlRecap.matches.v1';

  function getMatches() {
    try { return JSON.parse(localStorage.getItem(MKEY)) || {}; } catch (e) { return {}; }
  }

  function putMatches(m) {
    try { localStorage.setItem(MKEY, JSON.stringify(m)); return true; } catch (e) { return false; }
  }

  function norm(b) {
    var r = blank(b.name);
    r.avg = b.avg == null ? '' : b.avg;
    r.hdcp = b.hdcp == null ? '' : b.hdcp;
    r.absent = !!b.absent;
    r.g = [0, 1, 2].map(function (k) { return b.g && b.g[k] != null ? b.g[k] : ''; });
    return r;
  }

  function renderSaved(selected) {
    var m = getMatches();
    var keys = Object.keys(m).sort().reverse();
    var sel = $('#savedList');
    sel.innerHTML = keys.length ? keys.map(function (k) {
      var d = new Date(k + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      var opp = m[k].oppTeam ? ' – vs ' + m[k].oppTeam : '';
      return '<option value="' + esc(k) + '">' + esc(d + opp) + '</option>';
    }).join('') : '<option value="">No saved matches</option>';
    if (selected && m[selected]) sel.value = selected;
  }

  function saveMatch() {
    if (!state.date) { window.alert('Enter a Date Bowled first.'); return; }
    var m = getMatches();
    if (m[state.date] && !window.confirm('A match for ' + state.date + ' is already saved. Overwrite it?')) return;
    m[state.date] = JSON.parse(JSON.stringify({ myTeam: state.myTeam, oppTeam: state.oppTeam, my: state.my, opp: state.opp }));
    if (!putMatches(m)) { window.alert('Could not save on this device.'); return; }
    renderSaved(state.date);
  }

  function loadMatch() {
    var k = $('#savedList').value;
    var s = getMatches()[k];
    if (!s) return;
    state.date = k;
    state.myTeam = s.myTeam || '';
    state.oppTeam = s.oppTeam || '';
    state.my = s.my.map(norm);
    state.opp = s.opp.map(norm);
    setHeader();
    renderAll();
  }

  function deleteMatch() {
    var k = $('#savedList').value;
    var m = getMatches();
    if (!m[k] || !window.confirm('Delete the saved match for ' + k + '?')) return;
    delete m[k];
    putMatches(m);
    renderSaved();
  }

  /* ---------- Events ---------- */
  function handle(e) {
    var t = e.target, f = t.dataset && t.dataset.field;
    if (!f) return;

    if (f === 'date') { state.date = t.value; return; }
    if (f === 'myTeam') { state.myTeam = t.value; save(); }
    else if (f === 'oppTeam') { state.oppTeam = t.value; }
    else {
      var team = t.dataset.team, b = state[team][+t.dataset.i];
      if (f === 'name') b.name = t.value;
      else if (f === 'avg' || f === 'hdcp') {
        b[f] = t.value;
        if (f === 'avg') {
          b.hdcp = calcHdcp(t.value);
          el(team, +t.dataset.i, 'hdcp').value = b.hdcp;
        }
      }
      else if (f === 'absent') b.absent = t.checked;
      else if (f.charAt(0) === 'g') b.g[+f.charAt(1)] = t.value;
      if (f === 'avg' || f === 'absent') applyAbsent(b);
      if (team === 'my') save();
    }
    syncInputs();
    calc();
  }

  function move(i, d) {
    var j = i + d;
    if (j < 0 || j > 3) return;
    var tmp = state.my[i];
    state.my[i] = state.my[j];
    state.my[j] = tmp;
    save();
    renderAll();
  }

  function setHeader() {
    $('#matchDate').value = state.date;
    $('#myTeam').value = state.myTeam;
    $('#oppTeam').value = state.oppTeam;
  }

  function resetMatch() {
    if (!window.confirm('Clear opponent, scores, and absences for a new match?')) return;
    state.date = today();
    state.oppTeam = '';
    state.opp = [0, 1, 2, 3].map(function () { return blank(); });
    state.my.forEach(function (b) { b.absent = false; b.g = ['', '', '']; });
    save();
    setHeader();
    renderAll();
  }

  document.addEventListener('input', handle);
  document.addEventListener('change', handle);
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var a = t.dataset.act, i = +t.dataset.i;
    if (a === 'up') move(i, -1);
    else if (a === 'down') move(i, 1);
    else if (a === 'reset') resetMatch();
    else if (a === 'save') saveMatch();
    else if (a === 'load') loadMatch();
    else if (a === 'delete') deleteMatch();
  });

  /* ---------- Init ---------- */
  load();
  setHeader();
  renderAll();
  renderSaved(state.date);
})();
