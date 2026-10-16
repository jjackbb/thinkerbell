import test from 'node:test';
import assert from 'node:assert/strict';
import { shareResult } from '../frontend/src/lib/shareCard.ts';
const input={title:'합성 공유 사연',votesA:8,votesB:2,myChoice:'A'};
const url='https://example.invalid/?story=synthetic-story';
const abort=()=>Object.assign(new Error('cancelled'),{name:'AbortError'});
function setup(t,{share,canShare,clipboard,renderFails=false,emptyBlob=false}={}){
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const context=new Proxy({measureText:text=>({width:text.length*10})},{get(target,key){return key in target?target[key]:()=>{};}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{share,canShare,clipboard:clipboard?{writeText:clipboard}:undefined}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){if(renderFails)throw new Error('canvas unavailable');return {getContext:()=>context,toBlob:callback=>callback(emptyBlob?null:new Blob(['synthetic-png'],{type:'image/png'}))};}}});
 t.after(()=>{for(const [name,descriptor]of [['navigator',oldNavigator],['document',oldDocument]]){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
}
test('image-share success includes the direct story URL, title, text and image',async t=>{
 let payload;setup(t,{canShare:()=>true,share:async data=>{payload=data;}});
 assert.equal(await shareResult(input,url),'shared');assert.equal(payload.url,url);assert.equal(payload.title,'니편내편');assert.match(payload.text,/합성 공유 사연/);assert.equal(payload.files[0].type,'image/png');
});
test('unsupported image sharing falls back to the link with no attached image',async t=>{
 let payload;setup(t,{canShare:()=>false,share:async data=>{payload=data;}});
 assert.equal(await shareResult(input,url),'shared');assert.equal(payload.url,url);assert.equal(payload.files,undefined);
});
test('image-share failure retries URL sharing',async t=>{
 const payloads=[];setup(t,{canShare:()=>true,share:async data=>{payloads.push(data);if(data.files)throw new Error('unsupported combination');}});
 assert.equal(await shareResult(input,url),'shared');assert.equal(payloads.length,2);assert.equal(payloads[1].url,url);
});
test('cancelled image share stops without trying links or clipboard',async t=>{
 let shares=0,copies=0;setup(t,{canShare:()=>true,share:async()=>{shares++;throw abort();},clipboard:async()=>{copies++;}});
 assert.equal(await shareResult(input,url),'cancelled');assert.equal(shares,1);assert.equal(copies,0);
});
test('cancelled URL share stops without clipboard',async t=>{
 let copies=0;setup(t,{canShare:()=>false,share:async()=>{throw abort();},clipboard:async()=>{copies++;}});
 assert.equal(await shareResult(input,url),'cancelled');assert.equal(copies,0);
});
test('canvas failure or missing native share still allows URL copy',async t=>{
 let copied;setup(t,{renderFails:true,clipboard:async data=>{copied=data;}});
 assert.equal(await shareResult(input,url),'copied');assert.match(copied,/합성 공유 사연/);assert.ok(copied.endsWith(url));
});
test('unavailable image and all delivery methods failing reports failure',async t=>{
 setup(t,{emptyBlob:true,share:async()=>{throw new Error('share failed');},clipboard:async()=>{throw new Error('clipboard denied');}});
 assert.equal(await shareResult(input,url),'failed');
});
