(function () {
  'use strict';

  var CKEY = 'bowlRecap.current.v1';
  var MKEY = 'bowlRecap.matches.v1';

  var $ = function (s) { return document.querySelector(s); };
  var num = function (v) { return (v === '' || v == null || isNaN(+v)) ? null : +v; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var read = function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  var pts = function (v) { return v % 1 ? v.toFixed(1) : String(v); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var fmtDate = function (k) {
    var d = new Date(k + 'T00:00:00');
    return isNaN(d) ? (k || '') : d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  var list = [];

  /* ---------- Data ---------- */
  function valid(d) {
    return d && Array.isArray(d.my) && Array.isArray(d.opp) && d.my.length === 4 && d.opp.length === 4;
  }

  function sources() {
    var out = [];
    var cur = read(CKEY);
    if (valid(cur)) out.push({ label: 'Current match – ' + fmtDate(cur.date), data: cur });
    var m = read(MKEY) || {};
    Object.keys(m).sort().reverse().forEach(function (k) {
      if (!valid(m[k])) return;
      var d = JSON.parse(JSON.stringify(m[k]));
      d.date = k;
      out.push({ label: fmtDate(k) + (d.oppTeam ? ' – vs ' + d.oppTeam : ''), data: d });
    });
    return out;
  }

  /* ---------- Calculations ---------- */
  function duel(x, y, p) {
    if (x == null || y == null) return { a: 0, b: 0, w: '' };
    if (x > y) return { a: p, b: 0, w: 'a' };
    if (y > x) return { a: 0, b: p, w: 'b' };
    return { a: p / 2, b: p / 2, w: 't' };
  }

  function prep(b) {
    var h = num(b.hdcp) || 0;
    var s = (b.g || []).map(num);
    while (s.length < 3) s.push(null);
    var full = s.every(function (v) { return v != null; });
    var ss = full ? s[0] + s[1] + s[2] : null;
    return {
      name: b.name, avg: b.avg, absent: !!b.absent, h: h, s: s,
      hg: s.map(function (v) { return v == null ? null : v + h; }),
      ss: ss, h3: 3 * h, hs: full ? ss + 3 * h : null
    };
  }

  function totals(rows) {
    var h = sum(rows.map(function (r) { return r.h; }));
    var sc = [0, 1, 2].map(function (c) {
      return rows.every(function (r) { return r.s[c] != null; })
        ? sum(rows.map(function (r) { return r.s[c]; })) : null;
    });
    var full = sc.every(function (v) { return v != null; });
    var scS = full ? sc[0] + sc[1] + sc[2] : null;
    return {
      sc: sc.concat([scS]),
      hd: [h, h, h, 3 * h],
      tot: sc.map(function (v) { return v == null ? null : v + h; }).concat([full ? scS + 3 * h : null])
    };
  }

  /* ---------- Rendering ---------- */
  function n(v, circ) {
    if (v == null || v === '') return '';
    return circ ? '<span class="circ">' + v + '</span>' : String(v);
  }

  function bowlerRows(r, w, i) {
    var name = esc((r.name || '').trim() || ('Bowler ' + (i + 1)));
    var avg = (r.avg === '' || r.avg == null) ? '' : esc(r.avg);
    var line1 = [0, 1, 2].map(function (c) { return '<td>' + n(r.s[c], w[c]) + '</td>'; }).join('');
    var line2 = [0, 1, 2].map(function (c) { return '<td class="sub">' + n(r.hg[c]) + '</td>'; }).join('');
    return '<tr class="l1">' +
        '<td rowspan="2">' + avg + '</td>' +
        '<td rowspan="2" class="nm">' + name + (r.absent ? '<small>absent</small>' : '') + '</td>' +
        '<td rowspan="2">' + r.h + '</td>' +
        line1 + '<td></td><td class="tot">' + n(r.ss) + '</td>' +
      '</tr>' +
      '<tr class="l2">' +
        line2 + '<td class="h3">' + (r.ss == null ? '' : '+' + r.h3) + '</td>' +
        '<td class="tot">' + n(r.hs, w[3]) + '</td>' +
      '</tr>';
  }

  function sheet(name, tag, rows, tot, w, tw, cp, won, lost) {
    var cells = function (arr, flags) {
      return [0, 1, 2].map(function (c) { return '<td>' + n(arr[c], flags && flags[c]) + '</td>'; }).join('');
    };
    var body = rows.map(function (r, i) { return bowlerRows(r, w[i], i); }).join('') +
      '<tr class="trow"><td colspan="3" class="lbl">Total</td>' + cells(tot.sc) + '<td></td><td>' + n(tot.sc[3]) + '</td></tr>' +
      '<tr class="trow"><td colspan="3" class="lbl">Handicap</td>' + cells(tot.hd) + '<td></td><td>' + n(tot.hd[3]) + '</td></tr>' +
      '<tr class="trow strong"><td colspan="3" class="lbl">HDCP Total</td>' + cells(tot.tot, tw) + '<td></td><td>' + n(tot.tot[3], tw[3]) + '</td></tr>' +
      '<tr class="trow"><td colspan="3" class="lbl">Points</td>' +
        [0, 1, 2].map(function (c) { return '<td><span class="box">' + pts(cp[c]) + '</span></td>'; }).join('') +
        '<td></td><td><span class="box">' + pts(cp[3]) + '</span></td></tr>';

    return '<section class="sheet">' +
      '<div class="sheet-head"><b>' + esc(name) + '</b><span>' + tag + '</span></div>' +
      '<table class="score">' +
        '<colgroup><col style="width:10%"><col style="width:19%"><col style="width:10%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col style="width:11%"><col style="width:14%"></colgroup>' +
        '<thead><tr><th>Avg</th><th class="nm">Name</th><th>HDCP</th><th>1</th><th>2</th><th>3</th><th>H\'3</th><th>Total</th></tr></thead>' +
        '<tbody>' + body + '</tbody>' +
      '</table>' +
      '<div class="wl"><span>Won<b>' + pts(won) + '</b></span><span>Lost<b>' + pts(lost) + '</b></span></div>' +
      '</section>';
  }

  function render(m) {
    var A = m.my.map(prep), B = m.opp.map(prep);
    var win = { my: [], opp: [] };
    var cp = { my: [0, 0, 0, 0], opp: [0, 0, 0, 0] };
    var tw = { my: [], opp: [] };
    var i, c, r;

    for (i = 0; i < 4; i++) {
      win.my[i] = []; win.opp[i] = [];
      for (c = 0; c < 4; c++) {
        r = duel(c < 3 ? A[i].hg[c] : A[i].hs, c < 3 ? B[i].hg[c] : B[i].hs, 1);
        cp.my[c] += r.a; cp.opp[c] += r.b;
        win.my[i][c] = r.w === 'a';
        win.opp[i][c] = r.w === 'b';
      }
    }

    var tA = totals(A), tB = totals(B);
    for (c = 0; c < 4; c++) {
      r = duel(tA.tot[c], tB.tot[c], 3);
      cp.my[c] += r.a; cp.opp[c] += r.b;
      tw.my[c] = r.w === 'a';
      tw.opp[c] = r.w === 'b';
    }

    var wonMy = sum(cp.my), wonOpp = sum(cp.opp);
    var myName = (m.myTeam || '').trim() || 'My Team';
    var oppName = (m.oppTeam || '').trim() || 'Opponent';

    $('#sbMyName').textContent = myName;
    $('#sbOppName').textContent = oppName;
    $('#ptsMy').textContent = wonMy.toFixed(1);
    $('#ptsOpp').textContent = wonOpp.toFixed(1);
    $('#sbMy').classList.toggle('lead', wonMy > wonOpp);
    $('#sbOpp').classList.toggle('lead', wonOpp > wonMy);
    $('#meta').textContent = 'Date Bowled: ' + fmtDate(m.date);
    $('#legend').hidden = false;

    $('#sheets').innerHTML =
      sheet(myName, 'My Team', A, tA, win.my, tw.my, cp.my, wonMy, wonOpp) +
      sheet(oppName, 'Opponent', B, tB, win.opp, tw.opp, cp.opp, wonOpp, wonMy);
  }

  /* ---------- Init ---------- */
  function init() {
    var sel = $('#source');
    var prev = sel.selectedIndex;
    list = sources();

    if (!list.length) {
      sel.hidden = true;
      $('#meta').textContent = '';
      $('#legend').hidden = true;
      $('#sheets').innerHTML = '<p class="empty">No match data yet. Enter scores on the scoring page first.</p>';
      return;
    }

    sel.hidden = false;
    sel.innerHTML = list.map(function (s, i) { return '<option value="' + i + '">' + esc(s.label) + '</option>'; }).join('');
    sel.selectedIndex = prev > 0 && prev < list.length ? prev : 0;
    render(list[sel.selectedIndex].data);
  }

  $('#source').addEventListener('change', function () {
    render(list[this.selectedIndex].data);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) init(); });

  init();
})();
