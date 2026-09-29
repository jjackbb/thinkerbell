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
  { id: 'done', title: '완료', note: '정책 확정 또는 적힌 범위의 기술 검증 완료', items: [
    ['첫 공개 범위·AI 두 모드·숨김·평가 보관 규칙 확정', '제품 판단 완료', '../../PLAN.md'],
    ['Vercel·니편내편 DB·메일·GA4 대상 확인', '계정·설정 범위', '2026-09-28-release-gates.md'],
    ['A·B 실제 소유 확인 메일 도착·링크 복귀', 'A·B 가입·로그인·세션 복원 확인, A registered 분기도 실제 메일 확인', '2026-09-28-two-account-browser-checklist.md'],
    ['가입 확인 메일·재설정 URL과 한국어 문안 설정', 'A 실제 재설정 메일·폼 복귀 확인; 저장·재로그인 사용자 완료 보고', '2026-09-28-pretest-browser-boundaries.md'],
    ['운영 DB 호환 마이그레이션 9건 적용', '후속 마이그레이션으로 직접 쓰기 차단도 완료', '2026-09-28-db-expansion-applied.md'],
    ['AI 보관·사연 접근 정리의 예약 실행 확인', '9월 29·30일 각각 2회 성공; 실제 월말 평가 집계는 별도', '2026-09-28-in-progress-release-preflight.md'],
    ['버튼 174곳의 정적 연결·계약 지도 작성', '조건부 실제 동작은 별도', '2026-09-28-button-behavior-matrix.md'],
    ['임시 계정의 Preview AI·DB 경로와 17:49 Preview 계정 전환·실시간 제거 확인', '기술 시험 범위', '2026-09-28-preview-browser-followup.md'],
    ['17:49 Preview에서 주입한 두 실패 화면과 QA 사연 조회 전송 확인', '500은 주입, GA4 수집 HTTP 204', '2026-09-28-preview-browser-followup.md'],
    ['18:47 Preview의 비차단 동의 배너와 오류 뒤 정상 재시도 확인', '선택 전 버튼 접근·Google 요청 0건, 이의 제기 저장·AI 방 삭제', '2026-09-28-preview-browser-followup.md'],
    ['임시 계정의 사연·댓글 저장과 AI 실패 재요청·대화 복원 확인', '선택한 핵심 버튼·주입 실패·실제 서버 성공 범위', '2026-09-28-in-progress-release-preflight.md'],
    ['운영 DB AI 횟수 함수의 동시 마지막 1회·자정 요청일 귀속 확인', '가상 Auth 계정·사연·방만 사용, 삭제 후 5종 잔여 0건', '2026-09-28-in-progress-release-preflight.md'],
    ['이의 제기·AI 방 삭제의 공개 전 오류 복구 기준 확정', '주입 500 뒤 입력 보존·실제 서버 재시도 성공; 실제 장애 재현은 아님', '2026-09-28-in-progress-release-preflight.md'],
    ['Production Supabase URL 두 변수 재설정', '사용자 완료 보고 후 공개 서버 A/B 인증·저장 실행 확인', '2026-09-28-in-progress-release-preflight.md'],
    ['Production 변수 8개·공개 주소 유지 사전 배포 검증', '사전 검증 후 공개 전환·직접 쓰기 차단까지 완료', '2026-09-28-in-progress-release-preflight.md'],
    ['공개 전환·메일 복귀 설정 결함 교정', '메일 교정 배포 검증 후 현재 AR7TgDna… READY, 실제 소유 확인 registered·재설정 입력 폼 복귀 PASS', '2026-09-28-in-progress-release-preflight.md'],
    ['직접 쓰기 7경로 차단·공개 서버 연동 확인', '마이그레이션 20260929210710 적용, 직접 쓰기 거부·서버 저장/실제 AI/복원/삭제 PASS', '2026-09-28-in-progress-release-preflight.md'],
    ['GA4 분석 속성·맞춤 측정기준 9개·공개 반영', '배포/화면/진입/신규·이어하기/유입 연결, 개인정보·동의·실제 저장·운영 수신 확인', '2026-09-28-in-progress-release-preflight.md'],
    ['첫 답변 성공 시점 보정', '저장 실패 시 첫 답변 0, 실제 재시도 저장 후 1 확인', '2026-09-28-in-progress-release-preflight.md'],
    ['공개 앱의 운영 GA4 핵심 이벤트 수신', 'story_view·ai_chat_turn1·operation_success 각 1건. 통제된 기술 시험이며 사용자 성과 아님', '2026-09-28-in-progress-release-preflight.md'],
    ['추가 조건부 동작·권한 경계 검증', '문의 답변 실패/재시도·닉네임·댓글·분석 철회·재연결·성인 보류·기술 계정 탈퇴 PASS', '2026-09-28-in-progress-release-preflight.md'],
    ['실제 운영 계정으로 권한 이전·문의 수신 확인', '승인된 A가 유일한 운영자, 기존 역할 해제·계정 보존, A 문의 표시·B 메뉴 없음', '2026-09-28-in-progress-release-preflight.md'],
    ['삭제 후 횟수 보관 결함 운영 수정·검증', '운영 적용 완료; 실제 방 삭제 후 DB·API 사용 횟수 1 유지, 격리 3회 한도·30일 정리 PASS', '2026-09-28-in-progress-release-preflight.md'],
    ['Chrome 기기 모드 핵심 과업 확인', '사용자 요청한 390×844·터치 모드 사연→AI→저장→다시 찾기 PASS; 실물 Safari 아님', '2026-09-28-in-progress-release-preflight.md'],
    ['실제 A·B 핵심 과업과 QA AI 이벤트 수신', '사연·참여·비공개·실제 AI 저장·복원, ai_chat_turn1·operation_success Realtime 확인', '2026-09-28-in-progress-release-preflight.md'],
    ['최신 Preview의 QA 사연 조회 이벤트 수신', '격리 게스트 story_view Realtime 1건, 합성 qa_debug_probe DebugView 1건', '2026-09-28-in-progress-release-preflight.md'],
  ]},
  { id: 'in-progress', title: '작업 중', note: '기술 시험이 일부 끝났지만 완료 기준은 남음', items: [
    ['나머지 조건부 버튼의 실제 노출·서버 결과 대조', '게스트 쓰기·작성자 저장·댓글·AI 진입은 Preview 통과', '2026-09-28-in-progress-release-preflight.md'],
    ['AI 브라우저 동시 요청·자정·실제 장애의 차감·복원 경계 검증', '실제 B 두 탭 200/429·3회 한도 PASS; 실제 자정·장애는 별도', '2026-09-28-in-progress-release-preflight.md'],
    ['최신 Preview의 나머지 핵심 과업과 출시 중단 조건 대조', '실제 A·B 핵심 과업·횟수 결함 수정·Chrome 기기 모드 PASS; 운영자 문의까지 PASS; 나머지 조건부 상태 대조 남음', '2026-09-28-in-progress-release-preflight.md'],
  ]},
  { id: 'not-started', title: '작업 전', note: '공개 후 남은 구현·시간 경계·관찰', items: [
    ['이번 범위 제외: 자정 횟수 규칙 확인', '사용자 요청으로 수행하지 않음. 활성화 설정은 유지', '2026-09-28-in-progress-release-preflight.md'],
    ['출시 버전 기준선과 GA4 처리 보고서 비교', '공개와 실제 유입 뒤', '../../PLAN.md'],
  ]},
  { id: 'user-test', title: '유저 테스트 필요', note: '자발적 이용·피드백부터 확인, 직접 관찰은 필요 시 후속', items: [
    ['실제 사용자의 사연→AI→저장→다시 찾기 관찰', 'Chrome 기기 모드 기술 확인 완료, 실물·Safari 관찰과 구분', '2026-09-28-two-account-browser-checklist.md'],
    ['도움 평가·불편 지점·이탈 이유 관찰', 'GA4와 짧은 인터뷰를 구분', '../../PLAN.md'],
    ['개선 배포 뒤 같은 과업 재확인', '기능 확인과 사용성 개선 판단 분리', '../../PLAN.md'],
  ]},
];
const orderedStatusGroups = ['not-started', 'in-progress', 'done', 'user-test']
  .map(id => statusGroups.find(group => group.id === id));

// Execution order follows PLAN section 4 and the release-gates handoff. Items
// waiting for a real account or an owner decision stay explicitly pending.
const nextActions = [
  ['계측 준비 완료', '기술 시험을 제외한 공개 기준선 기록', '배포·유입·대화 구분 속성과 운영 맞춤 측정기준 등록을 마쳤다. 공개 게시 뒤 실제 이용을 기술 시험과 분리한다.', '2026-09-28-in-progress-release-preflight.md'],
  ['공개 방식 결정 완료', '커뮤니티·SNS 공개 글 사용', '사용자는 공개 게시 후 자발적 이용부터 확인하기로 했다. 커뮤니티·SNS 초안을 준비했다. 게시 경로·시각을 기록하고 직접 모집·동석 관찰을 선행 조건으로 두지 않는다.', '2026-09-28-release-blockers-questions.html'],
  ['실제 이용·보고서 처리 후', '기준선·불편 근거·첫 개선 비교', '일반 24~48시간 처리 지연을 감안해 GA4 보고서와 실제 관찰을 대조한다. 문제 하나를 고르고 개선 뒤 같은 과업을 다시 확인한다.', '../../PLAN.md'],
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
        <p class="meta">확인·판단이 필요한 일은 답변 대기로 남겼습니다. Production 배포와 권한 차단은 앞 단계 결과가 나온 뒤 진행합니다.</p>
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
    </main>
  </div>
</body>
</html>
`;

writeFileSync(output, html);
console.log(path.relative(root, output));
