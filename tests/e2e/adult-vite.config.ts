import {mergeConfig} from 'vite';
import base from './vite.config';
export default mergeConfig(base,{define:{
 'import.meta.env.VITE_ADULT_ELIGIBILITY_ENABLED':JSON.stringify(process.env.ADULT_TEST_ENABLED==='true'?'true':'false'),
 'import.meta.env.VITE_EMAIL_CHECK_ENABLED':JSON.stringify(process.env.ADULT_TEST_EMAIL==='true'?'true':'false'),
}});
