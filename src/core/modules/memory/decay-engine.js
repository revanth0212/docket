// src/core/modules/memory/decay-engine.js
// Per-sector salience decay

/**
 * Decay Engine
 *
 * Applies configurable decay functions per memory sector.
 * In flat mode, decay is a no-op.
 */
class DecayEngine {
  /**
   * @param {Object} options
   * @param {Object} options.storeAdapter
   * @param {Object} options.config — memory.decay config
   */
  constructor({ storeAdapter, config }) {
    this.storeAdapter = storeAdapter;
    this.enabled = config.enabled !== false;
    this.interval = config.interval || 3600000;
    this.functions = config.functions || {};
    this.forgottenThreshold = config.forgottenThreshold || 0.05;
  }

  /**
   * Compute new salience for a memory
   * @param {Object} memory
   * @param {Date} [now=new Date()]
   * @returns {number}
   */
  computeSalience(memory, now = new Date()) {
    if (!this.enabled || !memory.sector) return memory.salience ?? 1.0;

    const funcConfig = this.functions[memory.sector] || { type: 'none' };
    if (funcConfig.type === 'none') return memory.salience ?? 1.0;

    const createdAt = memory.createdAt ? new Date(memory.createdAt) : now;
    const daysElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const halfLifeDays = funcConfig.halfLifeDays || 30;
    const initialSalience = memory.salience ?? 1.0;

    if (funcConfig.type === 'exponential') {
      return this._exponentialDecay(initialSalience, daysElapsed, halfLifeDays);
    }

    if (funcConfig.type === 'linear') {
      return this._linearDecay(initialSalience, daysElapsed, halfLifeDays);
    }

    return initialSalience;
  }

  /**
   * Apply decay to all memories in a sector
   * @param {string} sector
   * @param {Date} [now=new Date()]
   * @returns {Promise<number>} — count updated
   */
  async applyDecayForSector(sector, now = new Date()) {
    if (!this.enabled) return 0;

    const { results } = await this.storeAdapter.queryMemories({}, { limit: 10000 });
    let updated = 0;

    for (const memory of results) {
      if (memory.sector !== sector) continue;

      const newSalience = this.computeSalience(memory, now);
      if (newSalience !== memory.salience) {
        await this.storeAdapter.updateMemory(memory.id, { salience: newSalience });
        updated += 1;
      }
    }

    return updated;
  }

  /**
   * Run a full decay cycle across all configured sectors
   * @param {Date} [now=new Date()]
   * @returns {Promise<{totalUpdated: number, forgotten: number}>}
   */
  async runDecayCycle(now = new Date()) {
    if (!this.enabled) return { totalUpdated: 0, forgotten: 0 };

    let totalUpdated = 0;
    let forgotten = 0;

    const sectors = Object.keys(this.functions);
    for (const sector of sectors) {
      const updated = await this.applyDecayForSector(sector, now);
      totalUpdated += updated;
    }

    const { results } = await this.storeAdapter.queryMemories({}, { limit: 10000 });
    for (const memory of results) {
      const salience = this.computeSalience(memory, now);
      if (salience < this.forgottenThreshold) {
        forgotten += 1;
      }
    }

    return { totalUpdated, forgotten };
  }

  /**
   * Exponential decay: S = S0 * (1/2)^(t / halfLifeDays)
   * @protected
   */
  _exponentialDecay(initialSalience, daysElapsed, halfLifeDays) {
    if (daysElapsed <= 0) return initialSalience;
    return initialSalience * Math.pow(0.5, daysElapsed / halfLifeDays);
  }

  /**
   * Linear decay: S reaches 0 after halfLifeDays
   * @protected
   */
  _linearDecay(initialSalience, daysElapsed, halfLifeDays) {
    if (daysElapsed <= 0) return initialSalience;
    const decay = daysElapsed / halfLifeDays;
    return Math.max(0, initialSalience * (1 - decay));
  }
}

module.exports = { DecayEngine };
