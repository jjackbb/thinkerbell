/** No real client is constructed. Tokens label in-memory fixture accounts only. */
let accountId = 'owner-a';
let appFixture = false;
let rpcSequence=0;
const authListeners = new Set<(event:string,session:any)=>void>();
const channelListeners = new Map<object,(payload:any)=>Promise<void>|void>();
const session = () => accountId === 'guest' ? null : { user: { id:accountId, email:`${accountId}@example.invalid`, user_metadata:{nickname:accountId} }, access_token:`fixture:${accountId}` };
export function setFixtureAccount(id:string) { accountId=id; }
export function enableAppFixture() { appFixture=true; }
export function switchAppAccount(id:string) { accountId=id; for(const callback of authListeners)callback('SIGNED_IN',session()); }
export async function emitAppInvalidation(accessChanged=true) {
 const callbacks=[...channelListeners.values()];
 await Promise.all(callbacks.map(callback=>callback({new:{story_id:'story',access_changed:accessChanged}})));
 return callbacks.length;
}
export const supabase: any = {
 auth:{
  getSession:async()=>({data:{session:session()}}),
  getUser:async()=>({data:{user:session()?.user??null}}),
  onAuthStateChange:(callback:any)=>{authListeners.add(callback);return {data:{subscription:{unsubscribe:()=>authListeners.delete(callback)}}};},
 },
 from:(table:string)=>{
  if(!appFixture || !['ai_personas','story_hides','comment_likes','votes'].includes(table))throw new Error(`Unexpected database access in synthetic UI fixture: ${table}`);
  const query:any={select:()=>query,order:()=>query,eq:()=>query,then:(resolve:any,reject:any)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};
  return query;
 },
 rpc:async(name:string,args:any)=>{
  if(!appFixture)throw new Error(`Unexpected database RPC in component fixture: ${name}`);
  if(name==='is_admin')return {data:false,error:null};
  if(name==='balance_game_state')return {data:{},error:null};
  if(!['read_visible_stories','read_visible_comments'].includes(name))throw new Error(`Unexpected database RPC in App fixture: ${name}`);
  const response=await fetch(`/fixture/rpc/${name}?call=${++rpcSequence}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args??{})});
  if(!response.ok)throw new Error('Fixture RPC failed');return response.json();
 },
 channel:()=>{
  if(!appFixture)throw new Error('Unexpected realtime channel in component fixture');
  const channel:any={on:(_event:any,_filter:any,callback:any)=>{channelListeners.set(channel,callback);return channel;},subscribe:()=>channel};
  return channel;
 },
 removeChannel:async(channel:object)=>{channelListeners.delete(channel);},
};
