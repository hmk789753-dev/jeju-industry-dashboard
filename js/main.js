// 시작: 전체 갱신, 메뉴 스크롤, 위쪽 검색창, 필터를 주소에 저장, 업종 접기, 첫 화면 그리기
// 이 파일을 가장 마지막에 읽어야 합니다(앞 파일의 함수를 모두 씀).
'use strict';

// ---------- 전체 갱신 ----------
function update() {
  // '2026년 제외'를 켜면 기간 끝을 2025.12로 맞춤
  if (st.no26) { if (st.end > LAST25) st.end = LAST25; if (st.start > LAST25) st.start = Math.max(0, LAST25 - 11); }
  // 업종이 하나도 선택되지 않으면 본문 대신 안내를 보여 줌
  var none = !selGroups().length;
  document.querySelector('.content').classList.toggle('no-sel', none); $('noSel').hidden = !none;
  if (none) { syncControls(); stateToUrl(); return; }
  compute(); syncControls();
  renderKpis(); renderShare(); renderGrowth(); renderSeason(); renderMap(); renderSearch(); renderPlaces(); renderPlaceTrend(); renderPlaceMap(); renderSummary(); renderOverview();
  stateToUrl();
}
function rerenderTheme() { readTheme(); update(); renderMapTable(); }

// ---------- 한 페이지 스크롤 + 메뉴 자동 강조 ----------
var PAGES = [
  { id: 'overview', name: '한눈에 보기' }, { id: 'change', name: '업종 변화' }, { id: 'season', name: '계절·지역' },
  { id: 'search', name: '검색·인기 장소' }, { id: 'summary', name: '분석 요약' }, { id: 'about', name: '지표 설명' }
];
function setActive(id) {
  document.querySelectorAll('.nav-links a').forEach(function (a) { var on = a.getAttribute('href') === '#' + id; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
}
function goSection(id) { var el = $(id); if (el) el.scrollIntoView({ block: 'start' }); setActive(id); }
// 스크롤 위치에 따라 지금 보이는 섹션의 메뉴를 켬
function spy() {
  var line = 140, cur = 'overview';
  PAGES.forEach(function (p) { var r = $(p.id).getBoundingClientRect(); if (r.top - line <= 0) cur = p.id; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = PAGES[PAGES.length - 1].id;
  setActive(cur);
}
var spyTick = false;
window.addEventListener('scroll', function () { if (!spyTick) { spyTick = true; requestAnimationFrame(function () { spyTick = false; spy(); }); } }, { passive: true });

// ---------- 위쪽 검색창: 읍면동·시·업종 → 필터, 장소 → TOP10 위치, 섹션 이름 → 이동 ----------
function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600); }
function initSearch() {
  var opts = [];
  PAGES.forEach(function (p) { opts.push(p.name); });
  ['제주시', '서귀포시'].forEach(function (s) { opts.push(s); });
  D.dongs.name.forEach(function (n) { opts.push(n); });
  TOUR.concat([TRANS]).forEach(function (g) { opts.push(D.groups[g]); });
  $('tbList').innerHTML = opts.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('');
  $('tbSearch').onsubmit = function (e) { e.preventDefault(); runSearch($('tbInput').value.trim()); };
  $('tbInput').addEventListener('change', function () { if (opts.indexOf(this.value.trim()) >= 0) runSearch(this.value.trim()); });
}
function runSearch(q) {
  if (!q) return;
  var pg = PAGES.filter(function (p) { return p.name === q; })[0];
  if (pg) { goSection(pg.id); toast(josaRo('「' + pg.name + '」').replace(/」(으로|로)$/, '」$1') + ' 이동했습니다'); return; }
  if (q === '제주시' || q === '서귀포시') { st.region = 'sgg:' + q; update(); toast('지역 필터: ' + q); return; }
  var d = D.dongs.name.indexOf(q);
  if (d >= 0) { st.region = 'dong:' + d; update(); toast('지역 필터: ' + D.dongs.sgg[d] + ' ' + q); return; }
  var g = D.groups.indexOf(q);
  if (g >= 0 && g !== NONT) { if (g === TRANS) st.transport = true; st.groups = [g]; update(); toast('업종 필터: ' + q); return; }
  var hits = []; for (var p = 0; p < NP; p++) if (P.name[p].indexOf(q) >= 0) hits.push(p);
  if (hits.length) {
    hits.sort(function (a, b) { return (P.name[a] === q ? -1 : 0) - (P.name[b] === q ? -1 : 0); });
    var h = hits[0]; st.region = 'dong:' + P.dong[h]; if (selGroups().indexOf(P.group[h]) < 0) st.groups = [P.group[h]];
    update(); goSection('search'); $('p10').scrollIntoView({ block: 'start' });
    toast('「' + P.name[h] + '」(' + D.dongs.name[P.dong[h]] + ') 지역으로 필터를 맞췄습니다' + (hits.length > 1 ? ' · 비슷한 이름 ' + (hits.length - 1) + '곳 더' : ''));
    return;
  }
  toast('「' + q + '」을(를) 찾지 못했습니다. 읍면동·업종·장소 이름으로 검색해 보세요.');
}


// ---------- 필터를 주소에 저장 (새로고침해도 유지, 링크로 공유) ----------
// 예: index.html?from=202501&to=202512&region=dong:1&groups=1,2#season
var KEEP_PARAMS = ['selftest', 'calopen', 'summarypreview'];   // 점검용 매개변수는 그대로 둠
function stateToUrl() {
  var q = new URLSearchParams();
  new URLSearchParams(location.search).forEach(function (v, k) { if (KEEP_PARAMS.indexOf(k) >= 0) q.set(k, v); });
  if (st.start !== DEF.start || st.end !== DEF.end) { q.set('from', D.months[st.start]); q.set('to', D.months[st.end]); }
  if (st.region !== 'all') q.set('region', st.region);
  var sel = selGroups();
  if (!sel.length) q.set('groups', 'none'); else if (!isAllSel()) q.set('groups', sel.join(','));
  if (st.metric !== DEF.metric) q.set('metric', st.metric);
  if (st.transport) q.set('transport', '1');
  if (st.no26) q.set('no26', '1');
  if (st.growthMode !== DEF.growthMode) q.set('growth', st.growthMode);
  if (st.mapMode !== DEF.mapMode) q.set('map', st.mapMode);
  if (st.seasonView !== DEF.seasonView) q.set('season', st.seasonView);
  if (st.searchTab !== DEF.searchTab) q.set('tab', st.searchTab);
  if (st.ptN !== DEF.ptN) q.set('pts', st.ptN);
  if (st.ptColor !== DEF.ptColor) q.set('ptc', st.ptColor);
  if (st.trendHideSus) q.set('nosus', '1');
  var qs = q.toString(), url = location.pathname + (qs ? '?' + qs : '') + location.hash;
  if (url !== location.pathname + location.search + location.hash) { try { history.replaceState(null, '', url); } catch (e) { } }
}
function urlToState() {
  var q = new URLSearchParams(location.search), mi = function (ym) { return D.months.indexOf(+ym); };
  if (q.has('from') && q.has('to') && mi(q.get('from')) >= 0 && mi(q.get('to')) >= 0) { st.start = Math.min(mi(q.get('from')), mi(q.get('to'))); st.end = Math.max(mi(q.get('from')), mi(q.get('to'))); }
  var rg = q.get('region');
  if (rg && (rg === 'sgg:제주시' || rg === 'sgg:서귀포시' || (/^dong:\d+$/.test(rg) && +rg.slice(5) < ND))) st.region = rg;
  if (q.get('transport') === '1') st.transport = true;
  if (q.get('no26') === '1') st.no26 = true;
  var gs = q.get('groups');
  if (gs === 'none') st.groups = [];
  else if (gs) { var arr = gs.split(',').map(Number).filter(function (g) { return g >= 0 && g <= (st.transport ? TRANS : 6); }); if (arr.length) st.groups = arr; }
  else if (st.transport) st.groups = baseGroups();
  if (['tour', 'res', 'arr'].indexOf(q.get('metric')) >= 0) st.metric = q.get('metric');
  if (['yoy', 'share'].indexOf(q.get('growth')) >= 0) st.growthMode = q.get('growth');
  if (['value', 'lq'].indexOf(q.get('map')) >= 0) st.mapMode = q.get('map');
  if (['overlay', 'small'].indexOf(q.get('season')) >= 0) st.seasonView = q.get('season');
  if (['50', '100', '200'].indexOf(q.get('pts')) >= 0) st.ptN = +q.get('pts');
  if (['group', 'trend'].indexOf(q.get('ptc')) >= 0) st.ptColor = q.get('ptc');
  if (q.get('nosus') === '1') st.trendHideSus = true;
  var tb = +q.get('tab'); if (q.has('tab') && tb >= 0 && tb < S.cats.length) st.searchTab = tb;
}
function copyLink() {
  stateToUrl();
  var url = location.href.replace(/([?&])(selftest|calopen)=1&?/g, '$1').replace(/[?&]$/, '').replace('?#', '#');
  var done = function () { toast('현재 필터가 담긴 링크를 복사했습니다'); };
  var fallback = function () { var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); if (ok) done(); else window.prompt('아래 주소를 복사하세요', url); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
}

// ---------- 사이드바: 업종 칩 접기 (보는 사람 브라우저에만 기억) ----------
var FOLD_KEY = 'ind.foldGroups';
function setFold(folded, save) {
  $('fGroups').hidden = folded; $('fGroupsSum').hidden = !folded;
  $('fGroupsFold').textContent = folded ? '펼치기' : '접기'; $('fGroupsFold').setAttribute('aria-expanded', folded ? 'false' : 'true');
  if (save) { try { localStorage.setItem(FOLD_KEY, folded ? '1' : '0'); } catch (e) { } }
}
function initFold() {
  var saved = null; try { saved = localStorage.getItem(FOLD_KEY); } catch (e) { }
  setFold(saved == null ? window.innerHeight < 820 : saved === '1', false);   // 저장된 값이 없으면 낮은 화면에서 접어서 시작
  $('fGroupsFold').onclick = function () { setFold(!$('fGroups').hidden, true); };
  $('fGroupsSum').onclick = function () { setFold(false, true); };
  $('fCopy').onclick = copyLink;
}

readTheme(); initControls(); initSearch(); initReport(); initFold(); urlToState(); renderStatic(); update(); spy();
// 로고: 페이지 맨 위로 올라가 헤더 카드 전체가 보이게 (고정 바에 가리지 않도록 #top 앵커 대신 0으로 스크롤)
function goTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
  setActive('overview');
}
document.querySelector('.logo').addEventListener('click', function (e) { e.preventDefault(); goTop(); });
// 휴대폰 화면: 필터 목록을 접어 두고 버튼으로 펼침 (현재 선택 요약은 항상 보임)
$('fToggle').addEventListener('click', function () {
  var box = document.querySelector('.filters'), open = !box.classList.contains('open');
  box.classList.toggle('open', open);
  this.setAttribute('aria-expanded', open ? 'true' : 'false');
  this.textContent = open ? '필터 접기 ▴' : '필터 펼치기 ▾';
});
if (location.hash === '#top') setTimeout(goTop, 0);
else if (location.hash && $(location.hash.slice(1))) setTimeout(function () { goSection(location.hash.slice(1)); }, 0);
var lastW = window.innerWidth, wasNarrow = narrow();
window.addEventListener('resize', function () {
  for (var k in charts) charts[k].resize();
  if (narrow() !== wasNarrow) { wasNarrow = narrow(); lastW = window.innerWidth; update(); return; } // 휴대폰 ↔ 넓은 화면: 차트 설정 다시 계산
  if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; renderSeason(); } // 작은 차트 배치(열 수) 다시 계산
});
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerenderTheme); } catch (e) { }

// 화면 캡처용: ?summarypreview=1 이면 1페이지 요약(2025년)을 화면에 띄움
if (/[?&]summarypreview=1/.test(INIT_QS)) window.addEventListener('load', function () { var h = makeReport(D.months.indexOf(202501), D.months.indexOf(202512), 'summary'); document.open(); document.write(h); document.close(); });
// 화면 캡처용: ?calopen=1 이면 달력을 연 채로 시작
if (/[?&]calopen=1/.test(INIT_QS)) { openCal(); cal.a = D.months.indexOf(202503); cal.hover = D.months.indexOf(202508); renderCal(); }

// 점검용 연결점: selftest.js 와 개발 중 콘솔에서 상태를 바꿔 볼 때 씀
window.IND_API = { st: function () { return st; }, set: function (o) { st = Object.assign(JSON.parse(JSON.stringify(DEF)), o); update(); return OUT; }, out: function () { return OUT; }, focusDong: focusDong, focusGroup: focusGroup };
// ?selftest=1 이면 자동 점검 파일을 불러옴
if (/[?&]selftest=1/.test(INIT_QS)) { var stScript = document.createElement('script'); stScript.src = 'js/selftest.js'; document.body.appendChild(stScript); }
