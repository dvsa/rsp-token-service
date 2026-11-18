'use strict';

const assert = require('node:assert/strict');
const sinon = require('sinon');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const config = require('../../src/config').default;

describe('configuration bootstrap', () => {
	let environment;
	let send;
	beforeEach(() => {
		environment = { ...process.env };
		send = sinon.stub(SecretsManagerClient.prototype, 'send');
		sinon.stub(console, 'log');
		sinon.stub(console, 'error');
	});
	afterEach(() => {
		process.env = environment;
		sinon.restore();
	});

	it('reads the local password without calling Secrets Manager', async () => {
		process.env.USE_SECRETS_MANAGER = 'false';
		process.env.ENCRYPTION_PASSWORD = 'synthetic';
		await config.bootstrap();
		assert.equal(config.encryptionPassword(), 'synthetic');
		assert.equal(send.callCount, 0);
	});

	it('requests and parses the configured secret', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		process.env.SECRETS_MANAGER_SECRET_NAME = 'synthetic-secret';
		process.env.REGION = 'eu-west-1';
		send.resolves({ SecretString: '{"ENCRYPTION_PASSWORD":"synthetic"}' });
		await config.bootstrap();
		assert.ok(send.firstCall.args[0] instanceof GetSecretValueCommand);
		assert.deepEqual(send.firstCall.args[0].input, { SecretId: 'synthetic-secret' });
		assert.equal(config.encryptionPassword(), 'synthetic');
	});

	it('propagates a Secrets Manager error', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		const error = new Error('synthetic failure');
		send.rejects(error);
		await assert.rejects(config.bootstrap(), error);
	});

	it('rejects malformed Secrets Manager data', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		send.resolves({ SecretString: 'not-json' });
		await assert.rejects(config.bootstrap(), SyntaxError);
	});
});
