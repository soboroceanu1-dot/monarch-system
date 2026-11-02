'use strict';
const assert=require('node:assert/strict');
// Source-space rectangles include crown/hair, face, neck and upper-chest details. They are review guards,
// not alpha detection; full lower-body containment is deliberately not required for portraits.
async function assertHeadFraming(page,label){
 const results=[];
 for(const image of await page.locator('.aether-character,.aether-portrait').all()){
  await image.evaluate(el=>el.decode());
  const data=await image.evaluate(el=>{
   const b=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect(),fallback=el.getAttribute('src').endsWith('aether-placeholder.svg');
   const head=fallback?[215,60,385,278]:[300,60,620,420];
   const coordinates=fallback?[600,700]:[el.naturalWidth,el.naturalHeight]; // SVG viewBox, not Chromium's density-dependent natural size.
   const rect={x:b.x+head[0]*b.width/coordinates[0],y:b.y+head[1]*b.height/coordinates[1],width:(head[2]-head[0])*b.width/coordinates[0],height:(head[3]-head[1])*b.height/coordinates[1]};
   return {source:el.getAttribute('src'),fallback,natural:[el.naturalWidth,el.naturalHeight],image:{x:b.x,y:b.y,width:b.width,height:b.height},window:{x:p.x,y:p.y,width:p.width,height:p.height},head:rect,fit:getComputedStyle(el).objectFit,hero:el.classList.contains('aether-character')};
  });
  const h=data.head,w=data.window;
  assert.equal(data.fit,'contain',label+': no stretching');
  assert.ok(Math.abs(data.image.width/data.image.height-data.natural[0]/data.natural[1])<.005,label+': intrinsic proportions preserved');
  assert.ok(h.x>=w.x-1&&h.y>=w.y-1&&h.x+h.width<=w.x+w.width+1&&h.y+h.height<=w.y+w.height+1,label+': complete protected head/crown '+JSON.stringify(data));
  if(data.hero){const text=await page.locator('.hero-progress').boundingBox();assert.ok(h.x+h.width<=text.x+1,label+': head does not overlap rank/XP');}
  results.push(data);
 }
 return results;
}
module.exports={assertHeadFraming};
