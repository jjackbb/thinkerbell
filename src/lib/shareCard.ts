/**
 * 사연 투표 결과를 이미지 카드로 만들어 OS 공유시트로 넘긴다.
 *
 * 익명 서비스이므로 카드에 사람을 특정할 수 있는 건 하나도 넣지 않는다.
 * 닉네임, 익명 번호, 프로필, 본문 전체가 전부 빠진다. 남는 건 사연 제목과
 * 표 결과뿐이다. 캡처해서 아무 데나 올려도 글쓴이가 드러나지 않아야
 * 공유가 안전한 기능이 된다.
 */

/** 이 수 미만이면 퍼센트를 쓰지 않는다 (VoteResult 와 같은 기준) */
const SMALL_SAMPLE = 5;

const W = 1080;
const H = 1350;

const INK = '#1C1C1C';
const MY_SIDE = '#FF6B5A';   // 내 편
const YOUR_SIDE = '#6C7BE8'; // 니 편
const MUTED = '#8b8b8b';

const FONT = `Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;

export interface ShareCardInput {
  title: string;
  /** 내 편 */
  votesA: number;
  /** 니 편 */
  votesB: number;
  /** 내가 고른 쪽 (없으면 표시하지 않는다) */
  myChoice?: 'A' | 'B' | null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 최대 줄 수까지만 접고 넘치면 말줄임 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(text).width > maxWidth * maxLines) {
      let t = last;
      while (t && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
      lines[maxLines - 1] = t + '…';
    }
  }
  return lines;
}

export function drawShareCard(canvas: HTMLCanvasElement, { title, votesA, votesB, myChoice }: ShareCardInput) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const total = votesA + votesB;
  const pctA = total > 0 ? Math.round((votesA / total) * 100) : 0;
  const pctB = total > 0 ? 100 - pctA : 0;
  const enough = total >= SMALL_SAMPLE;

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  const pad = 88;
  ctx.textBaseline = 'alphabetic';

  // 워드마크
  ctx.fillStyle = MY_SIDE;
  ctx.font = `800 46px ${FONT}`;
  ctx.fillText('니편내편', pad, 150);
  ctx.fillStyle = MUTED;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText('익명 사연, 편 갈라 듣기', pad, 194);

  // 제목
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 62px ${FONT}`;
  const titleLines = wrap(ctx, title, W - pad * 2, 3);
  titleLines.forEach((l, i) => ctx.fillText(l, pad, 340 + i * 84));

  // 비율 바. 제목이 몇 줄이든 남는 공간의 가운데에 오게 한다
  const barH = 96;
  const barW = W - pad * 2;
  const groupH = barH + (myChoice ? 234 : 150);
  const zoneTop = 340 + titleLines.length * 84 + 40;
  const zoneBottom = H - 230;
  const barY = Math.round(zoneTop + Math.max(0, (zoneBottom - zoneTop - groupH) / 2));

  ctx.fillStyle = MUTED;
  ctx.font = `600 28px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('니 편', pad, barY - 32);
  ctx.textAlign = 'right';
  ctx.fillText('내 편', W - pad, barY - 32);
  ctx.textAlign = 'left';

  if (enough) {
    const wB = Math.max(barW * (pctB / 100), 8);
    ctx.save();
    roundRect(ctx, pad, barY, barW, barH, 20);
    ctx.clip();
    ctx.fillStyle = MY_SIDE;
    ctx.fillRect(pad, barY, barW, barH);
    ctx.fillStyle = YOUR_SIDE;
    ctx.fillRect(pad, barY, wB, barH);
    ctx.restore();

    // 한쪽이 아주 작으면 숫자가 막대를 넘친다. 그때는 막대 바깥에 쓴다
    const baseline = barY + barH / 2 + 16;
    ctx.font = `800 44px ${FONT}`;
    const fits = (label: string, seg: number) => ctx.measureText(label).width + 56 <= seg;

    const lb = `${pctB}%`;
    if (fits(lb, wB)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(lb, pad + 28, baseline);
    } else {
      ctx.fillStyle = YOUR_SIDE;
      ctx.fillText(lb, pad + wB + 24, baseline);
    }

    const ra = `${pctA}%`;
    ctx.textAlign = 'right';
    if (fits(ra, barW - wB)) {
      ctx.fillStyle = INK;
      ctx.fillText(ra, W - pad - 28, baseline);
    } else {
      ctx.fillStyle = MY_SIDE;
      ctx.fillText(ra, pad + wB - 24, baseline);
    }
    ctx.textAlign = 'left';
  } else {
    // 표가 적으면 퍼센트 대신 점으로 센다. 적은 표본을 %로 부풀리지 않는다
    roundRect(ctx, pad, barY, barW, barH, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    const dotR = 14;
    const gap = 46;
    let x = pad + 34;
    for (let i = 0; i < votesB; i++, x += gap) {
      ctx.beginPath(); ctx.arc(x, barY + barH / 2, dotR, 0, Math.PI * 2);
      ctx.fillStyle = YOUR_SIDE; ctx.fill();
    }
    x = W - pad - 34;
    for (let i = 0; i < votesA; i++, x -= gap) {
      ctx.beginPath(); ctx.arc(x, barY + barH / 2, dotR, 0, Math.PI * 2);
      ctx.fillStyle = MY_SIDE; ctx.fill();
    }
  }

  // 표 수
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`${votesB}표`, pad, barY + barH + 54);
  ctx.textAlign = 'right';
  ctx.fillText(`${votesA}표`, W - pad, barY + barH + 54);
  ctx.textAlign = 'left';

  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(
    enough ? `총 ${total}명이 편을 갈랐어요` : `아직 ${total}명이 투표했어요`,
    pad,
    barY + barH + 130
  );

  // 내가 고른 쪽. 다수/소수 판정은 하지 않는다
  if (myChoice) {
    const label = myChoice === 'A' ? '내 편' : '니 편';
    const color = myChoice === 'A' ? MY_SIDE : YOUR_SIDE;
    ctx.font = `700 30px ${FONT}`;
    const text = `나는 ${label}`;
    const tw = ctx.measureText(text).width;
    roundRect(ctx, pad, barY + barH + 168, tw + 56, 66, 33);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(text, pad + 28, barY + barH + 211);
  }

  // 마무리
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('당신은 어느 쪽인가요?', pad, H - 128);
  ctx.fillStyle = MUTED;
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText('thinkerbell-eight.vercel.app', pad, H - 76);
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  drawShareCard(canvas, input);
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';

/**
 * 이미지 공유 → 링크 공유 → 링크 복사 순으로 내려간다.
 * 브라우저마다 되는 게 달라서 한 단계 실패했다고 아무것도 안 되면 안 된다.
 */
export async function shareResult(input: ShareCardInput, url: string): Promise<ShareOutcome> {
  const text = `"${input.title}" — 당신은 어느 쪽인가요?`;

  try {
    const blob = await renderShareCard(input);
    if (blob) {
      const file = new File([blob], 'nipyeon-result.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text, title: '니편내편' });
        return 'shared';
      }
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'cancelled';
  }

  try {
    if (navigator.share) {
      await navigator.share({ title: '니편내편', text, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'cancelled';
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** 공유시트가 없는 환경(주로 데스크톱)을 위한 이미지 저장 */
export async function downloadShareCard(input: ShareCardInput): Promise<ShareOutcome> {
  const blob = await renderShareCard(input);
  if (!blob) return 'failed';
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = '니편내편-투표결과.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return 'downloaded';
}
