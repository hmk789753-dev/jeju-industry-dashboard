// [업종 변화] 업종 구성(도넛) + 연도별 점유율, 업종 증감 순위
'use strict';

// ---------- ④ 업종 구성(도넛) + 연도별 점유율(막대) ----------
function renderShare() {
  var sel = A.sel, base = A.base, bt = gSum(A.gMet, base, A.range);
  // 선택 기간 안의 연도별 달 목록 (2026은 데이터가 있는 달까지)
  var years = [], ym = {};
  A.range.forEach(function (m) { var y = Math.floor(D.months[m] / 100); if (!ym[y]) { ym[y] = []; years.push(y); } ym[y].push(m); });
  var yLabel = function (y) { var ms = ym[y]; return ms.length === 12 ? y + '년' : y + '년(' + (D.months[ms[0]] % 100) + '~' + (D.months[ms[ms.length - 1]] % 100) + '월)'; };
  var yTot = years.map(function (y) { return gSum(A.gMet, base, ym[y]); });
  $('s4').textContent = periodLabel() + ' · ' + regionLabel() + ' · ' + MET[st.metric] + ' 기준, 관광 업종 안에서 각 업종이 차지하는 비중. 흐린 업종은 필터에서 빠진 업종이고, 도넛 조각이나 막대를 누르면 그 업종만 선택됩니다.';
  if (!bt) { emptyChart('c4', '데이터 없음'); emptyChart('c4b', '데이터 없음'); $('t4').innerHTML = ''; OUT.share = []; return; }

  // 도넛: 큰 업종부터 시계 방향
  var order = base.slice().sort(function (a, b) { return gSum(A.gMet, [b], A.range) - gSum(A.gMet, [a], A.range); });
  var c = chart('c4'); c.clear();
  c.setOption({
    animation: false,
    tooltip: tip({ trigger: 'item', formatter: function (p) { var g = p.data._g; return '<b>' + D.groups[g] + '</b><br>' + MET[st.metric] + ' ' + fmtN(p.value) + '건<br>관광 업종 중 ' + fmtP(p.value / bt) + '<br><span style="color:' + T['text-muted'] + '">' + periodLabel() + '</span>'; } }),
    title: { text: '합계', subtext: fmtN(bt) + '건', left: '55%', top: '41%', textAlign: 'center', itemGap: 2,
      textStyle: { color: T['text-secondary'], fontSize: 12, fontWeight: 'normal' }, subtextStyle: { color: T['text-primary'], fontSize: 13, fontWeight: 600 } },
    series: [{
      type: 'pie', radius: narrow() ? ['34%', '52%'] : ['38%', '57%'], center: ['55%', narrow() ? '50%' : '48%'], startAngle: 90, minAngle: 2, avoidLabelOverlap: true,
      itemStyle: { borderColor: T['surface-1'], borderWidth: 2, borderRadius: 3 },
      label: { color: T['text-secondary'], fontSize: 11, overflow: 'none', formatter: function (p) { return p.percent >= 3 ? D.groups[p.data._g] + '\n' + (p.value / bt * 100).toFixed(1) + '%' : ''; } },
      labelLine: { length: 6, length2: 6, lineStyle: { color: T.axis } },
      emphasis: { scale: true, scaleSize: 4 },
      data: order.map(function (g) {
        var on = sel.indexOf(g) >= 0;
        return { name: D.groups[g], value: gSum(A.gMet, [g], A.range), _g: g, itemStyle: { color: gColor(g), opacity: on ? 1 : 0.25 }, labelLine: { show: (gSum(A.gMet, [g], A.range) / bt) >= 0.03 } };
      })
    }]
  });
  c.off('click'); c.on('click', function (p) { if (p.data) focusGroup(p.data._g); });

  // 연도별 점유율 막대: 업종(세로축) x 연도(색 = 파랑 단계, 연한 → 진한 = 과거 → 최근)
  var yColor = function (i) { var steps = ['seq-3', 'seq-5', 'seq-7']; return T[steps[Math.max(0, steps.length - years.length + i)]]; };
  $('h4b').textContent = years.length > 1 ? '연도별 점유율 (' + years.map(yLabel).join(' / ') + ')' : yLabel(years[0]) + ' 점유율';
  var cats = order.slice().reverse(); // 가로 막대는 아래에서 위로 그려지므로 뒤집어서 큰 업종이 위로
  var c2 = chart('c4b'); c2.clear();
  c2.setOption({
    animation: false,
    grid: { left: 84, right: 44, top: 30, bottom: 22 },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 10, icon: 'roundRect', selectedMode: false, textStyle: { color: T['text-secondary'], fontSize: 11 } },
    tooltip: tip({
      trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(128,128,128,0.08)' } }, formatter: function (ps) {
        var g = cats[ps[0].dataIndex], h = '<b>' + D.groups[g] + '</b> 점유율<br>';
        ps.forEach(function (p) { var i = p.seriesIndex, y = years[i]; h += p.marker + yLabel(y) + ' ' + fmtP(yTot[i] ? gSum(A.gMet, [g], ym[y]) / yTot[i] : NaN) + ' (' + fmtN(gSum(A.gMet, [g], ym[y])) + '건)<br>'; });
        return h;
      }
    }),
    xAxis: axisStyle({ type: 'value', axisLabel: { formatter: '{value}%' } }),
    yAxis: axisStyle({
      type: 'category', data: cats.map(function (g) { return D.groups[g]; }), splitLine: { show: false },
      axisLabel: { fontSize: 12, formatter: function (v) { var g = D.groups.indexOf(v); return sel.indexOf(g) >= 0 ? '{b|' + v + '}' : '{n|' + v + '}'; }, rich: { b: { fontWeight: 'bold', color: T['text-primary'] }, n: { color: T['text-muted'] } } }
    }),
    series: years.map(function (y, i) {
      return {
        name: yLabel(y), type: 'bar', barGap: '15%', barCategoryGap: '30%', barMaxWidth: 10,
        itemStyle: { color: yColor(i) },
        data: cats.map(function (g) { var v = yTot[i] ? gSum(A.gMet, [g], ym[y]) / yTot[i] * 100 : null; return { value: v == null ? null : +v.toFixed(2), itemStyle: { opacity: sel.indexOf(g) >= 0 ? 1 : 0.3, borderRadius: [0, 3, 3, 0] } }; }),
        label: { show: i === years.length - 1, position: 'right', fontSize: 10, color: T['text-secondary'], formatter: function (p) { return p.value == null ? '' : p.value.toFixed(1) + '%'; } }
      };
    })
  });
  c2.off('click'); c2.on('click', function (p) { focusGroup(cats[p.dataIndex]); });

  var head = ['업종', '선택 기간 비중', '선택 기간(건)'].concat(years.map(function (y) { return yLabel(y) + ' 비중'; }));
  $('t4').innerHTML = tableHtml(head, order.map(function (g) { var v = gSum(A.gMet, [g], A.range); return [D.groups[g], fmtP(v / bt), fmtN(v)].concat(years.map(function (y, i) { return yTot[i] ? fmtP(gSum(A.gMet, [g], ym[y]) / yTot[i]) : '-'; })); }), head.map(function (_, i) { return i; }).slice(1));
  OUT.share = sel.map(function (g) { return D.groups[g] + ' ' + fmtP(gSum(A.gMet, [g], A.range) / bt); });
  OUT.shareYears = order.map(function (g) { return D.groups[g] + ' ' + years.map(function (y, i) { return fmtP(gSum(A.gMet, [g], ym[y]) / yTot[i]); }).join('/'); });
}

// ---------- ⑤ 업종 증감 순위 ----------
function renderGrowth() {
  var mode = st.growthMode, base = A.base, sel = A.sel;
  if (!A.yoy.length) {
    $('s5').textContent = '전년 같은 달과 비교합니다.';
    emptyChart('c5', '계산 불가 - 선택 기간에 전년 같은 달 데이터가 없습니다');
    $('r5up').innerHTML = $('r5down').innerHTML = '<li class="empty">계산 불가</li>';
    $('n5').textContent = '데이터가 2024.01부터 있어 2024년만 선택하면 전년 비교를 할 수 없습니다.'; $('t5').innerHTML = '';
    OUT.growth = '계산 불가'; OUT.up = []; OUT.down = []; return;
  }
  $('s5').textContent = yoyDesc() + ' · ' + regionLabel() + ' · ' + MET[st.metric] + '. ' + (mode === 'yoy' ? '증감률 = 올해 ÷ 전년 − 1' : '점유율 변화 = 올해 점유율 − 전년 점유율(%p)') + '. 막대를 누르면 그 업종만 선택됩니다.';
  var rows = base.map(function (g) { var r = groupGrowth(g); r.g = g; r.v = mode === 'yoy' ? r.growth : r.shareDiff; return r; });
  var valid = rows.filter(function (r) { return r.v != null && isFinite(r.v); }).sort(function (a, b) { return a.v - b.v; });
  var na = rows.filter(function (r) { return !(r.v != null && isFinite(r.v)); });
  var c = chart('c5'); c.clear();
  c.setOption({
    animation: false,
    grid: { left: 84, right: 56, top: 8, bottom: 22 },
    tooltip: tip({
      trigger: 'item', formatter: function (p) {
        var r = valid[p.dataIndex];
        return '<b>' + D.groups[r.g] + '</b><br>전년 ' + fmtN(r.prev) + '건 → 올해 ' + fmtN(r.cur) + '건<br>증감률 ' + fmtS(r.growth) + '<br>점유율 ' + fmtP(r.sharePrev) + ' → ' + fmtP(r.shareCur) + ' (' + fmtPP(r.shareDiff) + ')<br><span style="color:' + T['text-muted'] + '">' + yoyDesc() + '</span>';
      }
    }),
    xAxis: axisStyle({ type: 'value', splitNumber: narrow() ? 3 : 5, axisLabel: { formatter: function (v) { var n = Math.round(v * 1000) / 10; return (mode === 'yoy' ? n.toFixed(0) + '%' : n.toFixed(1) + '%p').replace(/^-0(\.0)?(%p?)$/, '0$1$2'); } } }),
    yAxis: axisStyle({
      type: 'category', data: valid.map(function (r) { return D.groups[r.g]; }), splitLine: { show: false },
      axisLabel: { color: T['text-secondary'], fontSize: 12, formatter: function (v) { var g = D.groups.indexOf(v); return sel.indexOf(g) >= 0 ? '{b|' + v + '}' : '{n|' + v + '}'; }, rich: { b: { fontWeight: 'bold', color: T['text-primary'] }, n: { color: T['text-muted'] } } }
    }),
    series: [{
      type: 'bar', barMaxWidth: 16,
      data: valid.map(function (r) { var on = sel.indexOf(r.g) >= 0; return { value: r.v, itemStyle: { color: r.v >= 0 ? T.up : T.down, opacity: on ? 1 : 0.35, borderRadius: r.v >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } }; }),
      label: { show: true, position: 'right', color: T['text-secondary'], fontSize: 11, formatter: function (p) { return mode === 'yoy' ? fmtS(p.value) : fmtPP(p.value); } }
    }]
  });
  c.off('click'); c.on('click', function (p) { focusGroup(valid[p.dataIndex].g); });
  // 세부 업종 TOP10
  var bc = gSum(A.gMet, base, A.yoy), bp = gSum(A.gMet, base, A.yoy, 12);
  var cats = [], small = 0;
  for (var ci = 0; ci < NC; ci++) {
    if (sel.indexOf(CG[ci]) < 0) continue;
    var cur = cSum(A.cMet, ci, A.yoy), prev = cSum(A.cMet, ci, A.yoy, 12);
    if (prev < MIN_BASE) { if (cur + prev > 0) small++; continue; }
    cats.push({ c: ci, cur: cur, prev: prev, growth: cur / prev - 1, diff: cur / bc - prev / bp });
  }
  var key = mode === 'yoy' ? 'growth' : 'diff', f = mode === 'yoy' ? fmtS : fmtPP;
  var up = cats.filter(function (x) { return x[key] > 0; }).sort(function (a, b) { return b[key] - a[key]; }).slice(0, 10);
  var down = cats.filter(function (x) { return x[key] < 0; }).sort(function (a, b) { return a[key] - b[key]; }).slice(0, 10);
  function li(x) { return '<li title="' + esc(D.cats.name[x.c] + ': 전년 ' + fmtN(x.prev) + '건 → 올해 ' + fmtN(x.cur) + '건') + '"><span class="r"><span class="nm"><span class="dot" style="background:' + gColor(CG[x.c]) + '"></span>' + esc(D.cats.name[x.c]) + '</span><span class="v">' + f(x[key]) + '</span></span></li>'; }
  $('r5up').innerHTML = up.length ? up.map(li).join('') : '<li class="empty">늘어난 세부 업종 없음</li>';
  $('r5down').innerHTML = down.length ? down.map(li).join('') : '<li class="empty">줄어든 세부 업종 없음</li>';
  $('n5').textContent = '세부 업종은 선택한 대분류 안에서만 비교합니다. 전년 값 1,000 미만인 세부 업종 ' + small + '개는 표본 적음으로 제외했습니다.' + (na.length ? ' 표본 적음(대분류): ' + na.map(function (r) { return D.groups[r.g]; }).join(', ') + '.' : '');
  $('t5').innerHTML = tableHtml(['업종', '전년(건)', '올해(건)', '증감률', '전년 점유율', '올해 점유율', '점유율 변화'],
    rows.map(function (r) { return [D.groups[r.g], fmtN(r.prev), fmtN(r.cur), r.growth != null ? fmtS(r.growth) : (r.na || '-'), fmtP(r.sharePrev), fmtP(r.shareCur), fmtPP(r.shareDiff)]; }), [1, 2, 3, 4, 5, 6]);
  OUT.growth = valid.slice().reverse().map(function (r) { return D.groups[r.g] + ' ' + (mode === 'yoy' ? fmtS(r.v) : fmtPP(r.v)); });
  OUT.groupRows = rows; OUT.up = up.map(function (x) { return D.cats.name[x.c] + ' ' + f(x[key]); }); OUT.down = down.map(function (x) { return D.cats.name[x.c] + ' ' + f(x[key]); });
}
