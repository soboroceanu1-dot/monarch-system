/* Approved-art integration helper. No progress or storage access. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MonarchFinalAssets = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function approvedAsset(manifest, id) {
    if (!manifest || !Array.isArray(manifest.assets) || manifest.integration_enabled !== true) return null;
    const matches = (manifest.assets || []).filter(asset => asset.id === id);
    if (matches.length !== 1) return null;
    const asset = matches[0], validation = asset.validation || {}, review = asset.visual_review || {};
    if (validation.status !== 'passed' || review.status !== 'approved' ||
        !/^[a-f0-9]{64}$/.test(validation.sha256 || '') || review.approved_sha256 !== validation.sha256) return null;
    if (!/^assets\/graphics\/v9\.3\/(hero|character|banners|monarch|attributes|nav)\/[a-z0-9_]+\.(png|webp)$/.test(asset.path)) return null;
    return asset;
  }
  // Caller supplies the intact HTML/glyph fallback; no sizing or layout styles are changed.
  // Return cleanup and call it before reusing an element for a different resource.
  function attachImage(image, manifest, id, fallbackElement) {
    const assets = manifest && Array.isArray(manifest.assets) ? manifest.assets : [];
    const asset = assets.find(a => a.id === id);
    const approved = approvedAsset(manifest, id);
    const defaultSource = /^aether_rank_[edcbas]$/.test(id) ? 'assets/characters/aether-placeholder.svg' : /^hero_rank_[edcbas]$/.test(id) || id === 'banner_compania_mea' ? 'assets/scenes/monarch-castle-panorama.webp' : null;
    const fallback = asset && asset.fallback || {kind:'image',src:defaultSource};
    const allowedFallbacks = ['assets/characters/aether-placeholder.svg', 'assets/scenes/monarch-castle-panorama.webp'];
    const fallbackSrc = fallback.kind === 'image' && allowedFallbacks.includes(fallback.src) ? fallback.src : null;
    let stage = approved ? 'primary' : 'fallback';
    image.dataset.fallback = approved ? 'false' : 'true';
    function terminal() {
      stage = 'terminal'; image.hidden = true;
      if (fallbackElement) fallbackElement.hidden = false;
    }
    function load() {
      if (stage === 'terminal') return;
      image.hidden = false;
      if (fallbackElement) fallbackElement.hidden = true;
    }
    function error() {
      if (stage === 'primary' && fallbackSrc) {
        stage = 'fallback'; image.dataset.fallback = 'true'; image.src = fallbackSrc;
      } else terminal();
    }
    image.addEventListener('load', load);
    image.addEventListener('error', error);
    // HTML/glyph stays visible while decoding; never leave a broken image displayed.
    image.hidden = true;
    if (fallbackElement) fallbackElement.hidden = false;
    if (approved) image.src = approved.path;
    else if (fallbackSrc) image.src = fallbackSrc;
    else terminal();
    return () => { image.removeEventListener('load', load); image.removeEventListener('error', error); };
  }
  return { approvedAsset, attachImage };
});
