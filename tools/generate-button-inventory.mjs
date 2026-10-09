import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Run from the repository root. This is a static source inventory, not a UX
// validation or GA4 event audit.
const root = path.resolve('frontend/src');
const output = path.resolve('docs/plan-execution/2026-09-28-button-inventory.md');
const rows = [];
const ids = new Set();
const escapeCell = value => value.replace(/\s+/g, ' ').trim()
  .replaceAll('|', '\\|').replaceAll('`', '\\`');

function visitFiles(directory) {
  for (const name of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, name);
    if (fs.statSync(file).isDirectory()) visitFiles(file);
    else if (file.endsWith('.tsx')) visitFile(file);
  }
}

function visitFile(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const relative = path.relative(process.cwd(), file);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(source) === 'button') {
      const attribute = key => node.attributes.properties.find(
        item => ts.isJsxAttribute(item) && item.name.text === key);
      let label = attribute('aria-label')?.initializer?.getText(source) ?? '';
      if (!label && ts.isJsxOpeningElement(node) && ts.isJsxElement(node.parent)) {
        label = node.parent.children.map(child =>
          ts.isJsxText(child) ? child.getText(source) : '').join(' ').trim();
      }
      const action = attribute('onClick')?.initializer?.getText(source) ??
        '(form submit 또는 상위 핸들러)';
      const idNode = attribute('data-button-id')?.initializer;
      if (!idNode || !ts.isStringLiteral(idNode)) {
        throw new Error(`Missing static button ID: ${relative}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
      }
      const id = idNode.text;
      if (ids.has(id)) throw new Error(`Duplicate static button ID: ${id}`);
      ids.add(id);
      rows.push({
        id,
        file: relative,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        label: escapeCell(label || '(동적 JSX/아이콘)').slice(0, 75),
        action: escapeCell(action).slice(0, 125),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

visitFiles(root);
const intro = `# 버튼 ID·정적 위치 목록 — 2026-09-28 갱신

[PLAN.md](../../PLAN.md)의 버튼 계약을 위한 코드 위치 점검표다. 현재 TSX에서 직접 선언한 \`<button>\` ${rows.length}곳에 고유한 \`data-button-id\`를 부여하고 TypeScript AST로 검증했다. ID는 문구가 바뀌어도 같은 행동에 유지한다. 반복 렌더링되는 컴포넌트 인스턴스는 같은 행동 ID를 공유한다. 이 수에는 현재 화면에서 사용하지 않는 컴포넌트도 포함된다. 조건부·반복 노출과 실제 작동은 확인하지 않았다. \`onClick\`이 없어도 폼 제출이나 상위 이벤트에서 동작할 수 있다.

재집계 명령: \`node tools/generate-button-inventory.mjs\`

| 번호 | button_id | 코드 위치 | 정적 문구/접근성 이름 | 동작 연결(정적 코드) |
| ---: | --- | --- | --- | --- |
`;
const body = rows.map(({ id, file, line, label, action }, index) =>
  `| ${index + 1} | \`${id}\` | [${file}:${line}](../../${file}) | ${label} | ${action} |`).join('\n');
const conclusion = `

이 목록은 버튼 기능·GA4·권한 검증의 완료 증거가 아니다. 다음 검토에서 화면/노출 조건, 요청 성공·실패·취소, 이벤트 또는 제외 이유, 실제 검증 케이스를 채운다. 특히 위기 지원·개인정보 행동은 첫 공개 GA4의 제외 대상이다.
`;
fs.writeFileSync(output, intro + body + conclusion);
console.log(`${rows.length} buttons: ${path.relative(process.cwd(), output)}`);
