import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerCommand, searchCommands, clearCommands } from './commands';

describe('searchCommands', () => {
    const unregister: Array<() => void> = [];

    beforeEach(() => {
        clearCommands();
        unregister.push(
            registerCommand({ id: 'export-pdf', label: 'Export PDF', description: 'Export as PDF', handler: () => {} }),
            registerCommand({ id: 'export-word', label: 'Export Word', description: 'Export as Word', handler: () => {} }),
            registerCommand({ id: 'toggle-spotlight', label: 'Toggle Spotlight', description: 'Toggle spotlight mode', handler: () => {} })
        );
    });

    afterEach(() => {
        unregister.splice(0).forEach((fn) => fn());
    });

    it('returns all commands for empty query', () => {
        const results = searchCommands('');
        expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('fuzzy matches "exp" to Export commands', () => {
        const results = searchCommands('exp');
        expect(results.length).toBe(2);
        expect(results[0].label).toContain('Export');
    });

    it('fuzzy matches "tsp" to Toggle Spotlight', () => {
        const results = searchCommands('tsp');
        expect(results.some((r) => r.id === 'toggle-spotlight')).toBe(true);
    });
});
