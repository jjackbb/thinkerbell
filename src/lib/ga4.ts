/**
 * GA4 자리.
 *
 * 측정 ID(`G-XXXXXXXXXX`)는 사람이 GA4 콘솔에서 만들어야 한다. 그래서 **코드를
 * 고치지 않고 환경변수만 넣으면 붙도록** 만들어 뒀다.
 *
 * 붙이는 방법:
 *   1. GA4에서 웹 데이터 스트림을 만들고 측정 ID를 받는다.
 *   2. Vercel → Settings → Environment Variables 에 `VITE_GA4_ID` 로 넣는다.
 *      (로컬에서 보려면 `.env`에도 같은 줄을 넣는다)
 *   3. Deployments 에서 Redeploy.
 *
 * ID가 없으면 아무 일도 하지 않는다. 즉 **안 넣어도 서비스는 그대로 돌아간다.**
 * 계측의 주력은 Supabase `events` 테이블이고(`src/lib/events.ts`), GA4는 병행이다.
 * 9/4 당일 저녁에 SQL로 퍼널을 바로 봐야 하는데 GA4 상세 리포트는 하루 이상 걸린다.
 */

export function setupGA4(): void {
  const id = import.meta.env.VITE_GA4_ID as string | undefined;
  if (!id) return;

  /* 이미 붙어 있으면 두 번 붙이지 않는다 (개발 중 새로고침 대비) */
  if (document.querySelector(`script[data-ga4="${id}"]`)) return;

  const loader = document.createElement('script');
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  loader.dataset.ga4 = id;
  document.head.appendChild(loader);

  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id);
}
