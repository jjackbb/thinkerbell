# 가입 인증 메일 발송 준비 — 2026-09-25

현재 계획은 [PLAN](../../PLAN.md)의 이메일 확인 가입이다. 사용자는 여러 개인 프로젝트에 재사용할 메일용 `jjackbb.com` 구매를 알렸고, 웹 주소는 `thinkerbell-eight.vercel.app`으로 유지하기로 했다. 영수증·등록 기간·실제 결제액은 읽지 않았다. 공개 DNS 조회에서는 Porkbun 네임서버 4개가 확인됐다. 이는 DNS 위임이며 발송 인증 완료를 뜻하지 않는다.

기존 Resend 계정은 마지막 직접 확인 시 Free 요금제·등록 도메인 0개였다. 이후 로컬 임시 API 키는 설정됐으나 이 실행 환경의 Resend API가 Cloudflare 1010으로 차단돼 현재 도메인 상태를 읽거나 변경할 수 없다. 사용자는 뒤이어 Resend 화면에서 `auth.jjackbb.com`의 DNS 레코드 5개를 복사해 제공했다. 공개 DNS 재조회에서 DKIM TXT와 SPF CNAME 2개, 추적용 CNAME 1개의 **값 일치**를 확인했다. 사용자는 Resend 상태가 **`Verified`**라고 확인했다. Supabase Auth의 Custom SMTP는 당시 **꺼져 있다**고 답했으나, 이후 발송 전용 키와 설정을 입력·저장했다고 확인했다. 실제 메일 도착은 아직 확인하지 못했다.

## 설정 목적과 순서

1. 사용자는 발송용 하위 도메인 `auth.jjackbb.com`과 발신 주소 `accounts@auth.jjackbb.com`을 선택했다. 여러 개인 프로젝트의 인증 메일에 이 주소를 재사용하고, 루트 도메인의 다른 메일 용도와 분리한다. [Resend 도메인 안내](https://resend.com/docs/dashboard/domains/introduction)는 발송 평판 분리를 위해 하위 도메인을 권장한다. 기존 Vercel 웹 주소는 바꾸지 않는다.
2. 기존 Resend 계정의 [Domains](https://resend.com/domains)에서 **Add Domain**을 누르고 `auth.jjackbb.com`을 입력한다. 발송 지역은 사용자가 선택한 **Tokyo (`ap-northeast-1`)**, 용도는 **Sending**으로 둔다. 받는 메일은 계획에 없으므로 Receiving은 켜지 않는다. Resend 도메인 화면의 **Records** 탭에 제시된 DNS 레코드를 정확히 읽는다. [도메인 추가 공식 절차](https://resend.com/docs/add-a-domain)
3. Porkbun의 `jjackbb.com` → **DNS** → **Add Record**에서 Resend가 표시한 레코드마다 종류·이름·값·MX 우선순위를 옮긴다. Porkbun의 Host는 `jjackbb.com`을 제외한 상대 이름이다. 예를 들어 Resend가 `send.auth.jjackbb.com`을 표시하면 Porkbun Host는 `send.auth`, `resend._domainkey.auth.jjackbb.com`이면 `resend._domainkey.auth`다. 레코드 **종류와 값은 예시를 쓰지 않는다.** Resend는 SPF를 TXT·MX 또는 CNAME으로 제시할 수 있다. [Resend 도메인 레코드 설명](https://resend.com/docs/dashboard/domains/manage-domains), [Resend의 Porkbun 안내](https://resend.com/docs/knowledge-base/porkbun)
4. Porkbun에 모두 저장한 뒤 Resend에서 **Verify DNS Records**를 눌러 `Verified` 상태를 확인한다. 공개 DNS 응답도 별도로 대조한다. Resend는 검증이 빠르면 약 15분, 전파에 따라 최대 72시간 걸릴 수 있다고 안내한다. [Resend 검증 절차](https://resend.com/docs/add-a-domain)
5. 도메인의 **Configuration** 탭에서 사용자가 선택한 **Enforced TLS**, **열람·클릭 추적 모두 끄기**를 확인한다. 2026-09-25 사용자는 추적 두 항목이 모두 꺼져 있고 TLS를 `Enforced`로 바꿔 저장했다고 확인했다. TLS를 지원하지 않는 받는 서버에는 인증 메일이 전달되지 않을 수 있다. 설정 상태는 사용자 보고이며 실제 전달은 별도 검증한다. [TLS 설정](https://resend.com/docs/dashboard/domains/tls), [추적 설정](https://resend.com/docs/dashboard/domains/tracking)
6. 발송 전용 Resend API 키를 생성해 Supabase Auth의 Custom SMTP에 연결한다. 공식 SMTP 안내의 서버는 `smtp.resend.com`, 사용자 이름은 `resend`, 비밀번호는 Resend API 키다. 비밀키를 문서·채팅·프론트 코드에 기록하지 않는다. SMTP 발송용 키는 Sending access로 제한할 수 있다. 기존 관리용 임시 키는 더는 필요하지 않다면 회수할 수 있다. [Resend SMTP](https://resend.com/docs/send-with-smtp), [API 키 권한](https://resend.com/changelog/new-api-key-permissions), [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
7. 외부 시험 주소로 가입 → 메일 도착 → 인증 링크 → 앱 복귀를 확인한다. 재발송·만료·실패 안내도 별도 확인한다. 테스트 전에는 가입 인증 메일 경로를 완료로 표시하지 않는다.

Resend 설정 화면 경로는 **Domains → `auth.jjackbb.com` 선택 → Configuration 탭**이다. 이 탭의 TLS 설정에서 `Enforced`, 추적 설정에서 Open/Click 모두 꺼짐을 확인한다. 화면 문구나 위치가 다르면 보이는 항목 이름을 받아 실제 설정과 대조한다. [Resend TLS 안내](https://resend.com/docs/dashboard/domains/tls), [추적 안내](https://resend.com/docs/dashboard/domains/tracking)

사용자는 처음에 AI가 Resend 도메인을 등록하는 방식을 선택했고, 로컬 `.env`에 임시 `RESEND_API_KEY`를 설정했다. 키 값은 출력하지 않았다. 하지만 Resend 도메인 목록 조회가 HTTP 403으로 거부됐다. 응답은 Resend 권한 오류가 아니라 Cloudflare `1010 browser_signature_banned`이며 **재시도하지 말라**고 명시한다. 따라서 이 실행 환경의 직접 API 호출을 중단했다. 사용자는 그 시점에는 **도메인 연결을 아직 하지 않았다**고 명확히 했다. 당시 공개 DNS에서 `resend._domainkey.auth.jjackbb.com`, `send.auth.jjackbb.com`, `links.auth.jjackbb.com` 조회 시 Porkbun의 기본 CNAME `uixie.porkbun.com`이 응답했다. 이 조회는 후속 레코드 발급 이전의 상태이며 DNS 인증은 확인되지 않았다.

### Resend 화면에서 받은 레코드와 Porkbun 입력 대조

2026-09-25 사용자가 `auth.jjackbb.com`의 인증 레코드를 복사해 제공했다. Porkbun의 관리 대상 도메인은 `jjackbb.com`이므로 아래 Host에는 `.jjackbb.com`을 덧붙이지 않는다. 값 안의 `\_`는 복사 텍스트의 마크다운 이스케이프이며 DNS 입력에는 역슬래시를 넣지 않는다. Resend 표시 TTL은 `Auto`이며, 공개 DNS에서 CNAME 3개의 TTL `600`을 확인했다. 아래는 사용자 제공 값과 공개 DNS의 **대조 기록**이다.

| 용도 | Porkbun Type | Porkbun Host | Porkbun Answer/Value |
| --- | --- | --- | --- |
| DKIM | TXT | `resend._domainkey.auth` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCtxqAqW81H87SHY4jy1NLbHiq/ewUyxZOniRbIPA7aUjBnIfw08X17OO8lCV6K+LNvVLiuPObZxWNcPhKDjGvJQT58eUNJhFx6B0JjYigXHtSoXHrmHnL/1O0F4CctkibHQ8J/3imCXDWNEoxbXSuqZluMCa00jGteO1IvDZihGQIDAQAB` |
| SPF 1 | CNAME | `rsend.auth` | `rsend-apne1.forge.rmta.net` |
| SPF 2 | CNAME | `send.auth` | `send.forge.rmta.net` |
| 추적용 호스트 | CNAME | `links.auth` | `links2.resend-dns.com` |

`links.auth` 레코드는 Resend 화면의 추적 하위 도메인 `links`에 대응한다. 사용자는 `links`를 입력해야 클릭 추적 체크를 해제할 수 있다고 확인했다. 추적용 CNAME은 발송 DKIM/SPF 인증과 별도지만, Resend가 제시한 호스트도 함께 등록하면 상태를 확인할 수 있다. DNS 레코드가 있어도 Resend의 열람·클릭 추적 체크박스는 **둘 다 꺼진 상태**로 유지한다. [Resend 추적 안내](https://resend.com/docs/dashboard/domains/tracking)에 따르면 추적은 체크박스 활성화와 추적 하위 도메인 인증이 모두 갖춰져야 작동한다.

선택 권장 항목인 DMARC는 Resend 화면에서 `Name: _dmarc`, `Value: v=DMARC1; p=none;`으로 표시됐다. 사용자는 여러 개인 프로젝트에 루트 도메인을 재사용할 계획에 맞춰 **루트 `_dmarc.jjackbb.com`**에 이 값을 게시하기로 확정하고 Porkbun에 저장했다고 답했다. 2026-09-25 공개 DNS 조회에서 `_dmarc.jjackbb.com` TXT 값 **`v=DMARC1; p=none;`**, TTL `600`을 확인했다. `_dmarc.auth`는 추가하지 않는다. `p=none`은 인증 실패 메일을 차단하지 않으며, 제공된 값에는 보고 주소 `rua`도 없어 보고서 수신도 설정되지 않는다. 강화 정책은 각 발송 서비스의 인증·실제 전달을 확인한 뒤 별도로 결정한다. [Resend DMARC 안내](https://resend.com/docs/dashboard/domains/dmarc), [하위 도메인 정책 설명](https://resend.com/blog/how-dmarc-applies-to-subdomains)

Porkbun DNS는 계정 관리키를 받지 않고 사용자가 직접 입력한다. 2026-09-25 공개 DNS 재조회에서 `resend._domainkey.auth.jjackbb.com`의 DKIM TXT가 사용자 제공 값과 일치했고, `rsend.auth.jjackbb.com` → `rsend-apne1.forge.rmta.net`, `send.auth.jjackbb.com` → `send.forge.rmta.net`, `links.auth.jjackbb.com` → `links2.resend-dns.com`도 확인했다. DMARC 공개 TXT도 위 값으로 확인했다. Resend `Verified`·Enforced TLS·추적 끄기는 사용자의 대시보드 확인이며 AI가 내부 화면을 직접 읽은 결과는 아니다. 다음에는 SMTP 연결과 실제 발송을 확인한다. 관리용 임시 키는 더는 필요하지 않다면 Resend에서 회수할 수 있다.

### Supabase Auth SMTP에 연결할 준비값

연결 대상은 니편내편 Supabase 프로젝트 `vzhyhadjtaqbapicjrco`다. 사용자는 Custom SMTP에 발송 전용 Resend 키와 아래 발신 설정을 모두 입력·저장했다고 확인했다. 키 값은 받거나 읽지 않았다. **Resend API Keys**에서 이름 `thinkerbell-auth-smtp`를 제안하고, 권한 `Sending access`, 범위 `auth.jjackbb.com`인 새 키를 만든다. 이름은 Resend 안의 관리용 표시이며 이용자 메일에 나타나지 않는다. 로컬 `.env`의 임시 Full access 관리키는 SMTP 비밀번호로 재사용하지 않는다. 키 값은 채팅·문서·프론트엔드·Vercel 공개 환경변수에 적지 않고 Supabase Auth 설정의 비밀번호 칸에만 직접 붙여 넣는다. [Resend 키 권한](https://resend.com/changelog/new-api-key-permissions)

| Supabase Custom SMTP 항목 | 입력값 |
| --- | --- |
| Sender email | `accounts@auth.jjackbb.com` |
| Sender name | `니편내편` — 사용자 확인 |
| Host | `smtp.resend.com` |
| Port | `465` (TLS로 즉시 연결) |
| Username | `resend` |
| Password | 새 Sending access API 키 — 값은 기록하지 않음 |

[Resend SMTP 설정](https://resend.com/docs/send-with-smtp)은 465와 587을 모두 지원한다. 여기의 포트 465는 **Supabase→Resend** 연결의 암호화이고, Resend 도메인 Configuration의 Enforced TLS는 **Resend→받는 메일 서버** 연결의 암호화다. 둘은 별도 설정이다. Supabase의 [Custom SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)에 따라 설정한 뒤 실제 외부 주소로 가입 메일을 시험한다. 현재 앱의 `WelcomeModal` 가입 호출은 `emailRedirectTo`를 따로 넘기지 않으므로 Supabase Auth의 **Site URL**이 공개 주소 `https://thinkerbell-eight.vercel.app/`을 가리켜야 확인 링크가 앱으로 돌아온다. 사용자는 실제 입력값에 따옴표가 없고 이 주소로 저장했다고 확인했다. **Authentication → Sign In / Providers → Email**의 `Confirm Email`은 마지막 사용자 확인에서 **꺼짐**이다. [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase 일반 설정](https://supabase.com/docs/guides/auth/general-configuration)

2026-09-25 니편내편 **읽기 전용 Supabase MCP**로 `auth.users`의 개인 정보 없는 집계만 조회했다: 전체 45명, `email_confirmed_at IS NULL` 0명, 확인 시각이 있는 계정 45명이다. 현재 45명의 기존 계정이 설정 변경만으로 미확인 상태가 되지는 않을 것으로 판단한다. 다만 `Confirm Email`이 꺼져 있던 기간에는 자동 확인될 수 있었고 계정별 가입 당시 설정은 확인하지 못했으므로, 이 집계는 과거 가입자의 메일 소유권 확인 증거가 아니다. 새 가입에 이메일 확인을 요구하는 방향은 [PLAN](../../PLAN.md)에 이미 확정돼 있다. **Custom SMTP가 꺼진 상태에서 먼저 Confirm Email을 켜면 일반 외부 주소에 인증 메일을 보낼 수 없다.** [Supabase 공식 SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)에 따르면 기본 발송기는 프로젝트 팀의 사전 허용 주소로만 전송한다. 따라서 발송 전용 Resend 키 생성 → Supabase Custom SMTP 설정·저장 → 가입 안내 화면 단독 배포·브라우저 기본 동작 확인 → `Confirm Email` 켜기 → 실제 외부 주소로 가입·메일 도착·링크 복귀 시험 순서로 진행한다. 키 생성과 SMTP 설정 저장은 사용자 확인이며 관리 화면을 직접 읽거나 실제 발송을 시험하지는 못했다. 인증 안내 화면 코드의 공개 JS 반영은 확인했지만 브라우저 기본 동작·실제 발송은 미확인이다.

기존 45개 계정은 가입 당시 메일 소유권 확인 여부가 불확실하므로 새 정책의 소급 적용 대상으로 **임의 변경하지 않는다**. 사용자는 기존 45개 계정을 그대로 이용하게 두고 **새 가입부터** 이메일 확인을 적용하기로 결정했다. 기존 계정의 메일 소유권을 소급 검증하거나 상태를 바꾸지 않는다. 어느 쪽이든 현재 `email_confirmed_at`만으로 과거 메일 소유권을 검증했다고 표현하지 않는다.

기존 `WelcomeModal`에는 가입 요청 후 **메일 확인 안내 상태나 재발송 버튼이 없었다**. 2026-09-25 로컬 코드에 가입 응답의 세션이 없을 때 확인 메일 요청 안내·재발송·다른 주소 재시도·확인 전 로그인 오류 안내를 추가했다. 렌더 중 조건부 Hook 호출도 수정했다. `npm run lint`, `npm run build`, `git diff --check`는 통과했다. 이 결과는 **로컬 코드·빌드 확인**이며 메일 발송·수신·만료 링크·앱 복귀·운영 배포 검증은 아니다. 후속 로컬 코드에서 Supabase의 `otp_expired` 복귀를 감지해 가입 이메일을 다시 입력하고 재발송할 수 있는 화면도 추가했다. 인증 화면 단독 커밋 `7b688e2`를 GitHub에 푸시하고 공개 HTML·JS의 HTTP 200 및 새 문구·`otp_expired` 처리 문자열을 확인했다. 자동 Chrome 화면 검사는 30초 시간 초과로 판정하지 못했으며, 만료 링크로 실제 복귀한 결과도 아직 시험하지 않았다. [PLAN](../../PLAN.md)의 전체 가입 계약을 실제 외부 주소로 검증해야 한다.
