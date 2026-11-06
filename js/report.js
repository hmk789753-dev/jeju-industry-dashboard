// 보고서 다운로드: 전체 보고서 / 요약 1장 (HTML 또는 인쇄로 PDF)
'use strict';

// ---------- 보고서 다운로드 ----------
// 고른 기간으로 잠깐 다시 계산·렌더링 → 차트 이미지와 표를 한 HTML에 담음 → 원래 화면으로 복원
var rp = { a: 0, b: M - 1 };
function initReport() {
  var opts = D.months.map(function (ym, i) { return '<option value="' + i + '">' + ymL(ym) + '</option>'; }).join('');
  $('rpStart').innerHTML = opts; $('rpEnd').innerHTML = opts;
  $('rpOpen').onclick = openReport;
  $('rpClose').onclick = $('rpCancel').onclick = closeReport;
  $('rpModal').onclick = function (e) { if (e.target === this) closeReport(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('rpModal').hidden) closeReport(); });
  $('rpQuick').onclick = function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var q = b.getAttribute('data-q'), r = q === 'cur' ? [st.start, st.end] : quickRange(q);
    rp.a = r[0]; rp.b = r[1]; syncReport();
  };
  $('rpStart').onchange = function () { rp.a = +this.value; syncReport(); };
  $('rpEnd').onchange = function () { rp.b = +this.value; syncReport(); };
  $('rpGo').onclick = runReport;
  $('noSelAll').onclick = function () { st.groups = baseGroups(); update(); };
}
function openReport() {
  if (!selGroups().length) { toast('선택된 업종이 없습니다. 업종을 하나 이상 고른 뒤 보고서를 받아 주세요.'); return; }
  rp.a = st.start; rp.b = st.end; $('rpModal').hidden = false; syncReport(); $('rpGo').focus();
}
function closeReport() { $('rpModal').hidden = true; $('rpOpen').focus(); }
function syncReport() {
  [$('rpStart'), $('rpEnd')].forEach(function (s) { Array.prototype.forEach.call(s.options, function (o) { o.disabled = st.no26 && +o.value > LAST25; }); });
  $('rpStart').value = rp.a; $('rpEnd').value = rp.b;
  document.querySelectorAll('#rpQuick button').forEach(function (b) {
    var q = b.getAttribute('data-q'), r = q === 'cur' ? [st.start, st.end] : quickRange(q);
    b.disabled = q === '2026' && st.no26; b.classList.toggle('on', r[0] === rp.a && r[1] === rp.b);
  });
  var ok = rp.a <= rp.b, n = rp.b - rp.a + 1;
  $('rpRangeNote').className = 'rp-note' + (ok ? '' : ' err');
  $('rpRangeNote').textContent = ok ? ymL(D.months[rp.a]) + ' ~ ' + ymL(D.months[rp.b]) + ' · ' + n + '개월' : '시작 월이 끝 월보다 늦습니다. 기간을 다시 골라 주세요.';
  $('rpGo').disabled = !ok;
  $('rpFilters').innerHTML = '지역 <b>' + esc(regionLabel()) + '</b> · 업종 <b>' + esc(groupsLabel()) + '</b> · 지표 <b>' + MET[st.metric] + '</b>' + (st.no26 ? ' · <b>2026년 제외</b>' : '');
}
function reportFileName(a, b, kind) { return '제주_업종별_관광트렌드_' + (kind === 'summary' ? '요약_' : '보고서_') + ymL(D.months[a]) + '-' + ymL(D.months[b]) + '.html'; }
function makeReport(a, b, kind) {
  var saved = JSON.parse(JSON.stringify(st)), root = document.documentElement, prevTheme = root.getAttribute('data-theme');
  root.setAttribute('data-theme', 'light'); readTheme();   // 보고서는 항상 밝은 배경
  st.start = a; st.end = b; update();
  var html = kind === 'summary' ? buildSummaryHtml() : buildReportHtml();
  st = JSON.parse(JSON.stringify(saved));
  if (prevTheme == null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', prevTheme);
  readTheme(); update();
  return html;
}
function buildReportHtml() {
  var img = function (id) { var c = charts[id]; return c ? '<img src="' + c.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }) + '" alt="">' : ''; };
  // 보고서에서는 '누르면 …', '드래그하면 …' 같은 화면 조작 안내 문장을 뺌
  var txt = function (id) { return esc($(id).textContent.replace(/[^.]*(누르면|드래그)[^.]*\.\s*/g, '').trim()); };
  var now = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
  var made = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  var kpi = [['k1', $('k1Label').textContent], ['k2', '전년 동기 대비 (참고)'], ['k3', '점유율이 가장 오른 업종'], ['k4', '관광객 비중 (상대 비교용)']].map(function (k) {
    return '<div class="kpi"><small>' + esc(k[1]) + '</small><b>' + txt(k[0]) + '</b><span>' + txt(k[0] + 'd') + '</span></div>';
  }).join('');
  var sum = (OUT.summary || []).map(function (s) { return '<li>' + esc(s.replace(/^\(보류\) /, '')) + '</li>'; }).join('');
  var css = 'body{margin:0;background:#f4f6fa;color:#1b2232;font:14px/1.6 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif}'
    + '.page{max-width:980px;margin:0 auto;padding:32px 28px 48px}'
    + '.cover{background:linear-gradient(135deg,#4a8cf8,#2a66e6);color:#fff;border-radius:18px;padding:28px 30px}'
    + '.cover small{font-weight:700;letter-spacing:.06em;opacity:.85}.cover h1{margin:6px 0 14px;font-size:28px}'
    + '.cond{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cond div{background:rgba(255,255,255,.15);border-radius:10px;padding:8px 12px}.cond em{display:block;font-style:normal;font-size:11px;opacity:.8}.cond b{font-size:13px}'
    + 'section{background:#fff;border-radius:16px;padding:20px 22px;margin-top:16px;page-break-inside:avoid;break-inside:avoid}'
    + 'h2{font-size:17px;margin:0 0 4px}.sub{margin:0 0 12px;color:#5a6478;font-size:12.5px}'
    + '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpi{border:1px solid #edf0f5;border-radius:12px;padding:12px}.kpi small{display:block;color:#5a6478;font-size:12px}.kpi b{display:block;font-size:22px;margin:4px 0}.kpi span{display:block;color:#8d96a8;font-size:11.5px;line-height:1.5}'
    + '.warn{background:#fff4e3;color:#7a5310;border-radius:12px;padding:10px 14px;font-size:13px;margin-top:12px}'
    + 'ul.sum{margin:0;padding-left:20px}ul.sum li{margin:6px 0}'
    + 'img{width:100%;height:auto;display:block;border:1px solid #edf0f5;border-radius:10px;margin:6px 0 10px}'
    + '.two{display:grid;grid-template-columns:2fr 3fr;gap:12px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}'
    + 'table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:7px 8px;border-bottom:1px solid #edf0f5;text-align:left}th{color:#8d96a8;font-weight:600}td.n,th.n{text-align:right}'
    + '.pill.rise{background:#e3eefc;color:#1d5fc4}.pill.fall{background:#fde8e8;color:#c63a3a}td small{display:block;color:#8d96a8;font-size:10.5px}'
    + '.pill{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:1px 7px}.pill.up{background:#e5f6ea;color:#23934a}.pill.down{background:#fde8e8;color:#d43f3f}.pill.na{background:#f4f6fa;color:#8d96a8}'
    + '.ref-tag{font-style:normal;font-size:10px;font-weight:700;color:#9a6a00;background:#fff4e3;border-radius:5px;padding:0 5px;margin-left:3px}'
    + '.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}.muted{color:#8d96a8}.flag{color:#e34948}'
    + 'ol.rank{margin:0;padding-left:20px;font-size:12.5px}ol.rank li{padding:3px 0;border-bottom:1px solid #edf0f5}ol.rank .r{display:flex;justify-content:space-between;gap:8px}'
    + '.note{color:#8d96a8;font-size:11.5px;margin:6px 0 0}ul.lim{font-size:12px;color:#5a6478;padding-left:18px}'
    + 'footer{margin-top:20px;color:#8d96a8;font-size:11px}'
    + '@media print{body{background:#fff}.page{padding:0}section{border:1px solid #edf0f5}.cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>제주 업종별 관광 트렌드 보고서 (' + esc(periodLabel()) + ')</title><style>' + css + '</style></head><body><div class="page">'
    + '<div class="cover"><small>JEJU TOURISM DATA REPORT</small><h1>제주 업종별 관광 트렌드 보고서</h1><div class="cond">'
    + '<div><em>기간</em><b>' + esc(periodLabel()) + ' (' + A.range.length + '개월)</b></div>'
    + '<div><em>지역</em><b>' + esc(regionLabel()) + '</b></div>'
    + '<div><em>업종</em><b>' + esc(groupsLabel()) + '</b></div>'
    + '<div><em>지표</em><b>' + MET[st.metric] + (st.no26 ? ' · 2026년 제외' : '') + '</b></div>'
    + '<div><em>작성</em><b>' + made + '</b></div>'
    + '<div><em>데이터 기준</em><b>' + esc(D.generatedAt) + ' 빌드</b></div></div></div>'
    + '<section><h2>핵심 지표</h2><p class="sub">업종 비교는 점유율 기준이며, 증감률은 참고용입니다(도착 수 규모 변화가 입도 관광객과 맞지 않음).</p><div class="kpis">' + kpi + '</div>'
    + ($('warn2026').hidden ? '' : '<div class="warn">' + txt('warn2026') + '</div>') + '</section>'
    + '<section><h2>분석 요약</h2><p class="sub">정해진 규칙에 따라 자동으로 만든 문장입니다.</p><ul class="sum">' + sum + '</ul></section>'
    + '<section><h2>월별 ' + MET[st.metric] + '</h2><p class="sub">' + txt('moSub') + '</p>' + img('cMo') + '</section>'
    + '<section><h2>업종 구성과 연도별 점유율</h2><p class="sub">' + txt('s4') + '</p><div class="two">' + img('c4') + img('c4b') + '</div>' + $('t4').innerHTML + '</section>'
    + '<section><h2>업종 증감 순위</h2><p class="sub">' + txt('s5') + '</p>' + img('c5')
    + '<div class="cols"><div><h3>세부 업종 상승 TOP10</h3><ol class="rank">' + $('r5up').innerHTML + '</ol></div><div><h3>세부 업종 하락 TOP10</h3><ol class="rank">' + $('r5down').innerHTML + '</ol></div></div>'
    + '<p class="note">' + txt('n5') + '</p>' + $('t5').innerHTML + '</section>'
    + '<section><h2>업종별 계절성</h2><p class="sub">' + txt('s6') + '</p>' + img('c6') + '<p class="note">' + txt('n6') + '</p>' + $('t6').innerHTML + '</section>'
    + '<section><h2>지역 지도</h2><p class="sub">' + txt('s7') + '</p><div class="two">' + img('c7') + '<div><h3>' + txt('h7top') + '</h3><ol class="rank">' + $('r7').innerHTML + '</ol></div></div>' + '<p class="note">' + txt('n7') + '</p></section>'
    + '<section><h2>인기 장소 지도</h2><p class="sub">' + txt('sPts') + '</p>' + img('cPts') + '<p class="note">' + txt('nPts') + '</p></section>'
    + '<section><h2>뜨는 장소 · 지는 장소</h2><p class="sub">' + txt('sTrend') + '</p><div class="cols"><div><h3>▲ 뜨는 장소 TOP10</h3><table>' + $('tUp').innerHTML + '</table></div><div><h3>▼ 지는 장소 TOP10</h3><table>' + $('tDown').innerHTML + '</table></div></div><p class="note">' + txt('nTrend') + '</p></section>'
    + '<section><h2>검색 관심도 vs 실제 도착</h2><p class="sub">' + txt('s9') + '</p>' + img('c9') + '<p class="note">' + txt('n9') + '</p></section>'
    + '<section><h2>업종 내 인기 장소 TOP10</h2><p class="sub">' + txt('s10') + '</p><table>' + $('t10').innerHTML + '</table><p class="note">' + txt('n10') + '</p></section>'
    + '<section><h2>해석할 때 주의할 점 · 데이터 한계</h2><ul class="lim">' + $('limits').innerHTML + '</ul></section>'
    + '<footer>데이터 출처: 제주 지역별 인기 장소(목적지 도착 수) · 비짓제주 검색어 순위 · 월별 입도 관광객 · 읍면동 경계 vuski/admdongkor ver20260701 (원자료 통계청 SGIS, CC BY 4.0)<br>제주 업종별 관광 트렌드 대시보드에서 생성</footer>'
    + '</div></body></html>';
}
// 1페이지 요약 (A4 세로 한 장): 핵심 지표 · 요약 문장 · 차트 3개(구성 도넛, 월별 막대, 업종 증감) · TOP5 · 뜨는/지는 장소
function buildSummaryHtml() {
  var img = function (id, cls) { var c = charts[id]; return c ? '<img class="' + (cls || '') + '" src="' + c.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }) + '" alt="">' : ''; };
  // 좁은 칸에 넣을 차트는 칸 크기에 맞춰 다시 그려서 글자가 작아지지 않게
  var imgSized = function (id, w, h, cls) {
    var src = charts[id]; if (!src) return '';
    var box = document.createElement('div'); box.style.cssText = 'position:absolute;left:-10000px;top:0;width:' + w + 'px;height:' + h + 'px'; document.body.appendChild(box);
    var tmp = echarts.init(box); tmp.setOption(src.getOption());
    var url = tmp.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }); tmp.dispose(); box.remove();
    return '<img class="' + (cls || '') + '" src="' + url + '" alt="">';
  };
  var tx = function (id) { return esc($(id).textContent.replace(/[^.]*(누르면|드래그)[^.]*\.\s*/g, '').trim()); };
  var now = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
  var made = now.getFullYear() + '.' + pad(now.getMonth() + 1) + '.' + pad(now.getDate());
  var kpi = [['k1', $('k1Label').textContent], ['k2', '전년 동기 대비 (참고)'], ['k3', '점유율이 가장 오른 업종'], ['k4', '관광객 비중 (상대 비교용)']].map(function (k) {
    return '<div class="kpi"><small>' + esc(k[1]) + '</small><b>' + esc($(k[0]).textContent) + '</b></div>';
  }).join('');
  var sum = (OUT.summary || []).map(function (s) { return '<li>' + esc(s.replace(/^\(보류\) /, '')) + '</li>'; }).join('');
  var top5 = (A.placesTop || []).slice(0, 5).map(function (o, i) { var p = o.p; return '<tr><td>' + (i + 1) + '</td><td><span class="dot" style="background:' + gColor(P.group[p]) + '"></span>' + esc(P.name[p]) + ' <small>' + esc(D.dongs.name[P.dong[p]]) + '</small></td><td class="n">' + fmtN(o.v) + '</td></tr>'; }).join('');
  var tr = function (arr, cls) { return (arr || []).slice(0, 3).map(function (s) { var m = s.match(/^(.*) ([+-]?[\d.]+%p)( \[이름변경의심\])?$/); return m ? '<li><span class="pill ' + cls + '">' + m[2] + '</span> ' + esc(m[1]) + (m[3] ? ' <em>이름 변경 의심</em>' : '') + '</li>' : '<li>' + esc(s) + '</li>'; }).join('') || '<li class="muted">계산 불가</li>'; };
  var cond = esc(periodLabel()) + ' (' + A.range.length + '개월) · ' + esc(regionLabel()) + ' · ' + esc(groupsLabel()) + ' · ' + MET[st.metric] + (st.no26 ? ' · 2026년 제외' : '');
  var css = '@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{margin:0;background:#eef1f7;color:#1b2232;font:9.5pt/1.45 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif}'
    + '.sheet{width:192mm;min-height:277mm;margin:8mm auto;background:#fff;padding:7mm 8mm;display:flex;flex-direction:column;gap:3.2mm}'
    + '.hd{display:flex;justify-content:space-between;align-items:flex-end;background:linear-gradient(135deg,#2f6fef,#2459d6);color:#fff;border-radius:4mm;padding:4mm 5mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '.hd small{font-size:7pt;letter-spacing:.06em;opacity:.9}.hd h1{margin:1mm 0 0;font-size:15pt}.hd .c{text-align:right;font-size:8pt;line-height:1.5}'
    + '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm}.kpi{border:1px solid #e3e7ef;border-radius:3mm;padding:2.5mm 3mm}.kpi small{display:block;font-size:7.5pt;color:#5a6478}.kpi b{display:block;font-size:13.5pt;margin-top:.8mm}'
    + '.row{display:grid;gap:3mm}.r1{grid-template-columns:1.35fr 1fr}.r3{grid-template-columns:1.15fr 1fr}'
    + '.box{border:1px solid #e3e7ef;border-radius:3mm;padding:2.5mm 3mm;min-width:0}h2{font-size:9.5pt;margin:0 0 1.5mm}'
    + 'ul.sum{margin:0;padding-left:4mm}ul.sum li{margin:0 0 1.4mm;font-size:8.6pt}'
    + 'img{display:block;width:100%;height:auto}img.donut{max-height:58mm;object-fit:contain}img.mo{max-height:48mm;object-fit:contain}img.gr{max-height:62mm;object-fit:contain}'
    + 'table{border-collapse:collapse;width:100%;font-size:8.2pt}td{padding:1mm 1.2mm;border-bottom:1px solid #eef1f5}td.n{text-align:right;white-space:nowrap}td small{color:#8d96a8}'
    + '.dot{display:inline-block;width:2.2mm;height:2.2mm;border-radius:50%;margin-right:1.2mm}.two{display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-top:2mm}'
    + 'ul.tr{margin:0;padding:0;list-style:none;font-size:8pt}ul.tr li{margin:0 0 1mm}ul.tr em{font-style:normal;font-size:6.8pt;color:#9a6a00;background:#fff4e3;border-radius:1mm;padding:0 1mm}'
    + '.pill{display:inline-block;font-size:7.2pt;font-weight:700;border-radius:1.2mm;padding:0 1.2mm}.rise{background:#e3eefc;color:#1d5fc4}.fall{background:#fde8e8;color:#c63a3a}.muted{color:#8d96a8}'
    + '.ft{margin-top:auto;font-size:7pt;color:#8d96a8;line-height:1.5;border-top:1px solid #eef1f5;padding-top:2mm}'
    + '@media print{body{background:#fff}.sheet{margin:0;width:auto;min-height:0;padding:0}}';
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>제주 업종별 관광 트렌드 요약 (' + esc(periodLabel()) + ')</title><style>' + css + '</style></head><body><div class="sheet">'
    + '<div class="hd"><div><small>JEJU TOURISM DATA · 1페이지 요약</small><h1>제주 업종별 관광 트렌드</h1></div><div class="c">' + cond + '<br>작성 ' + made + ' · 데이터 기준 ' + esc(D.generatedAt) + '</div></div>'
    + '<div class="kpis">' + kpi + '</div>'
    + '<div class="row r1"><div class="box"><h2>분석 요약</h2><ul class="sum">' + sum + '</ul></div><div class="box"><h2>업종 구성</h2>' + img('c4', 'donut') + '</div></div>'
    + '<div class="box"><h2>월별 ' + MET[st.metric] + '</h2>' + img('cMo', 'mo') + '</div>'
    + '<div class="row r3"><div class="box"><h2>업종 ' + (st.growthMode === 'share' ? '점유율 변화' : '증감률(참고)') + '</h2>' + imgSized('c5', 430, 300, 'gr') + '</div>'
    + '<div class="box"><h2>인기 장소 TOP5</h2><table>' + top5 + '</table><div class="two"><div><h2>▲ 뜨는 장소</h2><ul class="tr">' + tr(OUT.trend && OUT.trend.up, 'rise') + '</ul></div><div><h2>▼ 지는 장소</h2><ul class="tr">' + tr(OUT.trend && OUT.trend.down, 'fall') + '</ul></div></div></div></div>'
    + '<div class="ft">해석 주의: 값은 장소별 도착 수(수집 방식 미확인)이며 매출·이용 인원과 다릅니다. 도착 수 규모 변화가 입도 관광객과 맞지 않아(원인 미확인) 업종 비교는 점유율 기준이며 증감률은 참고용입니다. '
    + '관광객·도민 구분 기준은 확인되지 않았습니다. 데이터: 제주 지역별 인기 장소 · 비짓제주 검색어 · 월별 입도 관광객 · 읍면동 경계 vuski/admdongkor(SGIS, CC BY 4.0)</div>'
    + '</div></body></html>';
}

function runReport() {
  var btn = $('rpGo'), fmt = document.querySelector('input[name="rpFmt"]:checked').value, kind = document.querySelector('input[name="rpKind"]:checked').value, a = rp.a, b = rp.b;
  if (a > b) return;
  btn.disabled = true; btn.textContent = '만드는 중…';
  var w = fmt === 'pdf' ? window.open('', '_blank') : null;   // 팝업 차단을 피하려고 클릭 직후에 창을 엶
  setTimeout(function () {
    try {
      var html = makeReport(a, b, kind);
      if (fmt === 'pdf') {
        if (!w) { toast('팝업이 차단되어 인쇄 창을 열지 못했습니다. HTML 파일로 받아 브라우저에서 인쇄해 주세요.'); }
        else { w.document.open(); w.document.write(html); w.document.close(); setTimeout(function () { w.focus(); w.print(); }, 600); toast('인쇄 창에서 \'PDF로 저장\'을 선택하세요'); }
      } else {
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' }), link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = reportFileName(a, b, kind);
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
        toast('보고서를 내려받았습니다 · ' + reportFileName(a, b, kind));
      }
      closeReport();
    } catch (err) { toast('보고서를 만들지 못했습니다: ' + err.message); if (w) w.close(); }
    btn.disabled = false; btn.textContent = '다운로드';
  }, 30);
}
