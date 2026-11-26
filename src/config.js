import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logInfo, logError } from './utils/logger';

const configMetadata = {
	encryptionPassword: 'ENCRYPTION_PASSWORD',
};

let configuration = {};
const secretsManagerClient = new SecretsManagerClient({ region: process.env.REGION });
async function bootstrap() {
	if (process.env.USE_SECRETS_MANAGER === 'true') {
		const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
		logInfo('TokenServiceSecretsManagerId', { secretId: SecretId });
		let response;
		try {
			response = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId }));
		} catch (error) {
			logError('TokenServiceSecretsManagerError', error.message);
			throw error;
		}
		configuration = JSON.parse(response.SecretString);
	} else {
		configuration = Object.values(configMetadata)
			.reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
	}
	return configuration;
}

const encryptionPassword = () => {
	return configuration[configMetadata.encryptionPassword];
};

export default {
	bootstrap,
	encryptionPassword,
};
