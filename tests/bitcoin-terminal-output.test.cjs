const {test}=require('node:test');const assert=require('node:assert/strict');
const {outputBetween}=require('./bitcoin-terminal.cjs');
test('right pane output excludes adjacent pane scrollback',()=>{
 const view=['left text       │ START      │','unrelated       │ VALUE=2    │','another command │ END        │'].join('\n');
 assert.equal(outputBetween(view,'START','END'),'VALUE=2');
});
test('left pane output excludes the right pane',()=>{
 const view=['│ START      │ right text','│ COUNTS=2,3 │ unrelated','│ END        │ right output'].join('\n');
 assert.equal(outputBetween(view,'START','END'),'COUNTS=2,3');
});
test('ordinary single-pane output keeps its contents',()=>{
 assert.equal(outputBetween('START\nVALUE=retained\nEND','START','END'),'VALUE=retained');
});
test('the echoed split marker literals are not completed output markers',()=>{
 assert.throws(()=>outputBetween("printf '%s%s' 'token' '_BEGIN'; printf '%s%s' 'token' '_END'",'token_BEGIN','token_END'));
});
