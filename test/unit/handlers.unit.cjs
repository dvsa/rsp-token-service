'use strict';

const assert = require('node:assert/strict');
const sinon = require('sinon');
const config = require('../../src/config').default;
const DecryptService = require('../../src/services/decryptService').default;
const { handler: auth } = require('../../src/functions/auth');
const NoAuth = require('../../src/services/noAuth').default;

describe('decrypt handler', () => {
	let handler;
	let bootstrap;
	let decrypt;

	beforeEach(() => {
		delete require.cache[require.resolve('../../src/functions/decrypt')];
		handler = require('../../src/functions/decrypt').handler;
		bootstrap = sinon.stub(config, 'bootstrap').resolves();
		decrypt = sinon.stub(DecryptService, 'decrypt').resolves({
			statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"example":true}',
		});
	});

	afterEach(() => sinon.restore());

	it('parses JSON and forwards a token, bootstrapping once across requests', async () => {
		const first = await handler({ body: '{"Token":"synthetic"}' });
		const second = await handler({ body: { Token: 'second' } });
		assert.equal(bootstrap.callCount, 1);
		assert.deepEqual(decrypt.args, [['synthetic'], ['second']]);
		assert.deepEqual(first, { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"example":true}' });
		assert.deepEqual(second, first);
	});

	it('rejects missing body and token with the current proxy envelope', async () => {
		for (const event of [{}, { body: {} }, { body: '{"Token":""}' }]) {
			assert.deepEqual(await handler(event), {
				statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: '"No token found in the request body"',
			});
		}
		assert.equal(decrypt.callCount, 0);
	});

	it('propagates malformed JSON and bootstrap failures', async () => {
		await assert.rejects(handler({ body: '{' }), SyntaxError);
		delete require.cache[require.resolve('../../src/functions/decrypt')];
		const freshHandler = require('../../src/functions/decrypt').handler;
		const error = new Error('synthetic bootstrap failure');
		bootstrap.rejects(error);
		await assert.rejects(freshHandler({ body: {} }), error);
	});
});

describe('authorizer export', () => {
	it('returns the current Allow policy even when the token is absent', () => {
		assert.deepEqual(auth({}), {
			principalId: 'Auth User',
			policyDocument: { Version: '2012-10-17', Statement: [
				{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: '*' },
			] },
		});
	});

	it('throws Unauthorized if the authorizer rejects a token', () => {
		sinon.stub(NoAuth.prototype, 'isTokenValid').returns(false);
		try {
			assert.throws(() => auth({ authorizationToken: 'invalid' }), /Unauthorized/);
		} finally {
			sinon.restore();
		}
	});

	it('exports both handler functions from the entry module', () => {
		const entry = require('../../src/handler');
		assert.equal(entry.auth, auth);
		assert.equal(typeof entry.decrypt, 'function');
	});
});
