import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, {
  define: { 'import.meta.env.VITE_EMAIL_CHECK_ENABLED': JSON.stringify(process.env.PRIVACY_EMAIL_CHECK_ENABLED === 'true' ? 'true' : 'false') },
});
