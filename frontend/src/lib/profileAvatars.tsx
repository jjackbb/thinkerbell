import React from 'react';
import { User } from 'lucide-react';

/*
  프로필 이미지는 사진 대신 미리 준비한 아이콘 중에서 고른다.
  익명 서비스라 실제 얼굴 사진이 퍼질 일이 없고, 사진 보관함(Storage)이 없어도
  닉네임처럼 계정 정보(user_metadata.avatar)에 이름만 저장하면 된다.

  기본은 지금까지 쓰던 사람 아이콘이고, 나머지는 사연을 털어놓을 때의 감정을
  담은 표정이다. 기성 이모지를 옮기지 않고 아이콘 선 굵기(2px·둥근 끝)에 맞춰
  직접 그렸다. 원 전체가 얼굴이고 눈·입만 얹는다.
  색은 index.css 토큰 값(내 편 코랄·니 편 인디고·오닉스)에서만 고른다.
  검은 프로필 배너 위에 올라가므로 바탕은 모두 배너보다 밝다.
*/
export type ProfileAvatarId =
  | 'user' | 'smile' | 'grin' | 'angry' | 'upset'
  | 'suspicious' | 'shocked' | 'sigh' | 'pout' | 'awkward';

type FaceProps = { accent: string };

type AvatarStyle = {
  label: string;
  bg: string;
  fg: string;
  accent: string;
  /** 원 전체를 채우는 표정. 없으면 기본 사람 아이콘을 가운데에 그린다 */
  Face?: React.FC<FaceProps>;
};

const Dot = ({ x, y, r = 1.15 }: { x: number; y: number; r?: number }) => (
  <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
);

const Smile: React.FC<FaceProps> = () => (<>
  <Dot x={8.6} y={10} /><Dot x={15.4} y={10} />
  <path d="M8.6 14.2c.9 1.5 2.1 2.2 3.4 2.2s2.5-.7 3.4-2.2" />
</>);

const Grin: React.FC<FaceProps> = () => (<>
  <path d="M7.2 10.4q1.4-1.9 2.8 0M14 10.4q1.4-1.9 2.8 0" />
  <path d="M8 13.4h8c0 2.4-1.8 4.1-4 4.1s-4-1.7-4-4.1z" fill="currentColor" />
</>);

const Angry: React.FC<FaceProps> = () => (<>
  <path d="M7 7.6l3 1.5M17 7.6l-3 1.5" />
  <Dot x={8.7} y={11.2} /><Dot x={15.3} y={11.2} />
  <path d="M9 16.6q3-2.4 6 0" />
</>);

// 억울함: 눈썹 안쪽이 올라가고 입이 떨리며 눈물이 맺힌다
const Upset: React.FC<FaceProps> = ({ accent }) => (<>
  <path d="M7 9l3-1.3M17 9l-3-1.3" />
  <Dot x={8.7} y={11} /><Dot x={15.3} y={11} />
  <path d="M9 16.4q1.5-1.5 3 0t3 0" />
  <path d="M16.9 12.6c.75 1 1.1 1.7 1.1 2.2a1.1 1.1 0 0 1-2.2 0c0-.5.35-1.2 1.1-2.2z" fill={accent} stroke="none" />
</>);

// 의심: 한쪽 눈썹만 올라가고 눈을 가늘게 뜬다
const Suspicious: React.FC<FaceProps> = () => (<>
  <path d="M7 8.6l3 .5M14 7.6q1.5-1.1 3 0" />
  <path d="M7.4 11h2.6M14 11h2.6" />
  <Dot x={9.2} y={11} r={0.9} /><Dot x={15.8} y={11} r={0.9} />
  <path d="M9.6 16.2l4.8-.8" />
</>);

const Shocked: React.FC<FaceProps> = () => (<>
  <path d="M7 7q1.5-1 3 0M14 7q1.5-1 3 0" />
  <circle cx={8.6} cy={10.4} r={1.5} /><circle cx={15.4} cy={10.4} r={1.5} />
  <ellipse cx={12} cy={16} rx={1.6} ry={1.9} />
</>);

// 한숨: 눈을 감고 입김이 빠져나간다
const Sigh: React.FC<FaceProps> = ({ accent }) => (<>
  <path d="M7.2 10.6q1.4 1.2 2.8 0M14 10.6q1.4 1.2 2.8 0" />
  <path d="M10.6 15.6h2" />
  <circle cx={15.4} cy={15.4} r={0.9} fill={accent} stroke="none" />
  <circle cx={17.4} cy={14.4} r={0.65} fill={accent} stroke="none" />
</>);

// 삐짐: 입을 오므리고 볼이 붉어진다
const Pout: React.FC<FaceProps> = ({ accent }) => (<>
  <Dot x={8.6} y={10.4} /><Dot x={15.4} y={10.4} />
  <path d="M10.6 16.2l1.4-1.1 1.4 1.1" />
  <ellipse cx={6.8} cy={13.6} rx={1.4} ry={0.85} fill={accent} stroke="none" />
  <ellipse cx={17.2} cy={13.6} rx={1.4} ry={0.85} fill={accent} stroke="none" />
</>);

// 머쓱: 웃는데 식은땀이 난다
const Awkward: React.FC<FaceProps> = ({ accent }) => (<>
  <path d="M7.4 10.4h2.4M14.2 10.4h2.4" />
  <path d="M9 15.2q1.5 1.1 3 0t3 0" />
  <path d="M17.6 4.9c.8 1.1 1.2 1.8 1.2 2.4a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.3 1.2-2.4z" fill={accent} stroke="none" />
</>);

export const DEFAULT_AVATAR: ProfileAvatarId = 'user';

export const PROFILE_AVATARS: Record<ProfileAvatarId, AvatarStyle> = {
  user:       { label: '기본',   bg: '#FF6B5A', fg: '#1C1C1C', accent: '#FFFFFF' },
  smile:      { label: '미소',   bg: '#FF6B5A', fg: '#1C1C1C', accent: '#FFFFFF', Face: Smile },
  grin:       { label: '신남',   bg: '#FFFFFF', fg: '#D6452F', accent: '#FF6B5A', Face: Grin },
  angry:      { label: '화남',   bg: '#D6452F', fg: '#FFFFFF', accent: '#1C1C1C', Face: Angry },
  upset:      { label: '억울',   bg: '#6C7BE8', fg: '#FFFFFF', accent: '#FFFFFF', Face: Upset },
  suspicious: { label: '의심',   bg: '#f3f4f5', fg: '#1C1C1C', accent: '#6C7BE8', Face: Suspicious },
  shocked:    { label: '놀람',   bg: '#6C7BE8', fg: '#1C1C1C', accent: '#FFFFFF', Face: Shocked },
  sigh:       { label: '한숨',   bg: '#FFFFFF', fg: '#4553C4', accent: '#6C7BE8', Face: Sigh },
  pout:       { label: '삐짐',   bg: '#FFFFFF', fg: '#1C1C1C', accent: '#FF6B5A', Face: Pout },
  awkward:    { label: '머쓱',   bg: '#FF6B5A', fg: '#1C1C1C', accent: '#FFFFFF', Face: Awkward },
};

export const PROFILE_AVATAR_IDS = Object.keys(PROFILE_AVATARS) as ProfileAvatarId[];

/** 저장된 값이 목록에 없으면(예전 계정·잘못된 값) 기본 아이콘으로 보여준다 */
export function normalizeAvatarId(value: unknown): ProfileAvatarId {
  return typeof value === 'string' && value in PROFILE_AVATARS ? value as ProfileAvatarId : DEFAULT_AVATAR;
}

export const ProfileAvatar: React.FC<{ id?: string; className?: string; iconClassName?: string }> = ({
  id, className = 'w-16 h-16', iconClassName = 'w-8 h-8',
}) => {
  const avatar = PROFILE_AVATARS[normalizeAvatarId(id)];
  const { Face } = avatar;
  return (
    <div
      className={`${className} rounded-full flex items-center justify-center shrink-0 overflow-hidden`}
      style={{ backgroundColor: avatar.bg, color: avatar.fg }}
    >
      {Face ? (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor"
          strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <Face accent={avatar.accent} />
        </svg>
      ) : (
        <User className={iconClassName} aria-hidden="true" />
      )}
    </div>
  );
};
