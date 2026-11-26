'use strict';

const assert = require('node:assert/strict');
const sinon = require('sinon');
const Validation = require('@dvsa/rsp-validation').default;
const config = require('../../src/config').default;
const Decrypt = require('../../src/services/decryptService').default;
const decryptTea = require('../../src/utils/decryptTea').default;
const isDevEnv = require('../../src/utils/isDevEnv').default;
const isHex = require('../../src/utils/isHex').default;
const createResponse = require('../../src/utils/createResponse').default;
const logger = require('../../src/utils/logger');

describe('utility behaviour', () => {
	afterEach(() => sinon.restore());

	it('checks hex strings and DEV environment exactly', () => {
		assert.equal(isHex('0xAB12'), true);
		assert.equal(isHex('not-hex'), false);
		const old = process.env.ENV;
		try {
			process.env.ENV = 'DEV';
			assert.equal(isDevEnv(), true);
			process.env.ENV = 'dev';
			assert.equal(isDevEnv(), false);
		} finally {
			if (old === undefined) delete process.env.ENV;
			else process.env.ENV = old;
		}
	});

	it('returns an empty result for invalid TEA input lengths', () => {
		assert.equal(decryptTea(new Uint32Array(1), new Uint32Array(1)), '');
	});

	it('uses the default proxy response envelope', () => {
		assert.deepEqual(createResponse({}), { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
	});

	it('returns a validation error for a malformed encryption password', async () => {
		sinon.stub(config, 'encryptionPassword').returns('not-hex');
		sinon.stub(console, 'error');
		const result = await Decrypt.decrypt('76372ffa74869e0c');
		assert.equal(result.statusCode, 400);
		assert.deepEqual(JSON.parse(result.body), { message: 'Pass set in environment is not correct' });
	});

	it('returns the existing invalid-token response if token validation throws', async () => {
		sinon.stub(config, 'encryptionPassword').returns('a8D90c092e835dD662');
		sinon.stub(Validation, 'tokenValidation').throws(new Error('synthetic validation failure'));
		sinon.stub(console, 'error');
		const result = await Decrypt.decrypt('76372ffa74869e0c');
		assert.equal(result.statusCode, 400);
		assert.deepEqual(JSON.parse(result.body), { message: 'Token is not in the correct format' });
	});

	it('logs information, debug and error levels with structured messages', () => {
		const log = sinon.stub(console, 'log');
		const error = sinon.stub(console, 'error');
		logger.logInfo('info', { value: 1 });
		logger.logDebug('debug', 'message');
		logger.logError('error', 'failure');
		assert.deepEqual(JSON.parse(log.firstCall.args[0]), { logName: 'info', message: { value: 1 }, logLevel: 'INFO' });
		assert.deepEqual(JSON.parse(log.secondCall.args[0]), { logName: 'debug', message: 'message', logLevel: 'DEBUG' });
		assert.deepEqual(JSON.parse(error.firstCall.args[0]), { logName: 'error', message: 'failure', logLevel: 'ERROR' });
	});
});
