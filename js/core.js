// 공통: 데이터 읽기, 기본 상수, 숫자 서식, 색, 필터 상태, 집계, 차트 공통 도구
// 모든 js 파일은 같은 전역 공간을 씁니다. index.html 에서 이 파일을 가장 먼저 읽어야 합니다.
'use strict';

var D = window.IND, P = window.IND_PLACES, S = window.IND_SEARCH, GEO = window.IND_GEO;
var INIT_QS = location.search;   // 처음 열린 주소의 매개변수 (필터 저장이 주소를 바꾸기 전)
if (!D || !P || !S || !GEO || !window.echarts) {
  document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px;font-size:15px">데이터 파일 또는 차트 라이브러리를 읽지 못했습니다. industry-dashboard 폴더 전체(data, lib, js 포함)가 있는지 확인해 주세요.</p>');
  throw new Error('데이터 파일 또는 차트 라이브러리 없음');
}

// ---------- 기본 상수 ----------
var M = D.months.length, NC = D.cats.name.length, ND = D.dongs.name.length, NG = D.groups.length;
var TOUR = [0, 1, 2, 3, 4, 5, 6], TRANS = 7, NONT = 8;
var MIN_BASE = 1000, MIN_PLACE = 100;
var MET = { tour: '관광객 도착 수', res: '도민 도착 수', arr: '도착건수' };
var CG = D.cats.group;
var CUBE = {
  m: Int16Array.from(D.cube.m), d: Int16Array.from(D.cube.d), c: Int16Array.from(D.cube.c),
  tour: Float64Array.from(D.cube.tour), res: Float64Array.from(D.cube.res), arr: Float64Array.from(D.cube.arr)
};
var NCELL = CUBE.m.length;
// 검색 분류 ↔ 업종 대분류
var SEARCH_LINK = { '음식점': [0, 1, 6], '관광지': [3, 4], '숙박': [2], '쇼핑': [5], '축제/행사': [] };

// 장소 후보: 장소별 시작 위치
var NP = P.name.length, pStart = new Int32Array(NP + 1);
(function () { var cnt = new Int32Array(NP); for (var i = 0; i < P.p.length; i++) cnt[P.p[i]]++; for (var j = 0; j < NP; j++) pStart[j + 1] = pStart[j] + cnt[j]; })();

// ---------- 서식 ----------
function fmtN(n) { return (n == null || !isFinite(n)) ? '-' : Math.round(n).toLocaleString('ko-KR'); }
function fmtP(x, d) { return (x == null || !isFinite(x)) ? '-' : (x * 100).toFixed(d == null ? 1 : d) + '%'; }
function fmtS(x) { return (x == null || !isFinite(x)) ? '-' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%'; }
function fmtPP(x) { if (x == null || !isFinite(x)) return '-'; var v = Math.round(x * 1000) / 10; return (v > 0 ? '+' : v < 0 ? '' : '') + (v === 0 ? '0.0' : v.toFixed(1)) + '%p'; }
function ymL(ym) { return Math.floor(ym / 100) + '.' + String(ym % 100).padStart(2, '0'); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function lastHangul(w) { for (var i = w.length - 1; i >= 0; i--) { var c = w.charCodeAt(i); if (c >= 0xAC00 && c <= 0xD7A3) return c; } return 0; }
function josa(w, a, b) { var c = lastHangul(w); return w + ((c && (c - 0xAC00) % 28 !== 0) ? a : b); }
function josaRo(w) { var c = lastHangul(w), j = c ? (c - 0xAC00) % 28 : 0; return w + (j && j !== 8 ? '으로' : '로'); } // ㄹ 받침은 '로'
function $(id) { return document.getElementById(id); }

// ---------- 색 (CSS 변수에서 읽음: 라이트/다크 모두 대응) ----------
var T = {};
function readTheme() {
  var cs = getComputedStyle(document.documentElement);
  ['--surface-1', '--surface-2', '--text-primary', '--text-secondary', '--text-muted', '--grid', '--axis', '--border', '--accent', '--accent-soft', '--up', '--down', '--neutral',
    '--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8', '--s9',
    '--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5', '--seq-6', '--seq-7', '--div-neg-2', '--div-neg-1', '--div-pos-1', '--div-pos-2'
  ].forEach(function (k) { T[k.slice(2)] = cs.getPropertyValue(k).trim(); });
}
function gColor(g) { return T['s' + (g + 1)]; }

// ---------- 상태 ----------
var DEF = { start: 0, end: M - 1, region: 'all', groups: TOUR.slice(), metric: 'tour', transport: false, mapMode: 'value', growthMode: 'share', searchTab: 0, seasonView: 'overlay', seasonHidden: [], no26: false, ptN: 100, ptColor: 'group', trendHideSus: false };
var LAST25 = D.months.indexOf(202512); // '2026년 제외'를 켰을 때 쓸 수 있는 마지막 달
var st = JSON.parse(JSON.stringify(DEF));
function baseGroups() { return st.transport ? TOUR.concat([TRANS]) : TOUR.slice(); }
function selGroups() { var b = baseGroups(); return st.groups.filter(function (g) { return b.indexOf(g) >= 0; }).sort(function (a, b) { return a - b; }); }
function isAllSel() { return selGroups().length === baseGroups().length; }
function regionMask() {
  var mk = new Uint8Array(ND);
  for (var d = 0; d < ND; d++) {
    if (st.region === 'all') mk[d] = 1;
    else if (st.region.indexOf('sgg:') === 0) mk[d] = D.dongs.sgg[d] === st.region.slice(4) ? 1 : 0;
    else mk[d] = d === +st.region.slice(5) ? 1 : 0;
  }
  return mk;
}
function regionLabel() {
  if (st.region === 'all') return '제주 전체';
  if (st.region.indexOf('sgg:') === 0) return st.region.slice(4);
  var d = +st.region.slice(5); return D.dongs.sgg[d] + ' ' + D.dongs.name[d];
}
function regionSgg() { // 검색 데이터용 시
  if (st.region === 'all') return null;
  if (st.region.indexOf('sgg:') === 0) return st.region.slice(4);
  return D.dongs.sgg[+st.region.slice(5)];
}
function periodLabel() { return ymL(D.months[st.start]) + '~' + ymL(D.months[st.end]); }
function groupsLabel() { if (!selGroups().length) return '선택된 업종 없음'; return isAllSel() ? (st.transport ? '관광 업종 전체 + 교통거점' : '관광 업종 전체') : selGroups().map(function (g) { return D.groups[g]; }).join(', '); }

// ---------- 집계 ----------
var A = null;
function compute() {
  var s = st.start, e = st.end, mk = regionMask(), mv = CUBE[st.metric];
  var cT = new Float64Array(NC * M), cR = new Float64Array(NC * M), cA = new Float64Array(NC * M);
  var dg = new Float64Array(ND * NG);
  for (var i = 0; i < NCELL; i++) {
    var d = CUBE.d[i], m = CUBE.m[i], c = CUBE.c[i];
    if (mk[d]) { var k = c * M + m; cT[k] += CUBE.tour[i]; cR[k] += CUBE.res[i]; cA[k] += CUBE.arr[i]; }
    if (m >= s && m <= e) dg[d * NG + CG[c]] += mv[i];
  }
  var cMet = st.metric === 'tour' ? cT : st.metric === 'res' ? cR : cA;
  var gMet = new Float64Array(NG * M), gT = new Float64Array(NG * M), gR = new Float64Array(NG * M);
  for (var c2 = 0; c2 < NC; c2++) {
    var g = CG[c2];
    for (var m2 = 0; m2 < M; m2++) { var k2 = c2 * M + m2; gMet[g * M + m2] += cMet[k2]; gT[g * M + m2] += cT[k2]; gR[g * M + m2] += cR[k2]; }
  }
  var range = []; for (var m3 = s; m3 <= e; m3++) range.push(m3);
  var yoy = range.filter(function (m) { return m >= 12; });
  A = { mk: mk, cT: cT, cR: cR, cMet: cMet, gMet: gMet, gT: gT, gR: gR, dg: dg, range: range, yoy: yoy, sel: selGroups(), base: baseGroups() };
  return A;
}
function gSum(arr, groups, months, shift) {
  var t = 0; shift = shift || 0;
  for (var i = 0; i < groups.length; i++) for (var j = 0; j < months.length; j++) t += arr[groups[i] * M + months[j] - shift];
  return t;
}
function cSum(arr, c, months, shift) { var t = 0; shift = shift || 0; for (var j = 0; j < months.length; j++) t += arr[c * M + months[j] - shift]; return t; }
function yoyDesc() { var y = A.yoy; return y.length + '개월 비교 (' + ymL(D.months[y[0]]) + '~' + ymL(D.months[y[y.length - 1]]) + ' vs 전년 같은 달)'; }
// 업종별 증감률·점유율 변화
function groupGrowth(g) {
  if (!A.yoy.length) return { na: '계산 불가' };
  var cur = gSum(A.gMet, [g], A.yoy), prev = gSum(A.gMet, [g], A.yoy, 12);
  var bc = gSum(A.gMet, A.base, A.yoy), bp = gSum(A.gMet, A.base, A.yoy, 12);
  var r = { cur: cur, prev: prev, shareCur: bc ? cur / bc : NaN, sharePrev: bp ? prev / bp : NaN };
  r.shareDiff = r.shareCur - r.sharePrev;
  if (prev < MIN_BASE) { r.na = '표본 적음'; return r; }
  r.growth = cur / prev - 1; return r;
}

// ---------- 차트 공통 ----------
var charts = {};
function chart(id) { if (!charts[id]) charts[id] = echarts.init($(id)); return charts[id]; }
function tip(extra) {
  var o = { backgroundColor: T['surface-1'], borderColor: T.axis, borderWidth: 1, textStyle: { color: T['text-primary'], fontSize: 12 }, extraCssText: 'box-shadow:0 2px 8px rgba(0,0,0,.12);' };
  for (var k in extra) o[k] = extra[k];
  return o;
}
// 휴대폰 화면(좁은 폭)인지: 차트 눈금 수·지도 확대·범례 여백을 줄이는 데 씀
function narrow() { return window.innerWidth < 560; }
function axisStyle(o) {
  o.axisLine = { lineStyle: { color: T.axis } }; o.axisTick = { show: false };
  o.axisLabel = Object.assign({ color: T['text-muted'], fontSize: 11, hideOverlap: true }, o.axisLabel || {});
  o.splitLine = Object.assign({ lineStyle: { color: T.grid } }, o.splitLine || {});
  o.nameTextStyle = { color: T['text-muted'], fontSize: 11 };
  return o;
}
function emptyChart(id, msg) {
  chart(id).clear();
  chart(id).setOption({ graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: msg, fill: T['text-muted'], fontSize: 13 } }] });
}
function tableHtml(head, rows, numCols) {
  numCols = numCols || [];
  var h = '<table class="data"><thead><tr>' + head.map(function (x, i) { return '<th' + (numCols.indexOf(i) >= 0 ? ' class="n"' : '') + '>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
  rows.forEach(function (r) { h += '<tr>' + r.map(function (x, i) { return '<td' + (numCols.indexOf(i) >= 0 ? ' class="n"' : '') + '>' + esc(x) + '</td>'; }).join('') + '</tr>'; });
  return h + '</tbody></table>';
}

// 2026년 구간 표시 (도착 수 규모가 입도 관광객과 맞지 않아 수집 기준 확인 전)
var AREA26 = 'rgba(237,161,0,0.13)', NOTE26 = '<br><span style="color:#b07a00">2026년: 수집 기준 확인 전(규모 변화 원인 미확인)</span>';
function area26(labels) { var i = labels.findIndex(function (s) { return s >= '2026'; }); return i < 0 ? null : [{ xAxis: labels[i] }, { xAxis: labels[labels.length - 1] }]; }

// 제주 전체 · 전 업종 월별 관광객 (주의 문구용, 필터와 무관)
var ALLG = (function () {
  var t = new Float64Array(NG * M); for (var i = 0; i < NCELL; i++) t[CG[CUBE.c[i]] * M + CUBE.m[i]] += CUBE.tour[i];
  return { tour: t, groups: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
})();
var arrIdx = {}; D.arrivals.ym.forEach(function (ym, i) { arrIdx[ym] = i; });
