"""Synthetic validation fixtures live only in TemporaryDirectory, never in assets."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('graphics_validator', ROOT/'scripts/validate-graphics.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)

class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manifest = json.loads((ROOT/validator.MANIFEST).read_text())
        self.asset = next(a for a in self.manifest['assets'] if a['id'] == 'monarch_misiuni')
        self.path = self.root/self.asset['path']
        self.path.parent.mkdir(parents=True)

    def result(self, approved=False):
        report = validator.validate(self.root, self.manifest, approved)
        return next(r for r in report['results'] if r['id'] == self.asset['id'])

    def fixture(self, size=(144,144), mode='RGBA', opaque=False):
        im = Image.new(mode, size, (0,0,0,0) if mode == 'RGBA' else (0,0,0))
        if mode == 'RGBA':
            if opaque: im.paste((255,255,255,255), (0,0,*size))
            else: im.paste((255,255,255,255), (20,20,100,100))
        im.save(self.path, format='PNG')

    def test_all_missing_are_explicit(self):
        report = validator.validate(self.root, self.manifest)
        self.assertEqual(report['counts'], dict(passed=0, invalid=0, missing=28))

    def test_valid_png_and_hash_bound_approval(self):
        self.fixture()
        result = self.result()
        self.assertEqual(result['status'], 'passed')
        self.assertFalse(result['visual_approved_for_current_bytes'])
        self.asset['visual_review'] = dict(status='approved', approved_sha256=result['sha256'])
        self.assertTrue(self.result(True)['visual_approved_for_current_bytes'])
        self.fixture(size=(145,144))
        self.assertFalse(self.result(True)['visual_approved_for_current_bytes'])

    def test_wrong_dimensions(self):
        self.fixture(size=(145,144))
        self.assertEqual(self.result()['status'], 'invalid')

    def test_no_alpha_and_opaque_alpha(self):
        for mode, opaque in [('RGB',False), ('RGBA',True)]:
            self.fixture(mode=mode, opaque=opaque)
            self.assertEqual(self.result()['status'], 'invalid')

    def test_empty_image_and_cut_edges(self):
        for color in [(0,0,0,0),(255,0,0,255)]:
            Image.new('RGBA',(144,144),color).save(self.path)
            self.assertEqual(self.result()['status'], 'invalid')

    def test_wrong_format_and_corruption(self):
        Image.new('RGB',(144,144)).save(self.path,format='JPEG')
        self.assertEqual(self.result()['status'], 'invalid')
        self.path.write_bytes(b'not an image')
        self.assertEqual(self.result()['status'], 'invalid')

    def test_duplicate_ids_and_path_escape(self):
        wrong = copy.deepcopy(self.manifest)
        wrong['assets'][1]['id'] = wrong['assets'][0]['id']
        with self.assertRaises(ValueError): validator.validate(self.root, wrong)
        self.asset['path'] = '../../outside.png'
        with self.assertRaises(ValueError): self.result()

    def test_symlink_and_unexpected_file(self):
        outside = self.root/'outside.png'
        Image.new('RGBA',(144,144)).save(outside)
        self.path.symlink_to(outside)
        self.assertEqual(self.result()['status'], 'invalid')
        extra = self.path.parent/'sheet.png'
        extra.write_bytes(b'unsupported extra asset')
        self.assertEqual(len(validator.validate(self.root,self.manifest)['unexpected_files']),1)

if __name__ == '__main__': unittest.main()
