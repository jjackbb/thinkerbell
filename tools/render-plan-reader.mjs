import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/plan-execution/2026-09-28-plan-reader.html');
const planPath = path.join(root, 'PLAN.md');
const pretestPath = path.join(root, 'docs/plan-execution/2026-09-28-pre-user-test-work.md');
const plan = readFileSync(planPath, 'utf8');
const pretest = readFileSync(pretestPath, 'utf8');

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function localHref(href, sourcePath) {
  if (/^(https?:|mailto:|#)/i.test(href)) return href;
  const [pathname, fragment] = href.split('#', 2);
  const relative = path.relative(path.dirname(output), path.resolve(path.dirname(sourcePath), pathname));
  return encodeURI(relative || './') + (fragment ? `#${encodeURIComponent(fragment)}` : '');
}

function inline(source, sourcePath) {
  const parts = source.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map(part => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return `<a href="${escapeHtml(localHref(link[2], sourcePath))}">${inline(link[1], sourcePath)}</a>`;
    if (part.startsWith('**') && part.endsWith('**')) return `<strong>${inline(part.slice(2, -2), sourcePath)}</strong>`;
    if (part.startsWith('`') && part.endsWith('`')) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    return escapeHtml(part);
  }).join('');
}

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function isSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function renderMarkdown(markdown, sourcePath, idPrefix) {
  const lines = markdown.trimEnd().split(/\r?\n/);
  const blocks = [];
  const headings = [];
  let index = 0;
  let headingCount = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const id = `${idPrefix}-${++headingCount}`;
      blocks.push(`<h${level} id="${id}">${inline(heading[2], sourcePath)}</h${level}>`);
      headings.push({ level, id, text: heading[2] });
      index++;
      continue;
    }
    if (line.startsWith('|') && isSeparator(lines[index + 1] || '')) {
      const headers = cells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].startsWith('|')) rows.push(cells(lines[index++]));
      blocks.push(`<div class="table-scroll"><table><thead><tr>${headers.map(cell => `<th>${inline(cell, sourcePath)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell, sourcePath)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const type = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length && (ordered ? /^\d+\. /.test(lines[index]) : /^[-*] /.test(lines[index]))) {
        items.push(`<li>${inline(lines[index].replace(ordered ? /^\d+\. / : /^[-*] /, ''), sourcePath)}</li>`);
        index++;
      }
      blocks.push(`<${type}>${items.join('')}</${type}>`);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^#{1,3} /.test(lines[index]) && !/^[-*] /.test(lines[index]) && !/^\d+\. /.test(lines[index]) && !(lines[index].startsWith('|') && isSeparator(lines[index + 1] || ''))) {
      paragraph.push(lines[index++].trim());
    }
    blocks.push(`<p>${inline(paragraph.join(' '), sourcePath)}</p>`);
  }
  return { html: blocks.join('\n'), headings };
}

function renderPretestCards(markdown) {
  const lines = markdown.trimEnd().split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith('| 순서 |'));
  const end = lines.findIndex((line, i) => i > start + 1 && !line.startsWith('|'));
  const before = renderMarkdown(lines.slice(0, start).join('\n'), pretestPath, 'pretest');
  const after = renderMarkdown(lines.slice(end).join('\n'), pretestPath, 'pretest-note');
  const cards = lines.slice(start + 2, end).map(line => {
    const [number, title, status, evidence] = cells(line);
    const partial = status.includes('일부');
    return `<article class="work-card${partial ? ' partial' : ''}" id="work-${escapeHtml(number)}"><div class="work-meta"><span class="work-number">${escapeHtml(number.padStart(2, '0'))}</span><span class="status${partial ? ' partial' : ''}">${escapeHtml(status)}</span></div><h3>${inline(title, pretestPath)}</h3><p>${inline(evidence, pretestPath)}</p></article>`;
  }).join('\n');
  return `${before.html}<div class="work-grid">${cards}</div><div class="scope-note">${after.html}</div>`;
}

const planRendered = renderMarkdown(plan, planPath, 'plan');
const pretestRendered = renderPretestCards(pretest);
const contents = planRendered.headings.filter(item => item.level === 2);
const generatedAt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short' }).format(new Date());

// This is a dated execution index, not a second policy source. Keep the scope
// in each item so a technical PASS cannot be mistaken for a user-test PASS.
const statusGroups = [
  { id: 'done', title: '완료', note: '기록된 정책·기술 범위만 완료', items: [
    ['첫 공개 정책·공개 방식 확정', '커뮤니티·SNS 자발적 이용, 직접 모집 선행 조건 없음', '../../PLAN.md'],
    ['기존 운영 배포·직접 쓰기 정책 7개 차단', '서버 저장·실제 AI·권한 경계 확인 기록', '2026-09-28-in-progress-release-preflight.md'],
    ['지정 A·B 메일·로그인·핵심 과업', '가상 데이터 기술 검증, 일반 이용자 성과 아님', '2026-09-28-two-account-browser-checklist.md'],
    ['운영자 문의·조건부 동작·실패 복구', '선택한 핵심 경로 PASS, 174개 전체 상태 전수 PASS 아님', '2026-09-28-in-progress-release-preflight.md'],
    ['버튼 174개 위치·계약 지도', '정적 연결·중복 없는 목록', '2026-09-28-button-behavior-matrix.md'],
    ['AI 횟수 보관·일일 정리', '삭제 후 보관·동시 요청·cron 실행 기록, 자정 전환은 별도', '2026-09-28-in-progress-release-preflight.md'],
    ['9월 30일 핵심 GA4 속성·동의·수신', '당시 운영 검증. 10월 9일 확장 이벤트의 수신 검증 아님', '2026-09-28-in-progress-release-preflight.md'],
    ['답변 완료·저장 결과 분리 운영 복원', '가상 응답 4종으로 완료/저장 실패 1/1·부분/빈 답변 0·중복 0 확인', '../../PLAN.md'],
    ['현재 문서·이력 분리와 커밋·운영 배포', '원본 15개 보존, fee5ea5 푸시·운영 READY·공개 주소 확인', 'README.md'],
    ['10월10일 파비콘 공개·AI 정리 예약 확인', '6e18aec Vercel READY·7자산 동일; job1 00:01KST·6개월 updatedAt 유지', 'README.md'],
    ['Chrome 기기 모드 확인', '390×844·터치 기술 확인, 실물 Safari 아님', '2026-09-28-two-account-browser-checklist.md'],
  ]},
  { id: 'in-progress', title: '작업 중', note: '2026-10-09 전체 완료 항목 9/12 · 75%', items: [['삭제 소유권·세션 경계 보강', '격리 회귀 PASS. 5aa097b 랜딩 수신·삭제 방어 보존. 제보·운영 DB 권한 미검증', '2026-09-28-in-progress-release-preflight.md'], ['전체 화면·행동·기능 결과 계측', '구현 푸시·QA Preview READY. 독립 랜딩 동의·예시 클릭 연결/정제 PASS. Chrome 연결 복구·일부 합성 UI PASS. 신규 GA4 실제 수신은 미검증', 'README.md']] },
  { id: 'not-started', title: '작업 전', note: '게시 이후 또는 별도 보류', items: [
    ['커뮤니티·SNS 실제 게시', '소개 글·링크 초안 준비, 게시 경로/시각 기록 필요', '2026-09-28-release-blockers-questions.html'],
    ['처리 보고서·기준선 대조', '실제 유입 후 기술 시험 제외·기간/버전/분모 기록', '../../PLAN.md'],
    ['별도 보류: 자정 횟수 전환 확인', '사용자 요청으로 이번 범위 제외, 설정 유지', 'README.md'],
  ]},
  { id: 'user-test', title: '유저 테스트 필요', note: '공개 후 자발적 이용·피드백. 직접 관찰은 필요 시', items: [
    ['실제 이용과 불편·도움 피드백', '기술 시험을 만족도나 자연 유입으로 세지 않음', '../../PLAN.md'],
    ['근거 있는 첫 개선과 재확인', '확인된 문제 하나를 선택하고 효과/악화/판단 보류 구분', '../../PLAN.md'],
  ]},
];
const orderedStatusGroups = ['not-started', 'in-progress', 'done', 'user-test']
  .map(id => statusGroups.find(group => group.id === id));

// Execution order follows PLAN section 4 and the release-gates handoff. Items
// waiting for a real account or an owner decision stay explicitly pending.
const nextActions = [
  ['연결 확인 후', '남은 3개 검증 항목 재개', '완료 9/12(75%). 실제 화면 전수·운영 DB 역할/삭제 제보·신규 GA4 수신을 이어간다. 팀원 랜딩 수신 완료. 파비콘만 공개, 신규 기능/보안/소개 문구는 미배포.', '2026-09-28-in-progress-release-preflight.md'],
  ['확인 후', 'QA 수신·운영 반영', '기존 계정은 테스트·팀원 계정으로 별도 재동의 전환을 생략한다. 맞춤 측정기준·Preview 수신을 확인한 뒤 운영에 반영한다. 신규 내부 DB 이벤트는 추가하지 않는다.', '2026-10-09-analytics-scope.html'],
  ['실제 게시', '커뮤니티·SNS 소개 글과 링크', '자발적 이용을 위한 게시다. Vercel 배포와 구분하며 게시 경로·시각·주소를 기록한다.', '2026-09-28-release-blockers-questions.html'],
  ['이용·보고서 처리 후', '기준선·불편 근거·첫 개선', '기술 시험 제외, 신규/이어하기 분리, 실제 건수·피드백으로 문제를 선택하고 개선을 확인한다.', '../../PLAN.md'],
];

function renderStatusBoard() {
  return orderedStatusGroups.map(group => `<section class="state-group" id="${group.id}">
    <div class="state-heading"><h3>${group.title} <span>${group.items.length}</span></h3><p>${group.note}</p></div>
    <ul>${group.items.map(([title, scope, source]) => `<li><strong>${escapeHtml(title)}</strong><small>${escapeHtml(scope)} · <a href="${escapeHtml(localHref(source, output))}">근거</a></small></li>`).join('')}</ul>
  </section>`).join('\n');
}

function renderNextActions() {
  return nextActions.map(([stage, title, detail, source], index) => `<li>
    <span class="next-number">${index + 1}</span>
    <div><span class="next-stage">${escapeHtml(stage)}</span><strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(detail)} <a href="${escapeHtml(localHref(source, output))}">근거 ↗</a></p></div>
  </li>`).join('\n');
}

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>니편내편 계획 읽기 | 사용자 테스트 전 작업 · PLAN</title>
  <style>
    :root { color-scheme: light; --ink:#26323d; --muted:#63717d; --line:#dce4e7; --paper:#fff; --canvas:#f4f7f7; --accent:#d35a4b; --accent-soft:#fff0ed; --navy:#183f4a; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; background:var(--canvas); color:var(--ink); font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif; line-height:1.72; }
    a { color:#a84035; text-underline-offset:3px; }
    a:hover { color:#792a23; }
    .hero { background:linear-gradient(125deg,#173e49,#32616b); color:#fff; padding:48px max(24px,calc((100vw - 1280px)/2)); }
    .eyebrow { margin:0 0 10px; color:#c8e4e7; font-weight:700; letter-spacing:.08em; font-size:.78rem; }
    .hero h1 { margin:0; font-size:clamp(1.8rem,4vw,3rem); line-height:1.25; letter-spacing:-.035em; }
    .hero p { max-width:760px; margin:14px 0 0; color:#e7f2f2; }
    .hero a { color:#fff; }
    .source-note { max-width:1280px; margin:22px auto 0; padding:0 24px; font-size:.88rem; color:var(--muted); }
    .layout { max-width:1280px; margin:18px auto 80px; padding:0 24px; display:grid; grid-template-columns:220px minmax(0,1fr); gap:24px; align-items:start; }
    .sidebar { position:sticky; top:18px; display:grid; gap:6px; padding:18px; background:var(--paper); border:1px solid var(--line); border-radius:16px; box-shadow:0 4px 18px #183f4a0a; }
    .sidebar b { font-size:.77rem; color:var(--muted); margin:10px 10px 2px; }
    .sidebar a { display:block; padding:8px 10px; border-radius:8px; text-decoration:none; color:var(--ink); font-size:.9rem; line-height:1.35; }
    .sidebar a:hover { background:#edf4f4; color:var(--navy); }
    .content { min-width:0; display:grid; gap:24px; }
    .panel { background:var(--paper); border:1px solid var(--line); border-radius:18px; padding:clamp(22px,4vw,44px); box-shadow:0 8px 26px #183f4a09; scroll-margin-top:18px; }
    .panel-top { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; flex-wrap:wrap; border-bottom:1px solid var(--line); padding-bottom:20px; margin-bottom:26px; }
    .panel-top .kicker { color:var(--accent); font-size:.76rem; font-weight:800; letter-spacing:.08em; margin:0 0 5px; }
    .panel-top h2 { margin:0; color:var(--navy); font-size:clamp(1.35rem,3vw,2rem); line-height:1.3; }
    .panel-top a { font-size:.86rem; white-space:nowrap; }
    .document h1 { display:none; }
    .document h2 { color:var(--navy); font-size:1.47rem; line-height:1.35; margin:3.2rem 0 1rem; padding-top:1.5rem; border-top:1px solid var(--line); scroll-margin-top:24px; }
    .document h2:first-of-type { margin-top:0; padding-top:0; border:0; }
    .document h3 { color:var(--navy); margin:2rem 0 .6rem; }
    .document p { margin:1.1rem 0; max-width:86ch; overflow-wrap:anywhere; }
    .document ul,.document ol { padding-left:1.5rem; max-width:86ch; }
    .document li { margin:.55rem 0; }
    .document code { background:#eff3f3; border-radius:4px; padding:.12em .3em; font-size:.91em; overflow-wrap:anywhere; }
    .table-scroll { overflow-x:auto; border:1px solid var(--line); border-radius:10px; margin:1.3rem 0 1.7rem; }
    table { border-collapse:collapse; min-width:620px; width:100%; font-size:.94rem; }
    th,td { padding:12px 14px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:#eaf1f1; color:var(--navy); font-weight:700; }
    tr:last-child td { border:0; }
    tbody tr:nth-child(even) { background:#fafcfc; }
    td:first-child { white-space:nowrap; font-weight:650; }
    .work-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:24px; }
    .work-card { border:1px solid var(--line); border-radius:13px; padding:20px; background:#fff; scroll-margin-top:20px; }
    .work-card.partial { border-left:4px solid #d18a39; }
    .work-meta { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .work-number { color:#81919b; font-size:.83rem; font-weight:800; letter-spacing:.07em; }
    .status { padding:3px 9px; border-radius:999px; background:#e6f5ee; color:#206446; font-size:.76rem; font-weight:750; white-space:nowrap; }
    .status.partial { background:#fff3df; color:#8c5a1e; }
    .work-card h3 { margin:12px 0 8px; font-size:1.03rem; line-height:1.4; }
    .work-card p { margin:0; font-size:.9rem; color:#44535f; }
    .status-board { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
    .state-group { border:1px solid var(--line); border-radius:13px; background:#fff; padding:20px; scroll-margin-top:18px; }
    .state-group:nth-child(1) { border-top:4px solid #7c8c9b; }
    .state-group:nth-child(2) { border-top:4px solid #d18a39; }
    .state-group:nth-child(3) { border-top:4px solid #34805b; }
    .state-group:nth-child(4) { border-top:4px solid #4d6fbc; }
    .state-heading h3 { margin:0; color:var(--navy); font-size:1.2rem; }
    .state-heading h3 span { display:inline-block; min-width:1.5em; text-align:center; font-size:.75rem; color:var(--muted); background:#edf2f2; border-radius:99px; padding:1px 6px; vertical-align:middle; }
    .state-heading p { margin:3px 0 13px; color:var(--muted); font-size:.82rem; }
    .state-group ul { list-style:none; padding:0; margin:0; }
    .state-group li { border-top:1px solid var(--line); padding:11px 0; line-height:1.4; }
    .state-group li strong { display:block; font-size:.9rem; font-weight:650; }
    .state-group li small { display:block; color:var(--muted); font-size:.76rem; margin-top:4px; }
    .next-list { list-style:none; margin:0; padding:0; display:grid; gap:12px; }
    .next-list li { display:flex; gap:14px; padding:16px 18px; border:1px solid var(--line); border-radius:12px; background:#fff; }
    .next-number { display:grid; place-items:center; flex:none; width:30px; height:30px; border-radius:50%; background:#eaf1f1; color:var(--navy); font-weight:800; font-size:.85rem; }
    .next-list strong { display:block; margin-top:4px; color:var(--navy); line-height:1.4; }
    .next-list p { margin:5px 0 0; color:#44535f; font-size:.88rem; }
    .next-stage { display:inline-block; padding:2px 8px; border-radius:99px; background:#fff3df; color:#8c5a1e; font-size:.74rem; font-weight:750; }
    .full-plan { margin-top:24px; border:1px solid var(--line); border-radius:12px; padding:0 18px; }
    .full-plan summary { padding:16px 0; cursor:pointer; font-weight:700; color:var(--navy); }
    .full-plan[open] summary { border-bottom:1px solid var(--line); margin-bottom:22px; }
    .inside-toc { display:flex; flex-wrap:wrap; gap:7px 12px; margin:0 0 22px; font-size:.82rem; }
    .scope-note { background:#fff9ef; border-left:4px solid #d18a39; padding:12px 18px; border-radius:0 8px 8px 0; margin-top:22px; }
    .scope-note p { margin:.25rem 0; }
    .meta { color:var(--muted); font-size:.82rem; }
    @media (max-width:850px) { .layout { display:block; } .sidebar { position:static; display:flex; flex-wrap:wrap; margin-bottom:16px; } .sidebar b { width:100%; } .sidebar a { padding:7px 9px; } .work-grid,.status-board { grid-template-columns:1fr; } }
    @media (max-width:540px) { .hero { padding:34px 22px; } .layout { padding:0 12px; } .source-note { padding:0 18px; } .panel { padding:22px 18px; } .panel-top { gap:8px; } }
  </style>
</head>
<body>
  <header class="hero" id="top">
    <p class="eyebrow">니편내편 · 문서 읽기</p>
    <h1>사용자 테스트 전 작업과 PLAN 진행 상태</h1>
    <p>앞으로 할 일을 실행 순서대로 보고, 작업 전·작업 중·완료·유저 테스트 필요 항목을 구분할 수 있습니다.</p>
  </header>
  <p class="source-note">생성: ${escapeHtml(generatedAt)} KST · 최신 계획의 기준은 <a href="../../PLAN.md">PLAN.md 원본</a>입니다. 내용이 달라지면 <code>node tools/render-plan-reader.mjs</code>로 다시 생성하세요.</p>
  <div class="layout">
    <nav class="sidebar" aria-label="문서 목차">
      <b>문서</b>
      <a href="#pretest">사용자 테스트 전 작업 9개</a>
      <a href="#next-actions">앞으로 할 일</a>
      <a href="#plan">PLAN 상태 목록</a>
      <b>진행 상태</b>
      ${orderedStatusGroups.map(group => `<a href="#${group.id}">${group.title}</a>`).join('\n      ')}
      <a href="#top">맨 위로 ↑</a>
    </nav>
    <main class="content">
      <section class="panel" id="pretest" aria-labelledby="pretest-title">
        <div class="panel-top"><div><p class="kicker">실행 현황</p><h2 id="pretest-title">사용자 테스트 전 작업</h2></div><a href="2026-09-28-pre-user-test-work.md">원본 Markdown 열기 ↗</a></div>
        <div class="document">${pretestRendered}</div>
      </section>
      <section class="panel" id="next-actions" aria-labelledby="next-actions-title">
        <div class="panel-top"><div><p class="kicker">다음 실행 순서</p><h2 id="next-actions-title">앞으로 할 일</h2></div><div><a href="2026-09-28-release-blockers-questions.html">공개 글 초안 열기 ↗</a><br><a href="2026-09-28-release-gates.md">출시 인수인계 열기 ↗</a></div></div>
        <p class="meta">첫 답변 기준은 확정됐습니다. 기존 운영 배포·직접 쓰기 차단은 완료됐으며, 이번 복원 수정의 배포·수신 확인을 진행합니다.</p>
        <ol class="next-list">${renderNextActions()}</ol>
      </section>
      <section class="panel" id="plan" aria-labelledby="plan-title">
        <div class="panel-top"><div><p class="kicker">PLAN.md 기반 실행 목록</p><h2 id="plan-title">계획 진행 상태</h2></div><a href="../../PLAN.md">최신 PLAN 원본 열기 ↗</a></div>
        <p class="meta">완료는 각 항목에 적힌 정책·기술 범위만 뜻합니다. 실제 사용자 과업과 운영 공개의 완료 판정은 별도입니다.</p>
        <div class="status-board">${renderStatusBoard()}</div>
        <details class="full-plan"><summary>PLAN.md 상세 정책·근거 전체 펼치기</summary>
          <nav class="inside-toc" aria-label="PLAN 원문 목차">${contents.map(item => `<a href="#${item.id}">${escapeHtml(item.text)}</a>`).join('')}</nav>
          <div class="document">${planRendered.html}</div>
        </details>
      </section>
      <p class="meta">이 HTML은 문서를 변경하거나 운영 상태를 판정하지 않습니다. 각 PASS는 원문에 적힌 검증 범위에만 적용됩니다.</p>
<section class="panel" id="dots-questions"><h2>2026-10-10 승인과 실행 상태</h2><p>사용자 확인: 운영 주체·문의 책임자는 변종현 개인(현재 비사업자), 공식 문의처 ds5305naver@gmail.com, 만14세 이상, 성인 전용 콘텐츠 미지원. 외부 배포 후 데이터 기반 개선이 목표이며 사업자 등록 여부와 개인정보 의무는 별개입니다.</p><p>랜딩 문구 수정, 운영 보안 SQL 사전 대조 후 적용, GA4 누락13개 event scope 등록, 검증 후 main 커밋·푸시가 승인됐습니다. 운영 보안 SQL은 실제 적용·독립8항목 readback PASS입니다. GA4 등록·추가 배포는 아직 완료 증거를 기다립니다. 개인정보 안내는 공급사 계약·보유·파기 사실이 미확정이라 미활성 초안입니다. 삭제 제보는 자료 없음으로 미재현, 일반 권한 회귀만 확인합니다.</p><p>앞선47개 자동시험 PASS와 실제 게스트 Chrome 일부 복귀 PASS는 유지합니다. 새 합성 로그인·상세/댓글 표시 PASS, 댓글 초안/스크롤·모바일 전체 및 운영 유효 역할 검증은 아직 미완료입니다. Chrome 자동화에서 user-changed 보호 오류가 반복 관찰됐으며 원인은 단정하지 않습니다. 검증 결과를 성공으로 과장하지 않습니다. 기존75%=9/12는 동일 분모로 유지합니다.</p></section>
    </main>
  </div>
</body>
</html>
`;

writeFileSync(output, html);
console.log(path.relative(root, output));
