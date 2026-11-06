// 사이드바 필터: 기간 달력, 빠른 선택, 지역·지표·업종 칩, 차트 클릭으로 필터 바꾸기
'use strict';

// ---------- ① 헤더 · ② 필터 ----------
function initControls() {
  $('metaPeriod').textContent = '인기 장소 ' + ymL(D.months[0]) + '~' + ymL(D.months[M - 1]) + ' · 검색어 ' + ymL(S.months[0]) + '~' + ymL(S.months[S.months.length - 1]);
  $('navPeriod').textContent = ymL(D.months[0]) + ' ~ ' + ymL(D.months[M - 1]);
  $('heroPeriod').textContent = ymL(D.months[0]) + ' ~ ' + ymL(D.months[M - 1]);
  $('heroBuilt').textContent = D.generatedAt;
  initCalendar();
  var reg = '<option value="all">제주 전체</option><option value="sgg:제주시">제주시 전체</option><option value="sgg:서귀포시">서귀포시 전체</option>';
  ['제주시', '서귀포시'].forEach(function (sg) {
    reg += '<optgroup label="' + sg + '">';
    D.dongs.name.map(function (n, d) { return { n: n, d: d }; }).filter(function (x) { return D.dongs.sgg[x.d] === sg; })
      .sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); })
      .forEach(function (x) { reg += '<option value="dong:' + x.d + '">' + x.n + '</option>'; });
    reg += '</optgroup>';
  });
  $('fRegion').innerHTML = reg;
  var chips = '<button type="button" data-g="all">전체</button>';
  for (var g = 0; g <= TRANS; g++) chips += '<button type="button" data-g="' + g + '"><span class="sw" style="--c:var(--s' + (g + 1) + ')"></span>' + D.groups[g] + '</button>';
  $('fGroups').innerHTML = chips;
  $('searchTab').innerHTML = S.cats.map(function (c, i) { return '<button type="button" data-v="' + i + '">' + c + '</button>'; }).join('');

  $('fQuick').onclick = function (ev) { var q = ev.target.getAttribute('data-q'); if (!q) return; var r = quickRange(q); st.start = r[0]; st.end = r[1]; update(); };
  $('fRegion').onchange = function () { st.region = this.value; update(); };
  $('fMetric').onchange = function () { st.metric = this.value; update(); };
  $('fNo26').onchange = function () {
    st.no26 = this.checked;
    if (!st.no26 && st.end === LAST25 && st.start === 0) st.end = M - 1; // 전체 기간이었으면 다시 2026년까지
    update();
  };
  $('fTransport').onchange = function () {
    st.transport = this.checked;
    if (st.transport) { if (st.groups.length === TOUR.length && st.groups.indexOf(TRANS) < 0) st.groups.push(TRANS); }
    else { st.groups = st.groups.filter(function (g) { return g !== TRANS; }); if (!st.groups.length) st.groups = TOUR.slice(); }
    update();
  };
  $('fGroups').onclick = function (ev) {
    var b = ev.target.closest('button'); if (!b || b.disabled) return;
    var v = b.getAttribute('data-g');
    // '전체': 모두 선택된 상태에서 다시 누르면 모두 해제
    if (v === 'all') st.groups = isAllSel() ? [] : baseGroups(); else toggleGroup(+v);
    update();
  };
  $('fReset').onclick = function () { st = JSON.parse(JSON.stringify(DEF)); update(); };
  $('fState').onclick = function (ev) {
    var x = ev.target.getAttribute('data-clear'); if (!x) return;
    if (x === 'region') st.region = 'all'; if (x === 'groups') st.groups = baseGroups(); if (x === 'period') { st.start = 0; st.end = M - 1; }
    update();
  };
  $('growthMode').onclick = function (ev) { var v = ev.target.getAttribute('data-v'); if (v) { st.growthMode = v; update(); } };
  $('ptColor').onclick = function (ev) { var v = ev.target.getAttribute('data-v'); if (v) { st.ptColor = v; syncControls(); renderPlaceMap(); stateToUrl(); } };
  $('trendHideSus').onchange = function () { st.trendHideSus = this.checked; renderPlaceTrend(); stateToUrl(); };
  $('trendToMap').onclick = function () { st.ptColor = 'trend'; syncControls(); renderPlaceMap(); stateToUrl(); goSection('p7b'); };   // 인기 장소 지도는 '계절·지역' 페이지에 있음
  $('ptN').onclick = function (ev) { var v = ev.target.getAttribute('data-v'); if (v) { st.ptN = +v; syncControls(); renderPlaceMap(); stateToUrl(); } };
  $('seasonView').onclick = function (ev) { var v = ev.target.getAttribute('data-v'); if (v) { st.seasonView = v; syncControls(); renderSeason(); } };
  $('mapMode').onclick = function (ev) { var v = ev.target.getAttribute('data-v'); if (v) { st.mapMode = v; update(); } };
  $('searchTab').onclick = function (ev) { var v = ev.target.getAttribute('data-v'); if (v != null) { st.searchTab = +v; update(); } };
  document.querySelectorAll('.tbl-btn[data-tbl]').forEach(function (b) {
    b.onclick = function () { var t = $(b.getAttribute('data-tbl')); t.hidden = !t.hidden; b.textContent = t.hidden ? '표 보기' : '표 닫기'; };
  });
  $('mapSearch').oninput = renderMapTable;
}
// ---------- 기간 달력 (월 단위 범위 선택) ----------
// 시작 월 → 끝 월을 차례로 누르면 적용. 데이터가 없는 달은 누를 수 없음.
var CAL_YEARS = []; D.months.forEach(function (ym) { var y = Math.floor(ym / 100); if (CAL_YEARS.indexOf(y) < 0) CAL_YEARS.push(y); });
var cal = { open: false, y: 0, a: null, hover: null };
function calIdx(y, m) { return D.months.indexOf(y * 100 + m); }
// 사이드 패널 안(넓은 화면)이나 좁은 화면에서는 한 해씩, 패널이 위로 펼쳐지는 중간 폭에서는 두 해
function calShow() { var w = window.innerWidth; return (w > 1000 || w < 640) ? 1 : Math.min(2, CAL_YEARS.length); }
function initCalendar() {
  var btn = $('fPeriodBtn'), box = $('fCal');
  btn.onclick = function (e) { e.stopPropagation(); cal.open ? closeCal() : openCal(); };
  box.onclick = function (e) {
    e.stopPropagation();
    var t = e.target.closest('button'); if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');
    if (act === 'prev') { cal.y = Math.max(0, cal.y - 1); renderCal(); return; }
    if (act === 'next') { cal.y = Math.min(CAL_YEARS.length - calShow(), cal.y + 1); renderCal(); return; }
    if (act === 'cancel') { closeCal(); return; }
    if (act === 'all') { st.start = 0; st.end = st.no26 ? LAST25 : M - 1; closeCal(); update(); return; }
    var i = t.getAttribute('data-i'); if (i == null) return; i = +i;
    if (cal.a == null) { cal.a = i; cal.hover = i; renderCal(); return; }
    st.start = Math.min(cal.a, i); st.end = Math.max(cal.a, i); closeCal(); update();
  };
  box.onmouseover = function (e) {
    var t = e.target.closest('button[data-i]'); if (!t || cal.a == null) return;
    var i = +t.getAttribute('data-i'); if (i !== cal.hover) { cal.hover = i; renderCal(); }
  };
  document.addEventListener('click', function () { if (cal.open) closeCal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cal.open) { closeCal(); btn.focus(); } });
}
function openCal() {
  cal.open = true; cal.a = null; cal.hover = null;
  var ey = CAL_YEARS.indexOf(Math.floor(D.months[st.end] / 100));
  cal.y = Math.max(0, Math.min(CAL_YEARS.length - calShow(), ey - calShow() + 1));
  $('fCal').hidden = false; $('fPeriodBtn').setAttribute('aria-expanded', 'true'); renderCal();
}
function closeCal() { cal.open = false; cal.a = null; $('fCal').hidden = true; $('fPeriodBtn').setAttribute('aria-expanded', 'false'); }
function renderCal() {
  var n = calShow(), lo, hi;
  if (cal.a != null) { lo = Math.min(cal.a, cal.hover); hi = Math.max(cal.a, cal.hover); } else { lo = st.start; hi = st.end; }
  var h = '<div class="cal-head"><button type="button" class="cal-nav" data-act="prev" aria-label="이전 연도"' + (cal.y <= 0 ? ' disabled' : '') + '>‹</button>'
    + '<span class="cal-guide">' + (cal.a == null ? '시작 월을 고르세요' : ymL(D.months[cal.a]) + ' 부터 · 끝 월을 고르세요') + '</span>'
    + '<button type="button" class="cal-nav" data-act="next" aria-label="다음 연도"' + (cal.y >= CAL_YEARS.length - n ? ' disabled' : '') + '>›</button></div><div class="cal-years">';
  for (var k = 0; k < n; k++) {
    var y = CAL_YEARS[cal.y + k]; if (y == null) break;
    h += '<div class="cal-year"><div class="cal-ytitle">' + y + '년</div><div class="cal-grid">';
    for (var m = 1; m <= 12; m++) {
      var i = calIdx(y, m), cls = 'cal-m';
      if (i < 0 || (st.no26 && i > LAST25)) { h += '<button type="button" class="cal-m dis" disabled aria-label="' + y + '년 ' + m + '월 (' + (i < 0 ? '데이터 없음' : '2026년 제외 중') + ')">' + m + '월</button>'; continue; }
      if (i >= lo && i <= hi) cls += ' in';
      if (i === lo) cls += ' start';
      if (i === hi) cls += ' end';
      if (cal.a === i) cls += ' anchor';
      h += '<button type="button" class="' + cls + '" data-i="' + i + '" aria-label="' + y + '년 ' + m + '월" aria-pressed="' + (i >= lo && i <= hi) + '">' + m + '월</button>';
    }
    h += '</div></div>';
  }
  h += '</div><div class="cal-foot"><span>' + (cal.a == null ? '현재 ' + ymL(D.months[st.start]) + ' ~ ' + ymL(D.months[st.end]) : '선택 중 ' + ymL(D.months[lo]) + ' ~ ' + ymL(D.months[hi])) + '</span>'
    + '<span class="cal-actions"><button type="button" data-act="all">전체 기간</button><button type="button" data-act="cancel">닫기</button></span></div>';
  $('fCal').innerHTML = h;
}

function quickRange(q) {
  var last = st.no26 ? LAST25 : M - 1;
  if (q === 'all') return [0, last];
  if (q === 'last12') return [Math.max(0, last - 11), last];
  var y = +q, a = -1, b = -1;
  D.months.forEach(function (ym, i) { if (Math.floor(ym / 100) === y) { if (a < 0) a = i; b = i; } });
  return [a, b];
}
function toggleGroup(g) {
  var i = st.groups.indexOf(g);
  if (i >= 0) st.groups.splice(i, 1);
  else st.groups.push(g);
}
// 차트에서 업종 클릭: 그 업종만 선택, 이미 그 업종만 선택돼 있으면 전체로
function focusGroup(g) {
  var s = selGroups();
  st.groups = (s.length === 1 && s[0] === g) ? baseGroups() : [g];
  update();
}
function focusDong(d) {
  var v = 'dong:' + d; st.region = st.region === v ? 'all' : v; update();
}
function syncControls() {
  $('fPeriodText').textContent = ymL(D.months[st.start]) + ' ~ ' + ymL(D.months[st.end]);
  if (cal.open) renderCal();
  $('fRegion').value = st.region; $('fMetric').value = st.metric; $('fTransport').checked = st.transport; $('fNo26').checked = st.no26;
  var q26 = document.querySelector('#fQuick button[data-q="2026"]'); q26.disabled = st.no26; q26.title = st.no26 ? '2026년 제외 중' : '';
  document.querySelectorAll('#fQuick button').forEach(function (b) { var r = quickRange(b.getAttribute('data-q')); b.classList.toggle('on', r[0] === st.start && r[1] === st.end); });
  var sel = selGroups();
  document.querySelectorAll('#fGroups button').forEach(function (b) {
    var v = b.getAttribute('data-g');
    if (v === 'all') { b.classList.toggle('on', isAllSel()); return; }
    var g = +v; b.disabled = g === TRANS && !st.transport; b.classList.toggle('on', sel.indexOf(g) >= 0);
    b.setAttribute('aria-pressed', sel.indexOf(g) >= 0 ? 'true' : 'false');
  });
  document.querySelectorAll('#growthMode button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st.growthMode); });
  $('trendHideSus').checked = st.trendHideSus;
  document.querySelectorAll('#ptColor button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st.ptColor); });
  document.querySelectorAll('#ptN button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === st.ptN); });
  document.querySelectorAll('#seasonView button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st.seasonView); });
  document.querySelectorAll('#mapMode button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st.mapMode); });
  document.querySelectorAll('#searchTab button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === st.searchTab); });
  var h = '현재 선택: <b>' + periodLabel() + '</b>' + (st.start !== 0 || st.end !== M - 1 ? '<button class="x" data-clear="period" title="기간 초기화">✕</button>' : '');
  h += ' · <b>' + esc(regionLabel()) + '</b>' + (st.region !== 'all' ? '<button class="x" data-clear="region" title="지역 초기화">✕</button>' : '');
  h += ' · <b>' + esc(groupsLabel()) + '</b>' + (!isAllSel() ? '<button class="x" data-clear="groups" title="업종 초기화">✕</button>' : '');
  h += ' · 지표 <b>' + MET[st.metric] + '</b>';
  $('fState').innerHTML = h;
  var sum = $('fGroupsSum'); if (sum) sum.textContent = groupsLabel() + ' · 눌러서 펼치기';
}
