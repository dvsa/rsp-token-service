import expect from 'expect';
import sinon from 'sinon';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import config from '../config';

describe('Configuration', () => {
	let environment;
	let send;

	beforeEach(() => {
		environment = { ...process.env };
		send = sinon.stub(SecretsManagerClient.prototype, 'send');
		sinon.stub(console, 'log');
		sinon.stub(console, 'error');
		sinon.stub(console, 'debug');
	});

	afterEach(() => {
		process.env = environment;
		sinon.restore();
	});

	it('loads the encryption password from the environment', async () => {
		process.env.USE_SECRETS_MANAGER = 'false';
		process.env.ENCRYPTION_PASSWORD = 'synthetic-password';

		await config.bootstrap();

		expect(config.encryptionPassword()).toBe('synthetic-password');
		expect(send.called).toBe(false);
	});

	it('loads the encryption password from Secrets Manager', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		process.env.SECRETS_MANAGER_SECRET_NAME = 'synthetic-secret';
		send.resolves({ SecretString: JSON.stringify({ ENCRYPTION_PASSWORD: 'synthetic-password' }) });

		await config.bootstrap();

		expect(send.calledOnce).toBe(true);
		const command = send.firstCall.args[0];
		expect(command instanceof GetSecretValueCommand).toBe(true);
		expect(command.input).toEqual({ SecretId: 'synthetic-secret' });
		expect(config.encryptionPassword()).toBe('synthetic-password');
	});

	it('propagates a Secrets Manager failure', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		const failure = new Error('synthetic failure');
		send.rejects(failure);

		await expect(config.bootstrap()).rejects.toBe(failure);
	});

	it('rejects a malformed secret', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		send.resolves({ SecretString: 'not-json' });

		await expect(config.bootstrap()).rejects.toBeInstanceOf(SyntaxError);
	});
});
