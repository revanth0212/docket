// tests/unit/core/modules/ingestion/text-extractor.test.js

const { TextExtractor } = require('../../../../../src/core/modules/ingestion/text-extractor');

describe('TextExtractor', () => {
  it('extracts text/plain content', async () => {
    const extractor = new TextExtractor();
    const buffer = Buffer.from('hello world');
    const result = await extractor.extract(buffer, 'text/plain');
    expect(result).toBe('hello world');
  });

  it('extracts any text/* content', async () => {
    const extractor = new TextExtractor();
    const buffer = Buffer.from('html content');
    const result = await extractor.extract(buffer, 'text/html');
    expect(result).toBe('html content');
  });

  it('returns null for non-text content', async () => {
    const extractor = new TextExtractor();
    const result = await extractor.extract(Buffer.from('binary'), 'image/png');
    expect(result).toBeNull();
  });

  it('returns null for missing contentType', async () => {
    const extractor = new TextExtractor();
    const result = await extractor.extract(Buffer.from('text'));
    expect(result).toBeNull();
  });

  it('supports content type check', () => {
    const extractor = new TextExtractor();
    expect(extractor.supports('text/plain')).toBe(true);
    expect(extractor.supports('application/json')).toBe(false);
  });

  it('truncates text longer than maxLength', async () => {
    const extractor = new TextExtractor({ maxLength: 5 });
    const buffer = Buffer.from('hello world');
    const result = await extractor.extract(buffer, 'text/plain');
    expect(result).toBe('hello');
  });
});
