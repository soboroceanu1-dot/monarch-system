#!/usr/bin/env python3
"""Validate final graphics without touching application state or image bytes."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import warnings
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'assets/graphics/v9.3/manifest.json'
GROUPS = {
    'hero': ([f'hero_rank_{r}' for r in 'edcbas'], 'WEBP', 1640, 640, False),
    'character': ([f'aether_rank_{r}' for r in 'edcbas'], 'PNG', 900, 1200, True),
    'banners': (['banner_compania_mea'], 'WEBP', 1640, 220, False),
    'monarch': (['monarch_'+s for s in ['misiuni','academie','proiecte','obiectiv']], 'PNG', 144, 144, True),
    'attributes': (['attribute_'+s for s in ['vitality','intelligence','wealth','leadership','discipline','mindset']], 'PNG', 84, 84, True),
    'nav': (['nav_'+s for s in ['acasa','aventuri','plan','hunter','evolutie']], 'PNG', 132, 132, True),
}
EXPECTED = {id: (group, fmt, w, h, alpha) for group, (ids, fmt, w, h, alpha) in GROUPS.items() for id in ids}


def validate(root, manifest, require_approved=False):
    assets = manifest.get('assets', [])
    ids = [a.get('id') for a in assets]
    if len(ids) != 28 or len(set(ids)) != 28 or set(ids) != set(EXPECTED):
        raise ValueError('Manifest must contain exactly the 28 unique expected resource IDs')
    if manifest.get('schema_version') != 2 or not isinstance(manifest.get('integration_enabled'), bool):
        raise ValueError('Invalid manifest schema or integration flag')
    results = []
    allowed_paths = set()
    for asset in assets:
        id = asset['id']
        group, fmt, width, height, alpha = EXPECTED[id]
        expected_path = f'assets/graphics/v9.3/{group}/{id}.{fmt.lower()}'
        expected_export = dict(width=width, height=height, aspect_ratio=width/height,
                               format=fmt, alpha_required=alpha,
                               transparent_outer_border_px=1 if alpha else 0)
        if asset.get('path') != expected_path or asset.get('group') != group or asset.get('export') != expected_export:
            raise ValueError(f'{id}: path/export contract differs from specification')
        safe = asset.get('display', {}).get('safe_area', {})
        bounds = safe.get('subject_bounds', [])
        if len(bounds) != 4 or not all(isinstance(n, (int, float)) and 0 <= n <= 1 for n in bounds) or not (bounds[0] < bounds[2] and bounds[1] < bounds[3]) or safe.get('manual_review_required') is not True:
            raise ValueError(f'{id}: invalid safe-area contract')
        allowed_paths.add(expected_path)
        path = root / expected_path
        errors = []
        result = dict(id=id, path=expected_path, status='missing', sha256=None, errors=errors, warnings=[])
        if not path.exists() and not path.is_symlink():
            errors.append('File missing: retain documented fallback')
        else:
            try:
                if path.is_symlink() or root.resolve() not in path.resolve().parents:
                    raise ValueError('Symlinks and paths outside repository are forbidden')
                if not path.is_file():
                    raise ValueError('Resource must be a regular file')
                result['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
                result['bytes'] = path.stat().st_size
                with warnings.catch_warnings():
                    warnings.simplefilter('error', Image.DecompressionBombWarning)
                    with Image.open(path) as probe:
                        probe.verify()
                    with Image.open(path) as im:
                        im.load()
                        result.update(format=im.format, width=im.width, height=im.height)
                        if im.format != fmt:
                            errors.append(f'Actual format {im.format}, expected {fmt}')
                        if im.size != (width, height):
                            errors.append(f'Actual size {im.size}, expected {(width, height)}')
                        if getattr(im, 'n_frames', 1) != 1:
                            errors.append('Animated resources are not allowed')
                        if not alpha and im.convert('RGBA').getchannel('A').getextrema()[0] != 255:
                            errors.append('Background must be opaque')
                        if alpha:
                            if 'A' not in im.getbands():
                                errors.append('Native alpha channel missing')
                            else:
                                channel = im.getchannel('A')
                                low, high = channel.getextrema()
                                if low == 255:
                                    errors.append('Image is fully opaque')
                                if high == 0:
                                    errors.append('Image is fully transparent / empty')
                                box = channel.getbbox()
                                result['alpha_bounds_px'] = box
                                if box and (box[0] < 1 or box[1] < 1 or box[2] > im.width-1 or box[3] > im.height-1):
                                    errors.append('Subject touches outer border; transparent margin required')
                budget = asset['estimated_bytes']
                if result['bytes'] > budget['max']:
                    result['warnings'].append('Estimated file budget exceeded; review quality before compression')
            except Exception as exc:
                errors.append(str(exc))
            result['status'] = 'invalid' if errors else 'passed'
        review = asset.get('visual_review', {})
        result['visual_approved_for_current_bytes'] = (result['status'] == 'passed' and review.get('status') == 'approved' and review.get('approved_sha256') == result['sha256'])
        if require_approved and not result['visual_approved_for_current_bytes']:
            errors.append('Visual approval for this exact SHA-256 is missing')
        results.append(result)
    base = root / 'assets/graphics/v9.3'
    unexpected = sorted(str(p.relative_to(root)) for p in base.rglob('*') if p.is_file() and p.name not in {'.gitkeep', 'manifest.json', 'manifest.js'} and str(p.relative_to(root)) not in allowed_paths)
    return dict(schema_version=2, source_commit=manifest.get('source_commit'), results=results,
                counts={s: sum(r['status'] == s for r in results) for s in ['passed','invalid','missing']}, unexpected_files=unexpected,
                visual_review_note='Safe areas, embedded text, foreign fragments and artistic quality require manual review.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--allow-missing', action='store_true', help='Infrastructure check only; never means ready for integration')
    parser.add_argument('--require-approved', action='store_true', help='Also require visual approval bound to each file hash')
    parser.add_argument('--write-status', action='store_true', help='Update technical status/hash only, never grant visual approval')
    parser.add_argument('--browser-manifest', action='store_true', help='Generate runtime projection after validation; unapproved resources remain gated')
    parser.add_argument('--report', type=Path, help='Write a JSON report outside the resource directory')
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        path = root / MANIFEST
        manifest = json.loads(path.read_text())
        report = validate(root, manifest, args.require_approved)
        if args.write_status:
            for asset, result in zip(manifest['assets'], report['results']):
                asset['validation'] = {k: result[k] for k in ['status','sha256']}
            path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
        if args.report:
            destination = args.report.resolve()
            if destination == path or (root/'assets/graphics/v9.3').resolve() in destination.parents:
                raise ValueError('Report must be outside the resource directory')
            destination.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
        if args.browser_manifest:
            runtime = {k: manifest[k] for k in ['schema_version', 'integration_enabled']}
            runtime['assets'] = [{k: a[k] for k in ['id','path','validation','visual_review','fallback']} for a in manifest['assets']]
            (root/'assets/graphics/v9.3/manifest.js').write_text('/* Generated by scripts/validate-graphics.py --browser-manifest. */\nwindow.MonarchFinalManifest = '+json.dumps(runtime, ensure_ascii=False, separators=(',',':'))+';\n')
        print(json.dumps(report, ensure_ascii=False, indent=2))
        failed = bool(report['unexpected_files']) or any(
            (r['status'] == 'missing' and not args.allow_missing) or r['status'] == 'invalid' or
            (args.require_approved and not r['visual_approved_for_current_bytes']) for r in report['results'])
        return 1 if failed else 0
    except Exception as exc:
        print(f'VALIDATOR ERROR: {exc}', file=sys.stderr)
        return 2

if __name__ == '__main__':
    sys.exit(main())
