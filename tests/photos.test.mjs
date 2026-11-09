import test from 'node:test';
import assert from 'node:assert/strict';
import { captionFromFileName, parseDataUrl, cleanUpload, cleanCaption, sortPhotos, publicPhoto, moveSort, MAX_CAPTION } from '../lib/photos.js';

const px = 'data:image/webp;base64,' + Buffer.from('fake-image-bytes').toString('base64');

test('parseDataUrl reads pictures and rejects other files', () => {
  const p = parseDataUrl(px);
  assert.equal(p.mime, 'image/webp');
  assert.equal(p.bytes, 'fake-image-bytes'.length);
  assert.equal(parseDataUrl('data:text/html;base64,PGI+'), null);
  assert.equal(parseDataUrl('https://example.com/a.jpg'), null);
});

test('cleanUpload checks images, size and caption', () => {
  const ok = cleanUpload({ data: px, thumb: px, w: 1400, h: 1050, caption: '  Smoked   tri-tip ' });
  assert.equal(ok.photo.caption, 'Smoked tri-tip');
  assert.equal(ok.photo.mime, 'image/webp');
  assert.equal(ok.photo.hidden, false);
  assert.equal(cleanUpload({ data: 'nope', thumb: px, w: 1, h: 1 }).error, 'bad_image');
  assert.equal(cleanUpload({ data: px, thumb: px, w: 0, h: 10 }).error, 'bad_size');
  const big = 'data:image/jpeg;base64,' + 'A'.repeat(2_400_000);
  assert.equal(cleanUpload({ data: big, thumb: px, w: 10, h: 10 }).error, 'too_big');
  assert.equal(cleanCaption('x'.repeat(200)).length, MAX_CAPTION);
});

test('photos sort by Juan\'s order, then newest first', () => {
  const list = [
    { id: 'a', sort: 0, created_at: '2026-11-01T00:00:00Z' },
    { id: 'b', sort: -10, created_at: '2026-11-02T00:00:00Z' },
    { id: 'c', sort: 0, created_at: '2026-11-03T00:00:00Z' },
  ];
  assert.deepEqual(sortPhotos(list).map((p) => p.id), ['b', 'c', 'a']);
});

test('moveSort swaps a photo with its neighbor', () => {
  const list = [
    { id: 'a', sort: 10, created_at: '2026-11-01T00:00:00Z' },
    { id: 'b', sort: 20, created_at: '2026-11-02T00:00:00Z' },
    { id: 'c', sort: 30, created_at: '2026-11-03T00:00:00Z' },
  ];
  const ch = moveSort(list, 'c', -1);
  const after = sortPhotos(list.map((p) => ({ ...p, sort: (ch.find((x) => x.id === p.id) || p).sort })));
  assert.deepEqual(after.map((p) => p.id), ['a', 'c', 'b']);
  assert.deepEqual(moveSort(list, 'a', -1), []);
});

test('public photo has cacheable image links and nothing private', () => {
  const p = publicPhoto({ id: 'x1', caption: 'Hi', w: 10, h: 12, created_at: '2026-11-09T10:00:00Z', data: 'secret', hidden: false });
  assert.match(p.src, /^\/api\/photo\/x1\?v=\d+$/);
  assert.match(p.thumb, /^\/api\/photo\/x1\?s=t&v=\d+$/);
  assert.equal(p.data, undefined);
});

test('caption from a file name, but not from camera names', () => {
  assert.equal(captionFromFileName('03 Garlic butter shrimp.jpg'), 'Garlic butter shrimp');
  assert.equal(captionFromFileName('Smoked_tri-tip.JPEG'), 'Smoked tri-tip');
  assert.equal(captionFromFileName('IMG_4821.HEIC'), '');
  assert.equal(captionFromFileName('PXL_20261108_191233.jpg'), '');
  assert.equal(captionFromFileName('3cfe268d-image.jpg'), '');
  assert.equal(captionFromFileName('Screenshot 2026-11-09 at 8.12.jpg'), '');
  assert.equal(captionFromFileName('1234.png'), '');
});
