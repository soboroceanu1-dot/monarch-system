'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {approvedAsset,attachImage}=require('../../assets/graphics/final-assets.js');
const manifest=require('../../assets/graphics/v9.3/manifest.json');
const copy=()=>JSON.parse(JSON.stringify(manifest));
class ImageStub extends EventTarget { constructor(){super();this.hidden=false;this.src='';} }
function approved(id){const m=copy(),a=m.assets.find(a=>a.id===id);m.integration_enabled=true;a.validation={status:'passed',sha256:'a'.repeat(64)};a.visual_review={status:'approved',approved_sha256:'a'.repeat(64)};return m;}

test('disabled, missing, unapproved and stale hashes cannot select final images',()=>{
 assert.equal(approvedAsset(manifest,'monarch_misiuni'),null);
 const m=approved('monarch_misiuni');assert.ok(approvedAsset(m,'monarch_misiuni'));
 m.assets.find(a=>a.id==='monarch_misiuni').visual_review.approved_sha256='b'.repeat(64);
 assert.equal(approvedAsset(m,'monarch_misiuni'),null);
 assert.equal(approvedAsset(null,'missing'),null);
});
test('absent icon preserves HTML fallback without requesting concept artwork',()=>{
 const image=new ImageStub(),glyph={hidden:true};attachImage(image,manifest,'monarch_misiuni',glyph);
 assert.equal(image.hidden,true);assert.equal(glyph.hidden,false);assert.equal(image.src,'');
});
test('absent character uses intact SVG; failed fallback terminates without retry loop',()=>{
 const image=new ImageStub(),label={hidden:true};attachImage(image,manifest,'aether_monarch',label);
 assert.equal(image.src,'assets/characters/aether-placeholder.svg');
 image.dispatchEvent(new Event('load'));assert.equal(image.hidden,false);
 image.dispatchEvent(new Event('error'));assert.equal(image.hidden,true);assert.equal(label.hidden,false);
 const source=image.src;image.dispatchEvent(new Event('error'));assert.equal(image.src,source);
});
test('404 primary hero switches to panorama then HTML; listeners can be removed',()=>{
 const image=new ImageStub(),label={hidden:false},m=approved('hero_rank_e');
 const cleanup=attachImage(image,m,'hero_rank_e',label);
 assert.match(image.src,/hero_rank_e.webp$/);
 image.dispatchEvent(new Event('error'));assert.equal(image.src,'assets/scenes/monarch-castle-panorama.webp');
 image.dispatchEvent(new Event('error'));assert.equal(image.hidden,true);assert.equal(label.hidden,false);
 cleanup();image.dispatchEvent(new Event('load'));assert.equal(image.hidden,true);
});
test('unknown IDs and duplicate approved IDs fail closed',()=>{
 assert.equal(approvedAsset(manifest,'unknown'),null);
 const m=approved('nav_acasa');m.assets.push({...m.assets.find(a=>a.id==='nav_acasa')});
 assert.equal(approvedAsset(m,'nav_acasa'),null);
});
