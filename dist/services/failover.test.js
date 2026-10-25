import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PermanentError, RateLimitedError, AllProvidersExhaustedError } from './errors.js';
describe('Failover Logic & Typed Errors', () => {
    test('PermanentError is distinguishable and has status 400', () => {
        const err = new PermanentError('Bad request parameters');
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.name, 'PermanentError');
    });
    test('RateLimitedError has status 429', () => {
        const err = new RateLimitedError('Too many queries');
        assert.strictEqual(err.statusCode, 429);
        assert.strictEqual(err.name, 'RateLimitedError');
    });
    test('AllProvidersExhaustedError has status 503', () => {
        const err = new AllProvidersExhaustedError('All keys failed');
        assert.strictEqual(err.statusCode, 503);
        assert.strictEqual(err.name, 'AllProvidersExhaustedError');
    });
});
//# sourceMappingURL=failover.test.js.map