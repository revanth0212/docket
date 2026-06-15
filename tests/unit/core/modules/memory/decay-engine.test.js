// tests/unit/core/modules/memory/decay-engine.test.js

const { DecayEngine } = require('../../../../../src/core/modules/memory/decay-engine');

describe('DecayEngine', () => {
  function createEngine(config = {}, storeOverrides = {}) {
    return new DecayEngine({
      storeAdapter: {
        queryMemories: jest.fn().mockResolvedValue({ results: [], total: 0 }),
        updateMemory: jest.fn().mockResolvedValue({}),
        ...storeOverrides
      },
      config
    });
  }

  describe('computeSalience', () => {
    it('returns original salience when disabled', () => {
      const engine = createEngine({ enabled: false });
      expect(engine.computeSalience({ salience: 0.8, sector: 'episodic' })).toBe(0.8);
    });

    it('returns original salience when sector has no function', () => {
      const engine = createEngine({ functions: {} });
      expect(engine.computeSalience({ salience: 0.8, sector: 'episodic' })).toBe(0.8);
    });

    it('returns original salience for none function', () => {
      const engine = createEngine({ functions: { episodic: { type: 'none' } } });
      expect(engine.computeSalience({ salience: 0.8, sector: 'episodic' })).toBe(0.8);
    });

    it('applies exponential decay', () => {
      const engine = createEngine({ functions: { episodic: { type: 'exponential', halfLifeDays: 30 } } });
      const memory = {
        salience: 1.0,
        sector: 'episodic',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
      expect(engine.computeSalience(memory)).toBeCloseTo(0.5, 2);
    });

    it('applies linear decay', () => {
      const engine = createEngine({ functions: { episodic: { type: 'linear', halfLifeDays: 10 } } });
      const memory = {
        salience: 1.0,
        sector: 'episodic',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      };
      expect(engine.computeSalience(memory)).toBeCloseTo(0.5, 2);
    });

    it('returns initial salience for future dates', () => {
      const engine = createEngine({ functions: { episodic: { type: 'exponential' } } });
      const memory = {
        salience: 1.0,
        sector: 'episodic',
        createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      expect(engine.computeSalience(memory)).toBe(1.0);
    });

    it('defaults salience to 1.0 when missing', () => {
      const engine = createEngine({ functions: { semantic: { type: 'none' } } });
      expect(engine.computeSalience({ sector: 'semantic' })).toBe(1.0);
    });
  });

  describe('applyDecayForSector', () => {
    it('returns 0 when disabled', async () => {
      const engine = createEngine({ enabled: false });
      const result = await engine.applyDecayForSector('episodic');
      expect(result).toBe(0);
    });

    it('updates memories whose salience changed', async () => {
      const storeAdapter = {
        queryMemories: jest.fn().mockResolvedValue({
          results: [
            { id: 'mem_old', sector: 'episodic', salience: 1.0, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            { id: 'mem_same', sector: 'episodic', salience: 0.5, createdAt: new Date() }
          ]
        }),
        updateMemory: jest.fn().mockResolvedValue({})
      };
      const engine = createEngine({ functions: { episodic: { type: 'exponential', halfLifeDays: 30 } } }, storeAdapter);

      const result = await engine.applyDecayForSector('episodic');

      expect(result).toBe(1);
      expect(storeAdapter.updateMemory).toHaveBeenCalledTimes(1);
      expect(storeAdapter.updateMemory).toHaveBeenCalledWith('mem_old', expect.objectContaining({ salience: expect.any(Number) }));
    });

    it('skips memories in other sectors', async () => {
      const storeAdapter = {
        queryMemories: jest.fn().mockResolvedValue({
          results: [{ id: 'mem_sem', sector: 'semantic', salience: 1.0 }]
        }),
        updateMemory: jest.fn()
      };
      const engine = createEngine({ functions: { episodic: { type: 'exponential' } } }, storeAdapter);

      await engine.applyDecayForSector('episodic');
      expect(storeAdapter.updateMemory).not.toHaveBeenCalled();
    });
  });

  describe('runDecayCycle', () => {
    it('returns zeros when disabled', async () => {
      const engine = createEngine({ enabled: false });
      const result = await engine.runDecayCycle();
      expect(result).toEqual({ totalUpdated: 0, forgotten: 0 });
    });

    it('counts forgotten memories below threshold', async () => {
      const storeAdapter = {
        queryMemories: jest.fn().mockResolvedValue({
          results: [
            { id: 'mem_forgotten', sector: 'episodic', salience: 0.01, createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          ]
        })
      };
      const engine = createEngine({
        functions: { episodic: { type: 'exponential' } },
        forgottenThreshold: 0.05
      }, storeAdapter);

      const result = await engine.runDecayCycle();
      expect(result.forgotten).toBe(1);
    });
  });
});
