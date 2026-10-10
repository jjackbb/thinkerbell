# 파비콘 기준 — 배포 헤더 로고 재사용

사용자가 지정한 로고는 공개 Vercel 헤더 니편내편 옆의 코랄색 Material Symbols Outlined `terminal`입니다. 기존 보라·코랄 두 칸 favicon.svg는 이 로고와 달랐으므로 교체했습니다.

2026-10-09 공개 번들 main-CnBHIpJE.js에서 header terminal/class color#FF6B5A, CSS main-kfChtOsX.css에서 FILL0/wght400/GRAD0/opsz24를 직접 확인했습니다. font-bold 클래스가 있어도 명시적 variation wght400이 적용됩니다. Google 공식 terminal_24px.svg 경로를 변형하지 않고 fill만 헤더 색으로 지정했습니다. PNG는 같은 경로를 래스터화하고 ICO는32px PNG를 담습니다. 새 심볼이나 배경 디자인을 추가하지 않았습니다.

원본: https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/terminal/materialsymbolsoutlined/terminal_24px.svg
출처/라이선스: Google Material Design Icons, Apache-2.0 https://github.com/google/material-design-icons/blob/master/LICENSE

앱/소개 링크·manifest·Apple 아이콘은 같은 자산을 사용합니다. 로컬 빌드 확인과 공개 배포 확인은 구분하며 G24 완료 체크는 미배포 상태에서 하지 않습니다.
