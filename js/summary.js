// [분석 요약] 요약 문장, [지표 설명] 분류표·데이터 한계
'use strict';

// ---------- ⑩ 분석 결과 요약 ----------
function renderSummary() {
  var sel = A.sel, base = A.base, out = [], metric = MET[st.metric];
  // 1. 가장 큰 업종 (Q1)
  var sizes = sel.map(function (g) { return { g: g, v: gSum(A.gMet, [g], A.range) }; }).sort(function (a, b) { return b.v - a.v; });
  var bt = gSum(A.gMet, base, A.range), main = sizes[0];
  if (main && bt) {
    out.push(sel.length > 1 ? '선택 기간 ' + metric + '가 가장 많은 업종은 ' + josaRo(D.groups[main.g]) + ', 관광 업종 전체의 ' + fmtP(main.v / bt) + '(' + fmtN(main.v) + '건)를 차지합니다.'
      : josa(D.groups[main.g], '은', '는') + ' 선택 기간 관광 업종 ' + metric + '의 ' + fmtP(main.v / bt) + '(' + fmtN(main.v) + '건)를 차지합니다.');
  } else out.push({ na: '선택 조건에 데이터가 없습니다.' });
  // 2. 증감 (Q2)
  if (!A.yoy.length) out.push({ na: '전년 같은 달 데이터가 없어 증감은 계산할 수 없습니다.' });
  else {
    var gr = sel.map(function (g) { var r = groupGrowth(g); r.g = g; return r; }).filter(function (r) { return r.growth != null; });
    var has26 = A.yoy.some(function (m) { return D.months[m] >= 202601; });
    // 2026년 처리 방침: 점유율 변화를 먼저 말하고, 증감률은 참고로
    var tail = ' 도착 수의 규모 변화는 입도 관광객과 방향이 달라(원인 미확인) 증감률은 참고로만 보세요.';
    if (!gr.length) out.push({ na: '전년 값이 1,000 이상인 업종이 없어 증감은 판단하지 않습니다(표본 적음).' });
    else if (gr.length === 1) out.push('전년 같은 달과 비교하면(' + A.yoy.length + '개월) ' + D.groups[gr[0].g] + '의 점유율은 ' + fmtP(gr[0].sharePrev) + '에서 ' + fmtP(gr[0].shareCur) + '로 ' + fmtPP(gr[0].shareDiff) + ' 변했습니다(증감률 ' + fmtS(gr[0].growth) + ').' + tail);
    else {
      var shHi = gr.reduce(function (a, b) { return b.shareDiff > a.shareDiff ? b : a; }), shLo = gr.reduce(function (a, b) { return b.shareDiff < a.shareDiff ? b : a; });
      var s1 = shHi.shareDiff < 0.0005 && shLo.shareDiff > -0.0005
        ? '전년 같은 달과 비교하면(' + A.yoy.length + '개월) 업종별 점유율 변화가 모두 0.1%p 미만으로 구성에 큰 차이가 없었습니다.'
        : '전년 같은 달과 비교하면(' + A.yoy.length + '개월) 점유율이 가장 많이 오른 업종은 ' + D.groups[shHi.g] + '(' + fmtPP(shHi.shareDiff) + '), 가장 많이 내린 업종은 ' + D.groups[shLo.g] + '(' + fmtPP(shLo.shareDiff) + ')입니다.';
      out.push(s1 + tail);
    }
  }
  // 3. 계절 + 지역 (Q3, Q4): 가장 큰 업종 기준
  if (main) {
    var se = (OUT.seasonRes || []).filter(function (r) { return r.g === main.g; })[0];
    var calMonths = {}; A.range.forEach(function (m) { calMonths[D.months[m] % 100] = 1; });
    var lqs = lqOfGroup(main.g), parts = [];
    if (se && se.hi && Object.keys(calMonths).length >= 3) parts.push('성수기는 ' + (se.hi.k + 1) + '월(계절성 지수 ' + se.hi.x.toFixed(0) + '), 비수기는 ' + (se.lo.k + 1) + '월(' + se.lo.x.toFixed(0) + ')');
    if (st.region.indexOf('dong:') === 0) {
      var dd = +st.region.slice(5), me = lqs.filter(function (r) { return r.d === dd; })[0];
      parts.push(D.dongs.name[dd] + ' 특화지수는 ' + (me ? me.lq.toFixed(2) + '(' + (me.lq >= 1.1 ? '제주 평균보다 몰림' : me.lq <= 0.9 ? '제주 평균보다 적음' : '제주 평균과 비슷') + ')' : '표본 적음'));
    } else {
      var pool = st.region.indexOf('sgg:') === 0 ? lqs.filter(function (r) { return D.dongs.sgg[r.d] === st.region.slice(4); }) : lqs;
      if (pool[0]) parts.push((st.region === 'all' ? '' : st.region.slice(4) + ' 안에서 ') + '상대적으로 몰린 지역은 ' + D.dongs.name[pool[0].d] + '(특화지수 ' + pool[0].lq.toFixed(2) + ')');
    }
    var noSeason = parts.length && parts[0].indexOf('성수기') !== 0;
    out.push(!parts.length ? { na: '계절성·지역 특화는 표본이 적어 판단하지 않습니다.' }
      : noSeason ? (parts[0].indexOf('상대적으로') >= 0 ? josa(D.groups[main.g], '이', '가') + ' ' + parts[0].replace('상대적으로 몰린 지역은', '상대적으로 몰린 지역은') + '입니다. (성수기·비수기는 3개월 이상 선택하면 표시)' : D.groups[main.g] + '의 ' + parts[0] + '입니다. (성수기·비수기는 3개월 이상 선택하면 표시)')
        : D.groups[main.g] + '의 ' + parts.join('이고, ') + '입니다.');
  }
  // 5. 검색 (Q6)
  if (OUT.searchR != null) {
    var r = OUT.searchR, word = r >= 0.7 ? '비슷하게 움직였습니다' : r >= 0.3 ? '어느 정도 같은 방향으로 움직였습니다' : r > -0.3 ? '뚜렷한 관계가 없었습니다' : '반대로 움직이는 경향이 있었습니다';
    out.push('「' + OUT.searchTab + '」 검색 관심도와 ' + OUT.searchLink + ' 도착 흐름은 ' + word + '(월별 상관계수 ' + r.toFixed(2) + ', ' + OUT.searchN + '개월).');
  } else out.push({ na: '검색 관심도와 도착 흐름은 비교할 달이 부족해 판단하지 않습니다(\'검색 관심도 vs 실제 도착\' 참고).' });
  $('sum').innerHTML = out.map(function (s) { return typeof s === 'string' ? '<li>' + esc(s) + '</li>' : '<li class="na">' + esc(s.na) + '</li>'; }).join('');
  OUT.summary = out.map(function (s) { return typeof s === 'string' ? s : '(보류) ' + s.na; });
}

// ---------- ⑪ 설명 · 분류표 ----------
function renderMapTable() {
  var q = ($('mapSearch').value || '').trim();
  var tot = {}; for (var i = 0; i < NCELL; i++) { var c = CUBE.c[i]; tot[c] = (tot[c] || 0) + CUBE.tour[i]; }
  var rows = D.cats.name.map(function (n, c) { return { c: c, n: n, g: D.groups[CG[c]], t: tot[c] || 0 }; })
    .filter(function (r) { return !q || r.n.indexOf(q) >= 0 || r.g.indexOf(q) >= 0; }).sort(function (a, b) { return b.t - a.t; });
  var h = '<thead><tr><th>카테고리 3단계</th><th>대분류</th><th class="n">관광객 도착 수</th><th>비고</th></tr></thead><tbody>';
  rows.forEach(function (r) { h += '<tr><td>' + (D.cats.hold[r.c] ? '⚑ ' : '') + esc(r.n) + '</td><td><span class="dot" style="background:' + (CG[r.c] < 8 ? gColor(CG[r.c]) : T.s9) + '"></span>' + esc(r.g) + '</td><td class="n">' + fmtN(r.t) + '</td><td class="muted">' + esc(D.cats.note[r.c] || '') + '</td></tr>'; });
  $('mapTable').innerHTML = h + '</tbody>';
  var cnt = {}; CG.forEach(function (g) { cnt[g] = (cnt[g] || 0) + 1; });
  $('mapCount').textContent = '(' + NC + '종: ' + D.groups.map(function (g, i) { return g + ' ' + (cnt[i] || 0); }).join(' · ') + ', 판단 보류 ' + D.cats.hold.filter(function (x) { return x; }).length + ')';
}
// 데이터 한계: 2026년 도착 수와 입도 관광객 증가폭 (필터와 관계없이 제주 전체·전 업종, 두 자료가 모두 있는 달만 비교)
function lim2026() {
  var m26 = []; for (var m = 12; m < M; m++) if (D.months[m] >= 202601) m26.push(m);
  var a = gSum(ALLG.tour, ALLG.groups, m26), b = gSum(ALLG.tour, ALLG.groups, m26, 12);
  var both = m26.filter(function (m) { return arrIdx[D.months[m]] != null && arrIdx[D.months[m] - 100] != null; });
  var x1 = 0, x0 = 0, t1 = 0, t0 = 0;
  both.forEach(function (m) { x1 += D.arrivals.tot[arrIdx[D.months[m]]]; x0 += D.arrivals.tot[arrIdx[D.months[m] - 100]]; t1 += gSum(ALLG.tour, ALLG.groups, [m]); t0 += gSum(ALLG.tour, ALLG.groups, [m], 12); });
  var f = function (ms) { return (D.months[ms[0]] % 100) + '~' + (D.months[ms[ms.length - 1]] % 100) + '월'; };
  return '2026년 ' + f(m26) + ' 관광객 도착 수는 전년 같은 달보다 ' + fmtS(a / b - 1) + ' 많습니다. 입도 관광객 자료는 ' + ymL(D.arrivals.ym[D.arrivals.ym.length - 1]) + '까지만 있어, 두 자료가 모두 있는 2026년 ' + f(both)
    + '로 비교하면 도착 수 ' + fmtS(t1 / t0 - 1) + ', 입도 관광객 수 ' + fmtS(x1 / x0 - 1) + '입니다. 차이의 원인이 확인되지 않아 2026년이 들어간 증감률은 점유율 변화와 함께 봐야 합니다.';
}
function renderStatic() {
  $('limits').innerHTML = [
    '인기 장소 데이터는 장소별 도착 수입니다. 수집 방식은 원자료에 설명이 없어 확인되지 않았으며, 매출·이용 인원과는 다른 값입니다.',
    lim2026(),
    '관광객·도민 구분 기준은 원자료에 설명이 없어 확인되지 않았습니다.',
    '도착건수 ≠ 관광객+도민 인 행이 ' + fmtN(D.totals.mismatchRows) + '개(전체 ' + fmtN(D.totals.rows) + '행) 있습니다. 삭제하지 않고 그대로 합산했습니다.',
    '검색 \'수치\'는 정의가 확인되지 않은 관심도 지표이며, 같은 월·장소가 여러 행으로 반복되는 값을 그대로 합산했습니다. 읍면동 구분이 없어 시 단위로만 나눕니다.',
    '도착 수, 입도 관광객 수, 방문객 수는 집계 기준이 달라 서로 더하거나 나누지 않습니다(입도 관광객은 \'검색 관심도 vs 실제 도착\' 차트의 참고선으로만 사용).',
    '업종 대분류는 카테고리 3단계를 규칙으로 묶은 것입니다. 판단이 애매했던 31종은 2026-11-04에 기준(기반시설은 비관광, 관광객 비중 50% 이상이면 관광 업종)에 따라 검토했고, 근거는 업종 분류표의 비고에 있습니다.',
    '연령 정보가 없어 모든 결과는 전체 관광객 기준입니다.'
  ].map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  $('buildLog').textContent = D.buildLog;
  renderMapTable();
}
