import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AdultEligibilityBanner} from '../../../frontend/src/components/AdultEligibilityBanner';
import {WelcomeModal} from '../../../frontend/src/components/WelcomeModal';
import {setFixtureAccount} from '../support/supabase';
import './styles.css';
const emailCheckToken=new URLSearchParams(location.search).has('verifiedEmail')?'synthetic-email-link':null;
function Fixture(){const [account,setAccount]=useState('owner-a');const [open,setOpen]=useState(Boolean(emailCheckToken));return <><nav><button onClick={()=>setOpen(true)}>가입 보기</button><button onClick={()=>{setFixtureAccount('owner-b');setAccount('owner-b');}}>계정 전환</button><button onClick={()=>{setFixtureAccount('guest');setAccount('guest');}}>로그아웃</button></nav>{import.meta.env.VITE_ADULT_ELIGIBILITY_ENABLED==='true'&&account!=='guest'&&<AdultEligibilityBanner key={account} userId={account}/>}<WelcomeModal isOpen={open} emailCheckToken={emailCheckToken} onComplete={()=>{}} onGuestBrowse={()=>setOpen(false)} onSignupCreated={()=>{}} canStartSignupLogin={()=>false} onPasswordRecoveryComplete={()=>{}}/></>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
