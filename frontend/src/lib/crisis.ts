/**
 * 위기 표현 감지.
 *
 * 이 서비스는 감정을 쏟아내는 곳이라 "짜증나 죽겠어", "배고파 죽겠다" 같은
 * 관용구가 일상적으로 쓰인다. 그래서 '죽겠-' 계열은 의도적으로 잡지 않고,
 * 자기 자신에게 향하는 명백한 표현만 걸러낸다. 오탐이 잦으면 사용자가
 * 안내 자체를 무시하게 되고, 그러면 정작 필요한 순간에도 안 읽힌다.
 *
 * 네트워크 없이 동작해야 하므로 판정은 전부 클라이언트에서 한다.
 */

const CRISIS_PATTERNS: RegExp[] = [
  /자살/,
  /자해/,
  /극단적\s*선택/,
  /죽고\s*싶/,
  /사라지고\s*싶/,
  /없어지고\s*싶/,
  /목숨을\s*끊/,
  /목\s*매(?!달리는)/,
  /뛰어내리/,
  /살고\s*싶지\s*않/,
  /살기\s*싫/,
  /태어나지\s*말/,
];

/** 관용적으로 쓰여 위기로 보지 않는 표현 (먼저 제거한 뒤 판정한다) */
const IDIOM_PATTERNS: RegExp[] = [
  /[가-힣]+\s*(?:서|아서|어서)?\s*죽겠/g,
  /죽을\s*것\s*같/g,
  /죽도록/g,
  /죽을\s*만큼/g,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;

  let cleaned = text;
  for (const idiom of IDIOM_PATTERNS) cleaned = cleaned.replace(idiom, ' ');

  return CRISIS_PATTERNS.some(p => p.test(cleaned));
}

/**
 * 상담 창구. 번호를 하드코딩해 두는 이유는, 위기 상황에서 네트워크나 외부
 * 링크에 의존하면 안 되기 때문이다. 2026년 위기 대응 프레임워크 연구에서
 * 어떤 앱이 깨진 단축링크로 사용자를 방치한 사례가 실패로 지목됐다.
 */
export const CRISIS_CONTACTS = {
  /** 2024-01-01 부로 분산돼 있던 번호가 109로 통합됐다. 24시간, 익명·비밀보장 */
  primary: { label: '자살예방상담전화', number: '109' },
  secondary: { label: '정신건강위기상담', number: '1577-0199' },
  youth: { label: '청소년전화', number: '1388' },
} as const;
