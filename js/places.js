// 인기 장소: TOP10 표, 뜨는 장소·지는 장소, 인기 장소 지도
'use strict';

// ---------- ⑨ 장소 TOP10 ----------
function renderPlaces() {
  var sel = A.sel, s = st.start, e = st.end, mv = P[st.metric], list = [];
  var yoySet = {}; A.yoy.forEach(function (m) { yoySet[m] = 1; });
  for (var p = 0; p < NP; p++) {
    if (sel.indexOf(P.group[p]) < 0 || !A.mk[P.dong[p]]) continue;
    var v = 0, t = 0, r = 0, cur = 0, prev = 0, curM = 0, prevM = 0, has = false;
    for (var i = pStart[p]; i < pStart[p + 1]; i++) {
      var m = P.m[i];
      if (m >= s && m <= e) { v += mv[i]; t += P.tour[i]; r += P.res[i]; has = true; }
      if (yoySet[m]) { cur += P.tour[i]; curM += mv[i]; }
      if (yoySet[m + 12]) { prev += P.tour[i]; prevM += mv[i]; }
    }
    if ((has && v > 0) || prevM > 0) list.push({ p: p, v: v, t: t, r: r, cur: cur, prev: prev, curM: curM, prevM: prevM });
  }
  list.sort(function (a, b) { return b.v - a.v; });
  var top = list.slice(0, 10);
  $('s10').textContent = periodLabel() + ' · ' + regionLabel() + ' · ' + groupsLabel() + ' · ' + MET[st.metric] + ' 상위 10곳. 장소는 \'목적지명 + 읍면동\' 단위로 묶었습니다.';
  var h = '<thead><tr><th class="n">순위</th><th>장소명</th><th>읍면동</th><th>세부 업종</th><th class="n">' + MET[st.metric] + '</th><th class="n">관광객 전년 대비</th><th class="n" title="관광객·도민 구분 기준이 확인되지 않아 장소끼리 상대 비교용으로만 보세요">관광객 비중 <em class="ref-tag">상대 비교용</em></th></tr></thead><tbody>';
  if (!top.length) h += '<tr><td colspan="7" class="muted">데이터 없음</td></tr>';
  top.forEach(function (o, i) {
    var p = o.p, g = placeYoyPill(o);
    h += '<tr><td class="n">' + (i + 1) + '</td><td><span class="dot" style="background:' + gColor(P.group[p]) + '"></span>' + esc(P.name[p]) + (P.mis[p] ? ' <span class="flag" title="도착건수와 관광객+도민 합계가 다른 달이 ' + P.mis[p] + '개 있음">*</span>' : '') + '</td><td>' + esc(D.dongs.name[P.dong[p]]) + '</td><td>' + esc(D.cats.name[P.cat[p]]) + (P.cats[p] > 1 ? ' <span class="muted" title="세부 업종이 ' + P.cats[p] + '개로 기록됨. 도착건수가 가장 많은 업종을 표시">외</span>' : '') + '</td><td class="n">' + fmtN(o.v) + '</td><td class="n">' + g + '</td><td class="n">' + (o.t + o.r ? fmtP(o.t / (o.t + o.r)) : '-') + '</td></tr>';
  });
  $('t10').innerHTML = h + '</tbody>';
  $('n10').textContent = '* 도착건수와 관광객+도민 합계가 다른 달이 있는 장소(원본 30,011행, 값은 그대로 사용). 전년 대비는 비교 가능한 달의 관광객 도착 수, 전년 값 100 미만은 표본 적음. 장소 후보는 읍면동×업종마다 전 기간·연도별 상위 ' + P.topN + '곳(전체 ' + fmtN(P.allPlaces) + '곳 중 ' + fmtN(NP) + '곳)이라, 짧은 기간에만 붐빈 작은 장소는 빠질 수 있습니다.';
  OUT.places = top.map(function (o) { return P.name[o.p] + '(' + D.dongs.name[P.dong[o.p]] + ') ' + fmtN(o.v); });
  A.placesTop = top; A.placesAll = list;
}
// 장소 전년 대비: 초록(증가)·빨강(감소) 배지
function placeYoyPill(o) {
  if (!A.yoy.length) return '<span class="pill na">계산 불가</span>';
  if (o.prev < MIN_PLACE) return '<span class="pill na">표본 적음</span>';
  var g = o.cur / o.prev - 1;
  return '<span class="pill ' + (g >= 0 ? 'up' : 'down') + '">' + fmtS(g) + '</span>';
}

// ---------- 인기 장소 지도 (현재 필터의 상위 장소를 좌표에 점으로) ----------
// 좌표: 카카오 로컬 API로 주소→좌표 변환(scripts\geocode_places.ps1). 좌표가 없으면 읍면동 중심 근처 '대략 위치'(빈 원)
// ---------- 뜨는 장소 · 지는 장소 ----------
// 비교: 선택 기간 중 전년 같은 달이 있는 달끼리. 점유율 = 장소 지표값 ÷ 선택 업종·지역 전체 지표값.
// 순위는 점유율 변화(%p) 기준(2026년 처리 방침), 전년·올해 모두 TREND_MIN 건 이상인 장소만.
var TREND_MIN = 300;
function fmtPP2(x) { var v = Math.round(x * 10000) / 100; return (v > 0 ? '+' : '') + v.toFixed(2) + '%p'; }
function renderPlaceTrend() {
  A.trendD = {};
  var empty = function (msg) { ['tUp', 'tDown'].forEach(function (id) { $(id).innerHTML = '<tbody><tr><td class="muted">' + msg + '</td></tr></tbody>'; }); OUT.trend = { up: [], down: [], msg: msg }; };
  $('sTrend').textContent = (A.yoy.length ? yoyDesc() : periodLabel()) + ' · ' + regionLabel() + ' · ' + groupsLabel() + ' · ' + MET[st.metric]
    + '. 점유율 = 장소 ' + MET[st.metric] + ' ÷ 선택한 업종·지역 전체. 전년 같은 달보다 점유율이 가장 많이 오른 곳과 내린 곳입니다.';
  $('nTrend').textContent = '전년·올해 모두 ' + fmtN(TREND_MIN) + '건 이상인 장소만 비교합니다. 증감률은 도착 수 규모 변화가 입도 관광객과 맞지 않아(원인 미확인) 참고용입니다. '
    + '장소 후보는 읍면동×업종마다 상위 ' + P.topN + '곳이라 작은 장소는 빠질 수 있습니다.';
  if (!A.yoy.length) { empty('계산 불가 - 선택 기간에 전년 같은 달 데이터가 없습니다'); return; }
  var tc = gSum(A.gMet, A.sel, A.yoy), tp = gSum(A.gMet, A.sel, A.yoy, 12);
  if (!tc || !tp) { empty('데이터 없음'); return; }
  var rows = (A.placesAll || []).filter(function (o) { return o.curM >= TREND_MIN && o.prevM >= TREND_MIN; }).map(function (o) {
    var sc = o.curM / tc, sp = o.prevM / tp; A.trendD[o.p] = sc - sp;
    return { o: o, sc: sc, sp: sp, d: sc - sp, g: o.curM / o.prevM - 1 };
  });
  // 이름 변경 의심: 같은 읍면동·업종에 이름 앞부분이 같은 장소가 반대 방향으로 움직이면
  // (예: '우진해장국' ↓ / '우진해장국/본관' ↑) 기록상 이름이 바뀌어 둘로 나뉜 것일 수 있음
  var base = function (s) { return s.split('/')[0].replace(/\s+/g, ''); };
  var byDG = {};
  rows.forEach(function (r) { var k = P.dong[r.o.p] + '|' + P.group[r.o.p]; (byDG[k] = byDG[k] || []).push(r); });
  rows.forEach(function (r) {
    var b1 = base(P.name[r.o.p]);
    r.sus = b1.length >= 2 && (byDG[P.dong[r.o.p] + '|' + P.group[r.o.p]] || []).some(function (x) {
      if (x === r || x.d * r.d >= 0) return false;
      var b2 = base(P.name[x.o.p]), n = Math.min(3, b1.length, b2.length);
      return b1 === b2 || (n >= 2 && b1.slice(0, n) === b2.slice(0, n) && Math.abs(x.d) > Math.abs(r.d) * 0.3);
    });
  });
  var pool = st.trendHideSus ? rows.filter(function (r) { return !r.sus; }) : rows;
  var up = pool.filter(function (r) { return r.d > 0; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 10);
  var down = pool.filter(function (r) { return r.d < 0; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 10);
  var tbl = function (arr, cls) {
    var h = '<thead><tr><th class="n">순위</th><th>장소</th><th class="n">점유율 전년 → 올해</th><th class="n">변화 <small>증감률(참고)</small></th></tr></thead><tbody>';
    if (!arr.length) h += '<tr><td colspan="4" class="muted">해당 장소 없음</td></tr>';
    arr.forEach(function (r, i) {
      var p = r.o.p;
      h += '<tr><td class="n">' + (i + 1) + '</td><td><span class="dot" style="background:' + gColor(P.group[p]) + '"></span><b>' + esc(P.name[p]) + '</b>' + (r.sus ? ' <em class="ref-tag" title="같은 읍면동·업종에 이름이 비슷한 장소가 반대로 움직였습니다. 기록상 이름이 바뀌어 둘로 나뉜 것일 수 있어 실제 인기 변화가 아닐 수 있습니다.">이름 변경 의심</em>' : '') + '<small>' + esc(D.dongs.name[P.dong[p]]) + ' · ' + esc(D.cats.name[P.cat[p]]) + '</small></td>'
        + '<td class="n">' + fmtP(r.sp, 2) + ' → ' + fmtP(r.sc, 2) + '<small>' + fmtN(r.o.prevM) + ' → ' + fmtN(r.o.curM) + '건</small></td>'
        + '<td class="n"><span class="pill ' + cls + '">' + fmtPP2(r.d) + '</span><small>' + fmtS(r.g) + '</small></td></tr>';
    });
    return h + '</tbody>';
  };
  $('tUp').innerHTML = tbl(up, 'rise'); $('tDown').innerHTML = tbl(down, 'fall');
  var susN = up.concat(down).filter(function (r) { return r.sus; }).length;
  var hidN = st.trendHideSus ? rows.filter(function (r) { return r.sus; }).length : 0;
  if (hidN) $('nTrend').textContent += ' 이름 변경 의심 ' + hidN + '곳을 빼고 순위를 매겼습니다.';
  if (susN) $('nTrend').textContent += ' \'이름 변경 의심\' ' + susN + '곳: 같은 읍면동·업종에 이름이 비슷한 장소가 반대로 움직여, 기록상 이름이 바뀌어 둘로 나뉜 것일 수 있습니다(실제 인기 변화가 아닐 수 있음).';
  var lab = function (r) { return P.name[r.o.p] + '(' + D.dongs.name[P.dong[r.o.p]] + ') ' + fmtPP2(r.d) + (r.sus ? ' [이름변경의심]' : ''); };
  OUT.trend = { compared: rows.length, suspect: susN, up: up.map(lab), down: down.map(lab) };
}

var DONG_CENTER = null;
function dongCenters() {
  if (DONG_CENTER) return DONG_CENTER;
  DONG_CENTER = {};
  GEO.features.forEach(function (f) {
    var nm = f.properties.adm_nm, name = nm.slice(nm.lastIndexOf(' ') + 1), g = f.geometry, best = null, bestN = 0;
    var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    polys.forEach(function (pl) { if (pl[0].length > bestN) { bestN = pl[0].length; best = pl[0]; } });   // 가장 큰 고리(본섬 쪽)
    var sx = 0, sy = 0; best.forEach(function (c) { sx += c[0]; sy += c[1]; });
    DONG_CENTER[name] = [sx / best.length, sy / best.length];
  });
  return DONG_CENTER;
}
function renderPlaceMap() {
  var list = (A.placesAll || []).slice(0, st.ptN), cen = dongCenters();
  var vmax = list.length ? list[0].v : 1, exact = 0, approx = 0;
  $('sPts').textContent = periodLabel() + ' · ' + regionLabel() + ' · ' + groupsLabel() + ' · ' + MET[st.metric] + ' 상위 ' + list.length + '곳. 점 크기 = ' + MET[st.metric] + ', 색 = 업종. 범례를 누르면 업종별로 켜고 끌 수 있습니다.';
  var byG = {}, trend = st.ptColor === 'trend' && A.yoy.length > 0;
  // 상승·하락 색: 점유율 변화의 크기로 3단계 (작은 변화는 회색)
  var dvals = list.map(function (o) { return A.trendD && A.trendD[o.p] != null ? Math.abs(A.trendD[o.p]) : 0; }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
  var thr = dvals.length ? dvals[Math.floor(dvals.length * 0.33)] : 0;
  var TREND_NAMES = ['상승', '변화 적음', '하락', '비교 불가'], TREND_COL = [T.up, T['text-muted'], T.down, T.axis];
  var labelSet = {};
  if (trend) {
    var withD = list.filter(function (o) { return A.trendD[o.p] != null; });
    withD.slice().sort(function (a, b) { return A.trendD[b.p] - A.trendD[a.p]; }).slice(0, 5).forEach(function (o) { if (A.trendD[o.p] > 0) labelSet[o.p] = 1; });
    withD.slice().sort(function (a, b) { return A.trendD[a.p] - A.trendD[b.p]; }).slice(0, 5).forEach(function (o) { if (A.trendD[o.p] < 0) labelSet[o.p] = 1; });
  }
  var trendKey = function (p) { var d = A.trendD ? A.trendD[p] : null; if (d == null) return 3; return Math.abs(d) < thr ? 1 : d > 0 ? 0 : 2; };
  list.forEach(function (o, rank) {
    var p = o.p, g = trend ? trendKey(p) : P.group[p], lng = P.lng ? P.lng[p] : null, lat = P.lat ? P.lat[p] : null, ok = lng != null && lat != null;
    var col = trend ? TREND_COL[g] : gColor(g);
    if (!ok) {   // 대략 위치: 읍면동 중심 주변에 겹치지 않게 살짝 흩뜨림
      var c = cen[D.dongs.name[P.dong[p]]] || [126.55, 33.38], a = (rank * 137.5) * Math.PI / 180, rr = 0.004 + 0.0012 * (rank % 7);
      lng = c[0] + Math.cos(a) * rr; lat = c[1] + Math.sin(a) * rr * 0.8; approx++;
    } else exact++;
    (byG[g] = byG[g] || []).push({ value: [lng, lat, o.v], _o: o, _ok: ok, _rank: rank + 1,
      symbol: ok ? 'circle' : 'emptyCircle', symbolSize: 6 + 28 * Math.sqrt(o.v / vmax),
      itemStyle: ok ? { color: col, opacity: 0.85, borderColor: '#fff', borderWidth: 1 } : { color: col, opacity: 0.7, borderWidth: 1.5 },
      label: { show: trend ? !!labelSet[p] : rank < 8, formatter: P.name[p] + (trend && A.trendD[p] != null && labelSet[p] ? ' ' + fmtPP2(A.trendD[p]) : ''), position: 'right', fontSize: 11, color: T['text-primary'], fontWeight: 600, textBorderColor: T['surface-1'], textBorderWidth: 3 } });
  });
  var selD = st.region.indexOf('dong:') === 0 ? D.dongs.name[+st.region.slice(5)] : null;
  var regions = D.dongs.name.filter(function (n, d) { return st.region === 'all' || (st.region.indexOf('sgg:') === 0 ? D.dongs.sgg[d] === st.region.slice(4) : n === selD); })
    .map(function (n) { return { name: n, itemStyle: { areaColor: st.region === 'all' ? T['surface-2'] : T['accent-soft'] || '#e6effe' } }; });
  $('sPts').textContent = $('sPts').textContent.replace('색 = 업종. 범례를 누르면 업종별로', trend ? '색 = 점유율 변화(파랑 상승 · 빨강 하락 · 회색 변화 적음, ' + yoyDesc() + '). 이름은 가장 많이 오른 5곳·내린 5곳. 범례를 누르면 종류별로' : '색 = 업종. 범례를 누르면 업종별로');
  if (st.ptColor === 'trend' && !A.yoy.length) $('sPts').textContent += ' (전년 같은 달 데이터가 없어 상승·하락을 계산할 수 없어 업종 색으로 표시)';
  var c = chart('cPts'); c.clear(); c.resize();
  c.setOption({
    animation: false,
    geo: { map: 'jeju', roam: true, center: [126.55, 33.39], zoom: narrow() ? 1.5 : 2.0, scaleLimit: { min: 1, max: 12 }, nameProperty: 'name', silent: true,
      itemStyle: { areaColor: T['surface-2'], borderColor: T.axis, borderWidth: 0.6 }, regions: regions, label: { show: false } },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, icon: 'circle', textStyle: { color: T['text-secondary'], fontSize: 12 } },
    tooltip: tip({ trigger: 'item', formatter: function (pp) {
      var d = pp.data; if (!d || !d._o) return ''; var o = d._o, p = o.p;
      return '<b>' + d._rank + '. ' + esc(P.name[p]) + '</b><br>' + D.groups[P.group[p]] + ' · ' + esc(D.cats.name[P.cat[p]]) + ' · ' + esc(D.dongs.name[P.dong[p]]) + '<br>' + MET[st.metric] + ' ' + fmtN(o.v) + '건'
        + (A.trendD && A.trendD[p] != null ? '<br>점유율 변화 ' + fmtPP2(A.trendD[p]) + ' (' + fmtP(o.prevM / gSum(A.gMet, A.sel, A.yoy, 12), 2) + ' → ' + fmtP(o.curM / gSum(A.gMet, A.sel, A.yoy), 2) + ')' : (A.yoy.length ? '<br>점유율 변화: 비교 불가(전년·올해 ' + TREND_MIN + '건 미만)' : ''))
        + (A.yoy.length && o.prev >= MIN_PLACE ? '<br>관광객 전년 대비 ' + fmtS(o.cur / o.prev - 1) + ' (참고)' : '')
        + '<br><span style="color:' + T['text-muted'] + '">' + (d._ok ? '좌표: 주소 기준' : '대략 위치(읍면동 중심, 좌표 없음)') + '</span>';
    } }),
    series: Object.keys(byG).map(Number).sort(function (a, b) { return a - b; }).map(function (g) {
      return { name: trend ? TREND_NAMES[g] : D.groups[g], type: 'scatter', itemStyle: { color: trend ? TREND_COL[g] : gColor(g) }, coordinateSystem: 'geo', data: byG[g].sort(function (a, b) { return b._o.v - a._o.v; }), emphasis: { scale: 1.3, label: { show: true } }, labelLayout: { hideOverlap: true } };
    })
  });
  $('nPts').textContent = (list.length ? '정확한 위치 ' + exact + '곳 · 대략 위치(빈 원, 읍면동 중심) ' + approx + '곳. ' : '표시할 장소가 없습니다. ')
    + (exact === 0 && list.length ? '아직 좌표 파일이 없어 모든 점을 읍면동 중심 근처에 표시했습니다. scripts\\geocode_places.ps1 로 주소를 좌표로 바꾸고 다시 빌드하면 정확한 위치로 바뀝니다. ' : '')
    + '좌표는 카카오 로컬 API로 주소를 변환한 값입니다. 지도는 드래그·휠로 움직이고 확대할 수 있습니다.';
  $('tPts').innerHTML = tableHtml(['순위', '장소', '업종', '세부 업종', '읍면동', MET[st.metric], '위치'], list.map(function (o, i) { var p = o.p; return [i + 1, P.name[p], D.groups[P.group[p]], D.cats.name[P.cat[p]], D.dongs.name[P.dong[p]], fmtN(o.v), (P.lng && P.lng[p] != null) ? '주소 좌표' : '대략(읍면동 중심)']; }), [0, 5]);
  OUT.pts = { shown: list.length, exact: exact, approx: approx, series: Object.keys(byG).length, mode: trend ? 'trend' : 'group', legend: Object.keys(byG).map(Number).sort().map(function (g) { return (trend ? TREND_NAMES[g] : D.groups[g]) + ' ' + byG[g].length; }), labels: Object.keys(labelSet).map(function (p) { return P.name[p]; }) };
}
