import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setupGA4} from './lib/ga4';

/* 측정 ID(VITE_GA4_ID)가 있을 때만 붙는다. 없으면 아무 일도 하지 않는다 */
setupGA4();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
