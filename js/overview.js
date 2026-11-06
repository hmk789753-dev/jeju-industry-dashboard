// [한눈에 보기] 핵심 지표 4칸 + 미니 추세선, 월별 막대, 안내 카드, 하이라이트, TOP5
'use strict';

// ---------- ③ 핵심 지표 ----------
var OUT = {}; // 자동 점검·요약용 결과
function setKpi(id, val, unit, desc, na) {
  var el = $(id); el.className = 'k-value' + (na ? ' na' : '');
  el.innerHTML = esc(val) + (unit ? '<span class="unit">' + unit + '</span>' : '');
  $(id + 'd').textContent = desc;
}
function renderKpis() {
  var sel = A.sel, total = gSum(A.gMet, sel, A.range);
  $('k1Label').textContent = (isAllSel() ? (st.transport ? '관광 업종+교통거점 ' : '관광 업종 ') : '선택 업종 ') + MET[st.metric];
  setKpi('k1', fmtN(total), '건', periodLabel() + ' · ' + regionLabel());
  OUT.k1 = total;
  // 전년 동기 대비
  if (!A.yoy.length) { setKpi('k2', '계산 불가', '', '선택 기간에 전년 같은 달 데이터가 없습니다 (데이터는 2024.01부터)', true); OUT.k2 = null; }
  else {
    var cur = gSum(A.gMet, sel, A.yoy), prev = gSum(A.gMet, sel, A.yoy, 12);
    if (prev < MIN_BASE) { setKpi('k2', '표본 적음', '', '전년 값 ' + fmtN(prev) + '건 (1,000 미만)', true); OUT.k2 = null; }
    else { OUT.k2 = cur / prev - 1; setKpi('k2', fmtS(OUT.k2), '', '참고용: 도착 수 규모 변화는 입도 관광객과 맞지 않음 · ' + yoyDesc() + ' · ' + fmtN(prev) + ' → ' + fmtN(cur) + '건'); $('k2').classList.add('ref'); }
  }
  // 점유율이 가장 오른 업종 (2026년 처리 방침: 업종 비교는 점유율 기준)
  var best = null;
  sel.forEach(function (g) { var r = groupGrowth(g); r.g = g; if (r.growth != null && isFinite(r.shareDiff) && (!best || r.shareDiff > best.shareDiff)) best = r; });
  if (!A.yoy.length) { setKpi('k3', '계산 불가', '', '전년 같은 달 데이터가 없습니다', true); OUT.k3 = null; }
  else if (!best) { setKpi('k3', '표본 적음', '', '전년 값이 1,000 이상인 업종이 없습니다', true); OUT.k3 = null; }
  else { setKpi('k3', D.groups[best.g], '', '점유율 ' + fmtP(best.sharePrev) + ' → ' + fmtP(best.shareCur) + ' · 증감률 ' + fmtS(best.growth) + '(참고) · ' + A.yoy.length + '개월 비교'); OUT.k3 = { g: D.groups[best.g], growth: best.growth, shareDiff: best.shareDiff }; }
  // 관광객 비중
  var t = gSum(A.gT, sel, A.range), r2 = gSum(A.gR, sel, A.range);
  if (t + r2 === 0) { setKpi('k4', '데이터 없음', '', '', true); OUT.k4 = null; }
  else { OUT.k4 = t / (t + r2); setKpi('k4', fmtP(OUT.k4), '', '관광객 ' + fmtN(t) + ' · 도민 ' + fmtN(r2) + '건'); }
  renderSparks(best && A.yoy.length ? best.g : null);
  OUT.kpiText = ['k1', 'k2', 'k3', 'k4'].map(function (k) { return $(k).textContent + ' | ' + $(k + 'd').textContent; });

  // 2026년 주의 문구: 선택 기간이 2026년을 포함하고 전년 비교가 가능할 때
  var has26 = A.yoy.some(function (m) { return D.months[m] >= 202601; });
  var w = $('warn2026');
  if (has26) {
    var m26 = A.yoy.filter(function (m) { return D.months[m] >= 202601; });
    var all = gSum(ALLG.tour, ALLG.groups, m26), allp = gSum(ALLG.tour, ALLG.groups, m26, 12);
    var arrM = m26.filter(function (m) { return arrIdx[D.months[m]] != null && arrIdx[D.months[m] - 100] != null; });
    var a1 = 0, a0 = 0; arrM.forEach(function (m) { a1 += D.arrivals.tot[arrIdx[D.months[m]]]; a0 += D.arrivals.tot[arrIdx[D.months[m] - 100]]; });
    w.hidden = false;
    // 두 자료가 모두 있는 같은 달끼리 비교 (입도 관광객 자료는 도착 수보다 한 달 짧음)
    var mm = function (ms) { var a = D.months[ms[0]] % 100, b = D.months[ms[ms.length - 1]] % 100; return a === b ? a + '월' : a + '~' + b + '월'; };
    var cmp;
    if (arrM.length) {
      var t1 = gSum(ALLG.tour, ALLG.groups, arrM), t0 = gSum(ALLG.tour, ALLG.groups, arrM, 12);
      cmp = '2026년 ' + mm(arrM) + ' 기준으로 제주 전체 관광객 도착 수는 전년 같은 달보다 ' + fmtS(t1 / t0 - 1) + ' 많지만, 같은 달 입도 관광객 수는 ' + fmtS(a1 / a0 - 1) + '입니다.';
    } else {
      cmp = '2026년 ' + mm(m26) + ' 제주 전체 관광객 도착 수는 전년 같은 달보다 ' + fmtS(all / allp - 1) + ' 많습니다(이 달은 입도 관광객 자료가 없어 비교할 수 없음).';
    }
    w.textContent = '2026년 비교 주의: ' + cmp + ' 차이의 원인은 확인되지 않았으니 2026년 증감률은 \'업종 증감 순위\'의 \'점유율 변화\'와 함께 보세요.';
  } else w.hidden = true;
}
// ---------- ③ 카드 속 미니 추세선 (선택 기간의 월별 흐름) ----------
function spark(id, vals, o) {
  var labels = A.range.map(function (m) { return ymL(D.months[m]); });
  var cap = $(id + 'c'), have = vals.filter(function (v) { return v != null && isFinite(v); });
  if (!have.length) { emptyChart(id, o.empty || '데이터 없음'); cap.innerHTML = ''; return; }
  var c = chart(id); c.clear(); c.resize();
  var a26 = o.mark26 ? area26(labels) : null;
  c.setOption({
    animation: false, grid: { left: 2, right: 6, top: 6, bottom: 4 },
    xAxis: { type: 'category', data: labels, show: false, boundaryGap: false },
    yAxis: { type: 'value', show: false, scale: !o.zero },
    tooltip: tip({
      trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: T.axis } }, confine: true,
      formatter: function (ps) { var v = ps[0].value; return '<b>' + ps[0].name + '</b><br>' + o.label + ' ' + (v == null ? '데이터 없음' : o.fmt(v)) + (o.mark26 && ps[0].name >= '2026' ? NOTE26 : ''); }
    }),
    series: [{
      type: 'line', data: vals.map(function (v) { return v == null || !isFinite(v) ? null : v; }), connectNulls: false,
      symbol: 'circle', symbolSize: 5, showSymbol: have.length <= 2, lineStyle: { width: 2, color: o.color }, itemStyle: { color: o.color },
      areaStyle: o.zero ? undefined : { color: o.color, opacity: 0.12 },
      markLine: o.zero ? { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: T.axis, type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] } : undefined,
      markArea: a26 ? { silent: true, itemStyle: { color: AREA26 }, label: { show: false }, data: [a26] } : undefined
    }]
  });
  var mn = Math.min.apply(null, have), mx = Math.max.apply(null, have);
  cap.innerHTML = '<div class="k-axis"><span>' + labels[0] + '</span><span>' + labels[labels.length - 1] + '</span></div><div>최저 ' + o.fmt(mn) + ' · 최고 ' + o.fmt(mx) + '</div>';
}
function renderSparks(bestG) {
  var sel = A.sel;
  spark('sp1', A.range.map(function (m) { return gSum(A.gMet, sel, [m]); }), { label: MET[st.metric], fmt: function (v) { return fmtN(v) + '건'; }, color: T.accent, mark26: true });
  spark('sp2', A.range.map(function (m) { if (m < 12) return null; var p = gSum(A.gMet, sel, [m], 12); return p >= MIN_BASE ? gSum(A.gMet, sel, [m]) / p - 1 : null; }),
    { label: '전년 같은 달 대비', fmt: fmtS, color: T['text-muted'], zero: true, empty: '전년 비교 불가', mark26: true });
  if (bestG == null) { emptyChart('sp3', '계산 불가'); $('sp3c').innerHTML = ''; }
  else spark('sp3', A.range.map(function (m) { var b = gSum(A.gMet, A.base, [m]); return b ? A.gMet[bestG * M + m] / b : null; }), { label: D.groups[bestG] + ' 점유율', fmt: function (v) { return fmtP(v); }, color: gColor(bestG) });
  spark('sp4', A.range.map(function (m) { var t = gSum(A.gT, sel, [m]), r = gSum(A.gR, sel, [m]); return t + r ? t / (t + r) : null; }), { label: '관광객 비중', fmt: function (v) { return fmtP(v); }, color: T.accent });
}

// ---------- 한눈에 보기: 월별 막대, 안내 카드, 하이라이트, TOP5 ----------
function renderOverview() {
  var sel = A.sel, x = A.range.map(function (m) { return ymL(D.months[m]); });
  var v = A.range.map(function (m) { return gSum(A.gMet, sel, [m]); });
  var maxI = 0; v.forEach(function (n, i) { if (n > v[maxI]) maxI = i; });
  var avg = v.reduce(function (a, b) { return a + b; }, 0) / (v.length || 1);
  $('moLabel').textContent = '월별 ' + MET[st.metric] + ' · ' + groupsLabel();
  $('moBig').innerHTML = fmtN(avg) + '<span class="unit" style="font-size:14px;color:var(--text-secondary);font-weight:500"> 건 / 월평균</span>';
  $('moSub').textContent = periodLabel() + ' · ' + regionLabel() + ' · 최고 ' + x[maxI] + ' ' + fmtN(v[maxI]) + '건';
  var c = chart('cMo'); c.clear(); c.resize();
  var a26 = area26(x);
  if (a26) $('moSub').textContent += ' · 주황 구간 = 2026년(수집 기준 확인 전)';
  c.setOption({
    animation: false, grid: { left: 8, right: 8, top: 44, bottom: 26, containLabel: false },
    aria: { enabled: true, decal: { show: true } },   // 2026년 막대 빗금
    tooltip: tip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(36,87,230,0.06)' } }, formatter: function (ps) { return '<b>' + ps[0].name + '</b><br>' + MET[st.metric] + ' ' + fmtN(ps[0].value) + '건' + (ps[0].name >= '2026' ? NOTE26 : ''); } }),
    xAxis: { type: 'category', data: x, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T['text-muted'], fontSize: 10.5, interval: Math.max(0, Math.ceil(x.length / (narrow() ? 6 : 12)) - 1), formatter: function (s) { return s.slice(2); } } },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'bar', barMaxWidth: 34, barCategoryGap: '28%',
      data: v.map(function (n, i) {
        var on = i === maxI, y26 = x[i] >= '2026';
        return { value: n, itemStyle: { color: on ? T.accent : T.grid, borderRadius: [8, 8, 8, 8],
            decal: y26 ? { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: -Math.PI / 4, color: on ? 'rgba(255,255,255,0.35)' : 'rgba(176,122,0,0.22)' } : { symbol: 'none' } },
          label: on ? { show: true, position: 'top', distance: 8, formatter: fmtN(n), color: T['surface-1'], backgroundColor: T['text-primary'], padding: [5, 9], borderRadius: 6, fontSize: 11, fontWeight: 'bold' } : { show: false } };
      }),
      emphasis: { itemStyle: { color: T.accent } },
      markArea: a26 ? { silent: true, itemStyle: { color: AREA26 }, label: { show: false }, data: [a26] } : undefined
    }]
  });
  // 안내 카드: 2026년 주의 문구가 있으면 그것을, 없으면 요약 안내
  var w = $('warn2026');
  if (!w.hidden) {
    $('promoBadge').textContent = '주의'; $('promoTitle').textContent = '2026년 증감률은 점유율과 함께 보세요';
    $('promoText').textContent = ''; $('promoBtn').textContent = '업종 증감 순위 보기'; $('promoBtn').setAttribute('href', '#change');
  } else {
    $('promoBadge').textContent = '요약'; $('promoTitle').textContent = '현재 필터 기준 분석 결과가 준비됐어요';
    $('promoText').textContent = '선택한 기간·지역·업종을 기준으로 자동으로 만든 요약 문장 ' + (OUT.summary || []).length + '개를 확인하세요.';
    $('promoBtn').textContent = '분석 요약 보기'; $('promoBtn').setAttribute('href', '#summary');
  }
  // 하이라이트: 분석 요약 문장
  var tags = ['업종 비중', '전년 대비', '계절·지역', '검색 관심도'];
  $('ovSum').innerHTML = (OUT.summary || []).map(function (s, i) {
    var na = s.indexOf('(보류) ') === 0;
    return '<li' + (na ? ' class="na"' : '') + '><span class="tl-dot">' + (i + 1) + '</span><span class="tl-tag">' + (tags[i] || '요약') + '</span>' + esc(na ? s.slice(5) : s) + '</li>';
  }).join('');
  // TOP5
  var top = (A.placesTop || []).slice(0, 5);
  var h = '<thead><tr><th>장소</th><th>읍면동</th><th>세부 업종</th><th class="n">' + MET[st.metric] + '</th><th class="n">전년 대비</th></tr></thead><tbody>';
  if (!top.length) h += '<tr><td colspan="5" class="muted">데이터 없음</td></tr>';
  top.forEach(function (o) { var p = o.p; h += '<tr><td><span class="dot" style="background:' + gColor(P.group[p]) + '"></span><b>' + esc(P.name[p]) + '</b></td><td>' + esc(D.dongs.name[P.dong[p]]) + '</td><td class="muted">' + esc(D.cats.name[P.cat[p]]) + '</td><td class="n">' + fmtN(o.v) + '</td><td class="n">' + placeYoyPill(o) + '</td></tr>'; });
  $('ovTop').innerHTML = h + '</tbody>';
  // 헤더 카드의 떠 있는 작은 카드 + 알림 배지
  $('hcK1').textContent = $('k1').textContent;
  $('hcK3').textContent = OUT.k3 ? OUT.k3.g + ' ' + fmtPP(OUT.k3.shareDiff) : '계산 불가';
  var lastM = A.range.slice(-12), last = v.slice(-12), lmax = Math.max.apply(null, last.concat([1]));
  $('hcBars').innerHTML = last.map(function (n, i) { var y26 = D.months[lastM[i]] >= 202601; return '<i style="height:' + Math.max(8, n / lmax * 100).toFixed(0) + '%" class="' + (n === lmax ? 'on' : '') + (y26 ? ' y26' : '') + '"' + (y26 ? ' title="2026년: 수집 기준 확인 전"' : '') + '></i>'; }).join('');
  // 지표 카드 배지 (증감률 배지는 참고용이라 달지 않음, 점유율 배지만)
  var b3 = $('k3b');
  if (OUT.k3) { b3.hidden = false; b3.className = 'k-badge ' + (OUT.k3.shareDiff >= 0 ? 'up' : 'down'); b3.textContent = fmtPP(OUT.k3.shareDiff); } else b3.hidden = true;
}
