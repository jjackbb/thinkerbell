import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setupGA4} from './lib/ga4';
import {enforceAnalyticsRefusal} from './lib/analyticsConsent';

/* 이전 방문에서 거부했다면 태그 실행 전에 GA4 전송을 차단한다. */
enforceAnalyticsRefusal();
setupGA4();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
