// [검색·인기 장소] 검색 관심도 vs 실제 도착
'use strict';

// ---------- ⑧ 검색 관심도 vs 실제 도착 ----------
var sIdx = {}; S.months.forEach(function (ym, i) { sIdx[ym] = i; });
function renderSearch() {
  var tab = S.cats[st.searchTab], link = SEARCH_LINK[tab], sgg = regionSgg();
  var x = A.range.map(function (m) { return ymL(D.months[m]); });
  var sv = A.range.map(function (m) {
    var i = sIdx[D.months[m]]; if (i == null) return null;
    var c = st.searchTab, t = 0;
    S.sgg.forEach(function (sg, si) { if (!sgg || sg === sgg) t += S.v[c][si][i]; });
    return t;
  });
  var av = link.length ? A.range.map(function (m) { return gSum(A.gMet, link, [m]); }) : null;
  var iv = A.range.map(function (m) { var i = arrIdx[D.months[m]]; return i == null ? null : D.arrivals.tot[i]; });
  function index(arr) {
    if (!arr) return null;
    var b = null; for (var i = 0; i < arr.length; i++) if (arr[i] != null) { b = arr[i]; break; }
    if (!b) return arr.map(function () { return null; });
    return arr.map(function (v) { return v == null ? null : +(v / b * 100).toFixed(1); });
  }
  var si = index(sv), ai = index(av), ii = index(iv);
  var baseM = (function () { for (var i = 0; i < sv.length; i++) if (sv[i] != null) return x[i]; return null; })();
  var linkTxt = link.length ? link.map(function (g) { return D.groups[g]; }).join('+') : '연결 업종 없음';
  $('s9').textContent = '검색 분류 「' + tab + '」 ↔ 도착 업종 ' + linkTxt + ' · 각 선은 ' + (baseM ? baseM : '첫 달') + ' = 100인 지수입니다. 검색은 ' + (sgg ? sgg : '제주 전체') + ' 기준' + (st.region.indexOf('dong:') === 0 ? '(검색 데이터는 읍면동 구분이 없어 시 단위)' : '') + ', 도착은 ' + regionLabel() + ' · ' + MET[st.metric] + ' 기준.';
  if (si.every(function (v) { return v == null; })) {
    emptyChart('c9', '데이터 없음 - 검색어 데이터는 ' + ymL(S.months[S.months.length - 1]) + '까지 있습니다');
    $('n9').textContent = ''; $('t9').innerHTML = ''; OUT.search = '데이터 없음'; OUT.searchR = null; return;
  }
  // 검색 수치가 높은 수준으로 '계속' 올라선 첫 달 (원인 미확인):
  // 그 달 값이 직전 6개월 평균의 1.5배 이상이고, 그 달부터 3개월 평균도 직전 6개월 평균의 1.6배 이상
  var surge = -1, surgeRatio = 0;
  var avgOf = function (arr) { var v = arr.filter(function (z) { return z != null; }); return v.length === arr.length && v.length ? v.reduce(function (p, q) { return p + q; }, 0) / v.length : null; };
  for (var sj = 6; sj + 2 < si.length; sj++) {
    var pre = avgOf(si.slice(sj - 6, sj)), post = avgOf(si.slice(sj, sj + 3));
    if (pre && post && si[sj] >= pre * 1.5 && post >= pre * 1.6) { surge = sj; surgeRatio = post / pre; break; }
  }
  var series = [{ name: '검색 관심도(' + tab + ')', type: 'line', data: si, connectNulls: false, symbol: 'circle', symbolSize: 4, showSymbol: false, lineStyle: { width: 2, color: T.s2 }, itemStyle: { color: T.s2 },
    markArea: surge >= 0 ? { silent: true, itemStyle: { color: AREA26 }, label: { show: true, position: 'insideTopLeft', formatter: x[surge] + '~ 검색 수치 급등 구간 (원인 미확인)', color: '#9a6a00', fontSize: 11, fontWeight: 'bold' }, data: [[{ xAxis: x[surge] }, { xAxis: x[x.length - 1] }]] } : undefined }];
  if (ai) series.push({ name: '실제 도착(' + linkTxt + ')', type: 'line', data: ai, connectNulls: false, symbol: 'circle', symbolSize: 4, showSymbol: false, lineStyle: { width: 2, color: T.s1 }, itemStyle: { color: T.s1 } });
  series.push({ name: '입도 관광객(참고)', type: 'line', data: ii, connectNulls: false, symbol: 'none', lineStyle: { width: 1.5, type: 'dashed', color: T['text-muted'] }, itemStyle: { color: T['text-muted'] } });
  var c = chart('c9'); c.clear();
  c.setOption({
    animation: false,
    grid: { left: 40, right: 12, top: narrow() ? 66 : 34, bottom: 28 },
    legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: T['text-secondary'], fontSize: 11 } },
    tooltip: tip({
      trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: T.axis } }, formatter: function (ps) {
        var j = ps[0].dataIndex, h = '<b>' + x[j] + '</b><br>';
        ps.forEach(function (p) { h += p.marker + p.seriesName + ' ' + (p.value == null ? '데이터 없음' : p.value) + '<br>'; });
        h += '<span style="color:' + T['text-muted'] + '">원값: 검색 수치 ' + fmtN(sv[j]) + (av ? ' · 도착 ' + fmtN(av[j]) + '건' : '') + ' · 입도 ' + fmtN(iv[j]) + '명</span>';
        return h;
      }
    }),
    xAxis: axisStyle({ type: 'category', data: x, boundaryGap: false, axisLabel: { interval: Math.max(0, Math.ceil(x.length / (narrow() ? 5 : 9)) - 1) } }),
    yAxis: axisStyle({ type: 'value', scale: true }),
    series: series
  });
  var r = null, n = 0;
  if (ai) {
    var xs = [], ys = []; for (var i = 0; i < si.length; i++) if (si[i] != null && ai[i] != null) { xs.push(si[i]); ys.push(ai[i]); }
    n = xs.length;
    if (n >= 6) { var mx = xs.reduce(function (a, b) { return a + b; }) / n, my = ys.reduce(function (a, b) { return a + b; }) / n, sxy = 0, sxx = 0, syy = 0; for (var k = 0; k < n; k++) { sxy += (xs[k] - mx) * (ys[k] - my); sxx += (xs[k] - mx) * (xs[k] - mx); syy += (ys[k] - my) * (ys[k] - my); } r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; }
  }
  $('n9').textContent = (ai ? (r != null ? '두 지수의 월별 상관계수 ' + r.toFixed(2) + ' (' + n + '개월). ' : '비교할 달이 6개월 미만이라 상관계수를 계산하지 않습니다. ') : '「축제/행사」는 연결된 도착 업종이 없어 검색 흐름만 보여 줍니다. ') + '검색 데이터는 ' + ymL(S.months[S.months.length - 1]) + '까지라 그 뒤는 선이 끊깁니다. 검색 \'수치\'의 정의는 확인되지 않았습니다.' + (surge >= 0 ? ' ' + x[surge] + '부터 검색 지수가 직전 6개월 평균의 약 ' + surgeRatio.toFixed(1) + '배 수준으로 올라섰는데 원인이 확인되지 않아, 그 뒤 구간과 상관계수는 신중하게 보세요.' : '');
  OUT.searchSurge = surge >= 0 ? x[surge] : null;
  $('t9').innerHTML = tableHtml(['월', '검색 수치', '검색 지수', '도착(건)', '도착 지수', '입도(명)', '입도 지수'], A.range.map(function (m, j) { return [x[j], sv[j] == null ? '데이터 없음' : fmtN(sv[j]), si[j] == null ? '-' : si[j], av ? fmtN(av[j]) : '-', ai && ai[j] != null ? ai[j] : '-', iv[j] == null ? '데이터 없음' : fmtN(iv[j]), ii[j] == null ? '-' : ii[j]]; }), [1, 2, 3, 4, 5, 6]);
  OUT.search = tab + ' r=' + (r == null ? '-' : r.toFixed(3)) + ' n=' + n; OUT.searchR = r; OUT.searchN = n; OUT.searchTab = tab; OUT.searchLink = linkTxt;
}
