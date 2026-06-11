// tests/unit/core/utils/mime-resolver.test.js

const { resolveMimeType, isSupportedType, getExtractorType, SUPPORTED_TYPES } = require('../../../../src/core/utils/mime-resolver');

describe('resolveMimeType', () => {
  it('resolves by extension', () => {
    expect(resolveMimeType('photo.jpg')).toBe('image/jpeg');
    expect(resolveMimeType('doc.pdf')).toBe('application/pdf');
    expect(resolveMimeType('song.mp3')).toBe('audio/mpeg');
    expect(resolveMimeType('clip.mp4')).toBe('video/mp4');
  });

  it('resolves by extension case-insensitively', () => {
    expect(resolveMimeType('photo.JPG')).toBe('image/jpeg');
    expect(resolveMimeType('doc.PDF')).toBe('application/pdf');
  });

  it('resolves by magic bytes for JPEG', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF]);
    expect(resolveMimeType('unknown', buf)).toBe('image/jpeg');
  });

  it('resolves by magic bytes for PNG', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
    expect(resolveMimeType('unknown', buf)).toBe('image/png');
  });

  it('resolves by magic bytes for GIF', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46]);
    expect(resolveMimeType('unknown', buf)).toBe('image/gif');
  });

  it('resolves by magic bytes for PDF', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(resolveMimeType('unknown', buf)).toBe('application/pdf');
  });

  it('defaults to octet-stream', () => {
    expect(resolveMimeType('unknown.unknown')).toBe('application/octet-stream');
  });
});

describe('isSupportedType', () => {
  it('returns true for supported types', () => {
    expect(isSupportedType('image/jpeg')).toBe(true);
    expect(isSupportedType('text/plain')).toBe(true);
    expect(isSupportedType('audio/mpeg')).toBe(true);
    expect(isSupportedType('video/mp4')).toBe(true);
  });

  it('returns true for prefix matches', () => {
    expect(isSupportedType('image/webp')).toBe(true);
    expect(isSupportedType('text/html')).toBe(true);
    expect(isSupportedType('audio/wav')).toBe(true);
    expect(isSupportedType('video/webm')).toBe(true);
  });

  it('returns false for unsupported types', () => {
    expect(isSupportedType('application/octet-stream')).toBe(false);
    expect(isSupportedType('application/xml')).toBe(false);
  });
});

describe('getExtractorType', () => {
  it('returns correct extractors', () => {
    expect(getExtractorType('image/jpeg')).toBe('image');
    expect(getExtractorType('text/plain')).toBe('text');
    expect(getExtractorType('audio/mpeg')).toBe('audio');
    expect(getExtractorType('video/mp4')).toBe('video');
    expect(getExtractorType('application/pdf')).toBe('pdf');
  });

  it('returns null for unknown', () => {
    expect(getExtractorType('application/octet-stream')).toBeNull();
  });
});

describe('SUPPORTED_TYPES', () => {
  it('is a Set', () => {
    expect(SUPPORTED_TYPES).toBeInstanceOf(Set);
  });
});
