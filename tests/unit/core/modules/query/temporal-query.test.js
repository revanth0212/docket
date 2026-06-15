// tests/unit/core/modules/query/temporal-query.test.js

const { TemporalQuery } = require('../../../../../src/core/modules/query/temporal-query');

describe('TemporalQuery', () => {
  function createQuery(config = {}, storeOverrides = {}) {
    return new TemporalQuery({
      storeAdapter: {
        queryMemories: jest.fn().mockResolvedValue({ results: [], total: 0 }),
        ...storeOverrides
      },
      config
    });
  }

  describe('isValidAt', () => {
    it('returns true when disabled', () => {
      const query = createQuery({ enabled: false });
      expect(query.isValidAt({ validTo: new Date('2020-01-01') }, new Date())).toBe(true);
    });

    it('returns false for null memory', () => {
      const query = createQuery();
      expect(query.isValidAt(null, new Date())).toBe(false);
    });

    it('returns true when no validity windows set', () => {
      const query = createQuery();
      expect(query.isValidAt({ id: 'mem_a' }, new Date())).toBe(true);
    });

    it('returns false when atDate is before validFrom', () => {
      const query = createQuery();
      const memory = { validFrom: new Date('2024-06-01') };
      expect(query.isValidAt(memory, new Date('2024-01-01'))).toBe(false);
    });

    it('returns false when atDate is after validTo', () => {
      const query = createQuery();
      const memory = { validTo: new Date('2024-01-01') };
      expect(query.isValidAt(memory, new Date('2024-06-01'))).toBe(false);
    });

    it('returns true when atDate is within window', () => {
      const query = createQuery();
      const memory = {
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31')
      };
      expect(query.isValidAt(memory, new Date('2024-06-15'))).toBe(true);
    });
  });

  describe('filterValid', () => {
    it('filters memories by validity', () => {
      const query = createQuery();
      const memories = [
        { id: 'mem_valid', validFrom: new Date('2024-01-01'), validTo: new Date('2024-12-31') },
        { id: 'mem_invalid', validTo: new Date('2024-01-01') }
      ];
      const result = query.filterValid(memories, new Date('2024-06-15'));
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('mem_valid');
    });

    it('returns all memories when disabled', () => {
      const query = createQuery({ enabled: false });
      const memories = [{ id: 'mem_a', validTo: new Date('2020-01-01') }];
      expect(query.filterValid(memories, new Date())).toEqual(memories);
    });
  });

  describe('queryAtPointInTime', () => {
    it('delegates to store when disabled', async () => {
      const storeAdapter = { queryMemories: jest.fn().mockResolvedValue({ results: [{ id: 'mem_a' }], total: 1 }) };
      const query = createQuery({ enabled: false }, storeAdapter);

      const result = await query.queryAtPointInTime({}, new Date(), { limit: 10 });

      expect(storeAdapter.queryMemories).toHaveBeenCalledWith({}, { limit: 10 });
      expect(result.results.length).toBe(1);
    });

    it('over-fetches and filters when enabled', async () => {
      const storeAdapter = {
        queryMemories: jest.fn().mockResolvedValue({
          results: [
            { id: 'mem_valid', validFrom: new Date('2024-01-01'), validTo: new Date('2024-12-31') },
            { id: 'mem_invalid', validTo: new Date('2024-01-01') }
          ],
          total: 2
        })
      };
      const query = createQuery({ enabled: true }, storeAdapter);

      const result = await query.queryAtPointInTime({}, new Date('2024-06-15'), { limit: 1 });

      expect(storeAdapter.queryMemories).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ limit: 2 })
      );
      expect(result.results.length).toBe(1);
      expect(result.results[0].id).toBe('mem_valid');
    });
  });
});
