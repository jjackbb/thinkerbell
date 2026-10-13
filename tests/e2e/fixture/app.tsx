import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../../frontend/src/App';
import { enableAppFixture, switchAppAccount, emitAppInvalidation } from '../support/supabase';
import './styles.css';
enableAppFixture();
localStorage.setItem('nipyeon_analytics_consent_v1','refused');
function AppFixture(){
 const [invalidated,setInvalidated]=useState('');
 return <>
  <aside aria-label="실제 App 합성 시험 제어" style={{position:'fixed',top:0,right:0,zIndex:10000,background:'white',padding:8}}>
   <button onClick={()=>switchAppAccount('owner-b')}>시험 계정 B 전환</button>
   <button onClick={()=>void emitAppInvalidation().then(count=>setInvalidated(`complete:${count}`))}>시험 접근 제한</button>
   <button onClick={()=>void emitAppInvalidation(false).then(count=>setInvalidated(`complete:${count}`))}>시험 댓글 변경</button>
   <output data-testid="app-invalidation">{invalidated}</output>
  </aside>
  <App/>
 </>;
}
createRoot(document.getElementById('root')!).render(<AppFixture/>);
