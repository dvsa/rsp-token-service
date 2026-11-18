'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

describe('unit test isolation', () => {
	it('blocks network APIs before service imports', () => {
		for (const request of [
			() => http.request('http://127.0.0.1/'),
			() => https.get('https://example.com/'),
			() => net.connect(1234, '127.0.0.1'),
		]) {
			assert.throws(request, /Network access is disabled during unit tests/);
		}
	});

	it('uses synthetic credentials and does not load dotenv files', () => {
		assert.equal(process.env.AWS_ACCESS_KEY_ID, 'unit-test-only');
		assert.equal(process.env.AWS_EC2_METADATA_DISABLED, 'true');
		assert.deepEqual(require('dotenv').config(), { parsed: {} });
	});

	it('rejects unexpected Secrets Manager calls', () => {
		const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
		const client = new SecretsManagerClient({ region: 'eu-west-1' });
		assert.throws(() => client.send(new GetSecretValueCommand({ SecretId: 'synthetic' })), /Unexpected Secrets Manager call/);
	});
});
