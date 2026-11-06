// [계절·지역] 업종별 계절성, 지역(읍면동) 지도
'use strict';

// ---------- ⑥ 계절성 히트맵 ----------
function seasonality(g) {
  var years = {}, full = [];
  A.range.forEach(function (m) { var y = Math.floor(D.months[m] / 100); (years[y] = years[y] || []).push(m); });
  Object.keys(years).forEach(function (y) { if (years[y].length === 12) full.push(+y); });
  var idx = new Array(12).fill(null), basis;
  if (full.length) {
    basis = full.join('·') + '년(1~12월이 모두 있는 해) 기준';
    var acc = new Array(12).fill(0), ok = true;
    full.forEach(function (y) {
      var ms = years[y], mean = ms.reduce(function (t, m) { return t + A.gMet[g * M + m]; }, 0) / 12;
      if (!mean) { ok = false; return; }
      ms.forEach(function (m) { acc[D.months[m] % 100 - 1] += A.gMet[g * M + m] / mean * 100; });
    });
    if (ok) for (var k = 0; k < 12; k++) idx[k] = acc[k] / full.length;
  } else {
    basis = '선택 기간에 1~12월이 모두 있는 해가 없어 선택 기간 월평균 기준';
    var sum = new Array(12).fill(0), cnt = new Array(12).fill(0);
    A.range.forEach(function (m) { var k = D.months[m] % 100 - 1; sum[k] += A.gMet[g * M + m]; cnt[k]++; });
    var avg = sum.map(function (s, k) { return cnt[k] ? s / cnt[k] : null; }), have = avg.filter(function (v) { return v != null; });
    var mean2 = have.reduce(function (t, v) { return t + v; }, 0) / have.length;
    if (mean2) for (var k2 = 0; k2 < 12; k2++) idx[k2] = avg[k2] == null ? null : avg[k2] / mean2 * 100;
  }
  return { idx: idx, basis: basis, full: full };
}
function renderSeason() {
  var sel = A.sel, res = sel.map(function (g) { return { g: g, s: seasonality(g) }; });
  var basis = res.length ? res[0].s.basis : '';
  $('s6').textContent = regionLabel() + ' · ' + MET[st.metric] + ' · 계절성 지수 = 월별 값 ÷ 그 해 월평균 × 100 (점선 100보다 위면 성수기, 아래면 비수기). ' + (st.seasonView === 'overlay' ? '범례에서 업종을 눌러 선을 켜고 끌 수 있고, 선에 마우스를 올리면 그 업종만 강조됩니다. ' : '모든 작은 차트의 세로 눈금이 같습니다. ') + basis + '.';
  res.forEach(function (r) {
    var v = r.s.idx.map(function (x, k) { return { x: x, k: k }; }).filter(function (o) { return o.x != null; });
    if (v.length) { r.hi = v.reduce(function (a, b) { return b.x > a.x ? b : a; }); r.lo = v.reduce(function (a, b) { return b.x < a.x ? b : a; }); }
  });
  if (st.seasonView === 'overlay') drawSeasonOverlay(res); else drawSeasonSmall(res);
  renderSeasonNotes(res);
}

// 세로 눈금: 100이 눈금선에 오도록 간격(20 또는 40)에 맞춰 위아래를 넓힘
function seasonScale(res) {
  var all = []; res.forEach(function (r) { r.s.idx.forEach(function (v) { if (v != null) all.push(v); }); });
  var lo0 = all.length ? Math.min.apply(null, all) : 80, hi0 = all.length ? Math.max.apply(null, all) : 120;
  var step = (hi0 - lo0) > 40 ? 40 : 20;
  return { min: 100 - Math.ceil(Math.max(1, 100 - lo0 + 4) / step) * step, max: 100 + Math.ceil(Math.max(1, hi0 - 100 + 12) / step) * step, step: step };
}

// 겹쳐 보기: 업종 선을 한 차트에 겹침. 범례로 선 켜고 끄기(선택 상태는 필터를 바꿔도 유지)
function drawSeasonOverlay(res) {
  var el = $('c6'); el.style.height = '360px';
  var sc = seasonScale(res), months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  var legendSel = {}; res.forEach(function (r) { legendSel[D.groups[r.g]] = st.seasonHidden.indexOf(r.g) < 0; });
  var c = chart('c6'); c.clear(); c.resize();
  c.setOption({
    animation: false,
    grid: { left: 40, right: 16, top: 56, bottom: 28 },
    legend: { top: 0, left: 0, right: 0, itemWidth: 16, itemHeight: 8, selected: legendSel, textStyle: { color: T['text-secondary'], fontSize: 12 }, inactiveColor: T.axis },
    tooltip: tip({
      trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: T.axis } }, formatter: function (ps) {
        var k = ps[0].dataIndex, h = '<b>' + (k + 1) + '월 계절성 지수</b><br>';
        ps.slice().sort(function (a, b) { return (b.value || 0) - (a.value || 0); }).forEach(function (p) { h += p.marker + p.seriesName + ' ' + (p.value == null ? '데이터 없음' : (+p.value).toFixed(1)) + '<br>'; });
        return h + '<span style="color:' + T['text-muted'] + '">' + (res[0] ? res[0].s.basis : '') + '</span>';
      }
    }),
    xAxis: axisStyle({ type: 'category', data: months, boundaryGap: false, splitLine: { show: false } }),
    yAxis: axisStyle({ type: 'value', min: sc.min, max: sc.max, interval: sc.step }),
    series: res.map(function (r, i) {
      return {
        name: D.groups[r.g], type: 'line', connectNulls: false, symbol: 'circle', symbolSize: 5, showSymbol: true, _g: r.g,
        lineStyle: { width: 2, color: gColor(r.g) }, itemStyle: { color: gColor(r.g), borderColor: T['surface-1'], borderWidth: 1 },
        emphasis: { focus: 'series', lineStyle: { width: 3 }, label: { show: true, position: 'top', fontSize: 10, color: T['text-secondary'], formatter: function (p) { return p.value == null ? '' : (+p.value).toFixed(0); } } },
        blur: { lineStyle: { opacity: 0.15 }, itemStyle: { opacity: 0.15 } },
        data: r.s.idx.map(function (v) { return v == null ? null : +v.toFixed(1); }),
        markLine: i === 0 ? { silent: true, symbol: 'none', label: { formatter: '평균 100', position: 'insideEndTop', color: T['text-muted'], fontSize: 10 }, lineStyle: { color: T['text-muted'], type: 'dashed', width: 1 }, data: [{ yAxis: 100 }] } : undefined
      };
    })
  });
  var keepHidden = function (e) { st.seasonHidden = res.filter(function (r) { return e.selected[D.groups[r.g]] === false; }).map(function (r) { return r.g; }); };
  ['legendselectchanged', 'legendselected', 'legendunselected'].forEach(function (ev) { c.off(ev); c.on(ev, keepHidden); });
  c.off('click'); c.on('click', function (p) { var r = res[p.seriesIndex]; if (r) focusGroup(r.g); });
}

// 작은 차트: 업종마다 작은 꺾은선 (한 차트 안에 업종 수만큼 격자를 나눔)
function drawSeasonSmall(res) {
  var el = $('c6'), W = el.clientWidth || 560, n = res.length;
  var cols = n <= 1 ? 1 : (W < 520 || n <= 4) ? 2 : 3, rows = Math.ceil(n / cols);
  var cellH = 124, padTop = 6, gapX = 26, leftAxis = 30, cellW = (W - leftAxis - gapX * (cols - 1) - 8) / cols;
  el.style.height = (padTop + rows * cellH + 4) + 'px';
  var sc = seasonScale(res), yMin = sc.min, yMax = sc.max, yStep = sc.step;
  var months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  var grids = [], xs = [], ys = [], titles = [], series = [];
  res.forEach(function (r, i) {
    var col = i % cols, row = Math.floor(i / cols);
    var left = leftAxis + col * (cellW + gapX), top = padTop + row * cellH + 22;
    grids.push({ left: left, top: top, width: cellW, height: cellH - 22 - 24 });
    titles.push({ text: D.groups[r.g], left: left, top: top - 20, textStyle: { fontSize: 12, fontWeight: 600, color: T['text-primary'] } });
    xs.push(axisStyle({ gridIndex: i, type: 'category', data: months, boundaryGap: false, axisLabel: { fontSize: 10, interval: 0, formatter: function (v) { return +v % 3 === 0 ? v + '월' : ''; } }, splitLine: { show: false } }));
    ys.push(axisStyle({ gridIndex: i, type: 'value', min: yMin, max: yMax, interval: yStep, axisLabel: { show: col === 0, fontSize: 10 }, splitLine: { lineStyle: { color: T.grid } } }));
    var hiK = r.hi ? r.hi.k : -1, loK = r.lo ? r.lo.k : -1;
    series.push({
      name: D.groups[r.g], type: 'line', xAxisIndex: i, yAxisIndex: i, connectNulls: false, showSymbol: true, symbol: 'none', symbolSize: 7, _g: r.g,
      lineStyle: { width: 2, color: gColor(r.g) }, itemStyle: { color: gColor(r.g), borderColor: T['surface-1'], borderWidth: 1.5 },
      data: r.s.idx.map(function (v, k) {
        if (v == null) return null;
        var mark = (k === hiK || k === loK) && hiK !== loK;
        return mark ? { value: +v.toFixed(1), symbol: 'circle', symbolSize: 7, label: { show: true, position: k === hiK ? 'top' : 'bottom', distance: 3, fontSize: 10, color: T['text-secondary'], formatter: (k + 1) + '월 ' + v.toFixed(0) } } : +v.toFixed(1);
      }),
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: T['text-muted'], type: 'dashed', width: 1 }, data: [{ yAxis: 100 }] }
    });
  });
  var c = chart('c6'); c.clear(); c.resize();
  c.setOption({
    animation: false, title: titles, grid: grids, xAxis: xs, yAxis: ys, series: series,
    tooltip: tip({
      trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: T.axis } }, formatter: function (ps) {
        var p = ps[0], r = res[p.seriesIndex]; if (!r) return '';
        var v = r.s.idx[p.dataIndex];
        return '<b>' + D.groups[r.g] + ' · ' + (p.dataIndex + 1) + '월</b><br>계절성 지수 ' + (v == null ? '데이터 없음' : v.toFixed(1)) + '<br><span style="color:' + T['text-muted'] + '">' + r.s.basis + '</span>';
      }
    })
  });
  c.off('click'); c.on('click', function (p) { var r = res[p.seriesIndex]; if (r) focusGroup(r.g); });
}

// 성수기·비수기 문구, 표, 요약용 결과
function renderSeasonNotes(res) {
  var nCal = res.length ? res[0].s.idx.filter(function (v) { return v != null; }).length : 0;
  var notes = res.map(function (r) {
    if (!r.hi) return D.groups[r.g] + ': 데이터 없음';
    if (nCal < 3) return D.groups[r.g] + ': ' + nCal + '개월만 선택돼 성수기·비수기는 판단하지 않음';
    return D.groups[r.g] + ' 성수기 ' + (r.hi.k + 1) + '월(' + r.hi.x.toFixed(0) + ') · 비수기 ' + (r.lo.k + 1) + '월(' + r.lo.x.toFixed(0) + ')';
  });
  $('n6').textContent = notes.join(' / ') + (res.length && res[0].s.idx.some(function (v) { return v == null; }) ? ' · 선이 끊긴 달은 선택 기간에 데이터가 없음' : '');
  $('t6').innerHTML = tableHtml(['업종'].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (k) { return k + '월'; })), res.map(function (r) { return [D.groups[r.g]].concat(r.s.idx.map(function (v) { return v == null ? '데이터 없음' : v.toFixed(1); })); }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  OUT.season = notes; OUT.seasonRes = res;
}

// ---------- ⑦ 지역 지도 ----------
var mapReady = false;
function dongStats() {
  var sel = A.sel, base = A.base, rows = [], V = 0, B = 0;
  for (var d = 0; d < ND; d++) {
    var v = 0, b = 0;
    sel.forEach(function (g) { v += A.dg[d * NG + g]; }); base.forEach(function (g) { b += A.dg[d * NG + g]; });
    rows.push({ d: d, v: v, b: b }); V += v; B += b;
  }
  rows.forEach(function (r) { r.share = r.b ? r.v / r.b : NaN; r.lq = (r.b && V && B) ? (r.v / r.b) / (V / B) : NaN; r.small = r.v < MIN_BASE; });
  return { rows: rows, V: V, B: B };
}
function lqOfGroup(g) { // 요약용: 한 업종의 특화지수
  var V = 0, B = 0, rows = [];
  for (var d = 0; d < ND; d++) { var v = A.dg[d * NG + g], b = 0; A.base.forEach(function (x) { b += A.dg[d * NG + x]; }); rows.push({ d: d, v: v, b: b }); V += v; B += b; }
  rows.forEach(function (r) { r.lq = r.b && V ? (r.v / r.b) / (V / B) : NaN; });
  return rows.filter(function (r) { return r.v >= MIN_BASE && isFinite(r.lq); }).sort(function (a, b) { return b.lq - a.lq; });
}
function renderMap() {
  if (!mapReady) { GEO.features.forEach(function (f) { var nm = f.properties.adm_nm; f.properties.name = nm.slice(nm.lastIndexOf(' ') + 1); }); echarts.registerMap('jeju', GEO); mapReady = true; }
  var ds = dongStats(), lqMode = st.mapMode === 'lq', allSel = isAllSel();
  var selD = st.region.indexOf('dong:') === 0 ? +st.region.slice(5) : -1;
  $('s7').textContent = periodLabel() + ' · ' + groupsLabel() + ' · ' + MET[st.metric] + '. ' + (lqMode ? '특화지수 = 읍면동 안 선택 업종 비중 ÷ 제주 전체 선택 업종 비중 (1보다 크면 상대적으로 몰린 곳).' : '선택 업종의 도착 규모.') + ' 지역 필터와 관계없이 43개 읍면동을 모두 보여 주며, 읍면동을 누르면 지역 필터가 바뀝니다.';
  var data = ds.rows.map(function (r) {
    var nm = D.dongs.name[r.d], val = lqMode ? (r.small || !isFinite(r.lq) ? NaN : +r.lq.toFixed(3)) : r.v;
    var it = { name: nm, value: val, _r: r };
    if (lqMode && r.small) it.itemStyle = { areaColor: T['surface-2'], borderType: 'dashed', borderColor: T['text-muted'] };
    if (r.d === selD) { it.selected = true; }
    if (st.region.indexOf('sgg:') === 0 && D.dongs.sgg[r.d] === st.region.slice(4)) it.itemStyle = Object.assign({}, it.itemStyle || {}, { borderColor: T['text-primary'], borderWidth: 1.2 });
    return it;
  });
  var vals = ds.rows.map(function (r) { return r.v; });
  var vm = lqMode ? {
    type: 'piecewise', left: 0, bottom: 0, itemWidth: 12, itemHeight: 10, textStyle: { color: T['text-secondary'], fontSize: 11 },
    pieces: [{ lt: 0.67, label: '0.67 미만', color: T['div-neg-2'] }, { gte: 0.67, lt: 0.9, label: '0.67~0.9', color: T['div-neg-1'] }, { gte: 0.9, lt: 1.1, label: '0.9~1.1 (평균)', color: T.neutral }, { gte: 1.1, lt: 1.5, label: '1.1~1.5', color: T['div-pos-1'] }, { gte: 1.5, label: '1.5 이상', color: T['div-pos-2'] }]
  } : {
    type: 'continuous', min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), left: 0, bottom: 0, itemHeight: 90, text: ['많음', '적음'], calculable: false,
    inRange: { color: [T['seq-1'], T['seq-3'], T['seq-5'], T['seq-7']] }, textStyle: { color: T['text-secondary'], fontSize: 11 }, formatter: function (v) { return fmtN(v); }
  };
  var c = chart('c7'); c.clear();
  c.setOption({
    animation: false,
    tooltip: tip({
      trigger: 'item', formatter: function (p) {
        var r = p.data && p.data._r; if (!r) return p.name;
        return '<b>' + D.dongs.sgg[r.d] + ' ' + D.dongs.name[r.d] + '</b><br>선택 업종 ' + MET[st.metric] + ' ' + fmtN(r.v) + '건<br>관광 업종 전체 ' + fmtN(r.b) + '건 (비중 ' + fmtP(r.share) + ')<br>특화지수 ' + (r.small ? '표본 적음' : isFinite(r.lq) ? r.lq.toFixed(2) : '-') + '<br><span style="color:' + T['text-muted'] + '">' + periodLabel() + '</span>';
      }
    }),
    visualMap: vm,
    series: [{
      type: 'map', map: 'jeju', roam: true, top: 10, bottom: 10, center: [126.55, 33.39], zoom: narrow() ? 1.5 : 2.0, scaleLimit: { min: 1, max: 8 }, selectedMode: 'single', nameProperty: 'name',
      label: { show: false }, emphasis: { label: { show: true, fontSize: 11, color: T['text-primary'] }, itemStyle: { areaColor: T.accent } },
      select: { itemStyle: { borderColor: T['text-primary'], borderWidth: 2.5 }, label: { show: true, color: T['text-primary'], fontWeight: 'bold' } },
      itemStyle: { borderColor: T['surface-1'], borderWidth: 0.8, areaColor: T['surface-2'] }, data: data
    }]
  });
  c.off('click'); c.on('click', function (p) { var r = p.data && p.data._r; if (r) focusDong(r.d); });
  var top;
  if (lqMode) top = ds.rows.filter(function (r) { return !r.small && isFinite(r.lq); }).sort(function (a, b) { return b.lq - a.lq; }).slice(0, 5);
  else top = ds.rows.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
  $('h7top').textContent = lqMode ? '특화지수 상위 5개' : '도착 규모 상위 5개';
  $('r7').innerHTML = top.map(function (r) { return '<li><span class="r"><span class="nm">' + esc(D.dongs.name[r.d]) + '</span><span class="v">' + (lqMode ? r.lq.toFixed(2) : fmtN(r.v)) + '</span></span></li>'; }).join('') || '<li class="empty">데이터 없음</li>';
  var smallN = ds.rows.filter(function (r) { return r.small; }).length;
  $('n7').textContent = (lqMode && allSel ? '관광 업종 전체를 선택하면 특화지수가 모든 지역에서 1입니다. 업종을 좁혀서 보세요. ' : '') + (lqMode && smallN ? '점선 회색은 선택 업종 값 1,000 미만(표본 적음) ' + smallN + '곳. ' : '') + '북쪽 추자면은 지도를 드래그하면 보입니다.';
  $('t7').innerHTML = tableHtml(['시', '읍면동', '선택 업종(건)', '관광 업종 전체(건)', '비중', '특화지수'], ds.rows.slice().sort(function (a, b) { return b.v - a.v; }).map(function (r) { return [D.dongs.sgg[r.d], D.dongs.name[r.d], fmtN(r.v), fmtN(r.b), fmtP(r.share), r.small ? '표본 적음' : isFinite(r.lq) ? r.lq.toFixed(2) : '-']; }), [2, 3, 4, 5]);
  OUT.mapTop = top.map(function (r) { return D.dongs.name[r.d] + ' ' + (lqMode ? r.lq.toFixed(3) : fmtN(r.v)); });
  OUT.mapColored = data.filter(function (x) { return isFinite(x.value); }).length;
  OUT.dongRows = ds.rows;
}
