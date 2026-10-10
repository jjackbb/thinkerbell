import test from 'node:test';
import assert from 'node:assert/strict';
import { canContinueAiNavigation } from '../frontend/src/lib/aiNavigation.ts';
const story={id:'synthetic-story',authorId:'owner',visibility:'public'};
const base={generation:2,currentGeneration:2,account:'reader',currentAccount:'reader',storyId:story.id,stories:[story],hiddenStoriesReady:true,hiddenStoryIds:[]};
test('a late quota response cannot reopen a cancelled selection or previous account',()=>{
 assert.equal(canContinueAiNavigation(base),true);
 assert.equal(canContinueAiNavigation({...base,currentGeneration:3}),false);
 assert.equal(canContinueAiNavigation({...base,currentAccount:'other'}),false);
 assert.equal(canContinueAiNavigation({...base,currentAccount:null}),false);
});
test('deleted, newly private, hidden, blind and adult sources invalidate pending navigation',()=>{
 assert.equal(canContinueAiNavigation({...base,stories:[]}),false);
 for(const patch of [{visibility:'private'},{isHidden:true},{isBlind:true},{isAdult:true}]) assert.equal(canContinueAiNavigation({...base,stories:[{...story,...patch}]}),false);
 assert.equal(canContinueAiNavigation({...base,hiddenStoryIds:[story.id]}),false);
 assert.equal(canContinueAiNavigation({...base,hiddenStoriesReady:false}),false);
 assert.equal(canContinueAiNavigation({...base,account:'owner',currentAccount:'owner',stories:[{...story,visibility:'private'}]}),true);
});
