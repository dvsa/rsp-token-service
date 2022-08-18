import { SecretsManager } from 'aws-sdk';
import { logInfo, logError } from './utils/logger';

const configMetadata = {
	encryptionPassword: 'ENCRYPTION_PASSWORD',
};

let configuration = {};
async function bootstrap() {
	return new Promise((resolve, reject) => {
		if (process.env.USE_SECRETS_MANAGER === 'true') {
			const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
			logInfo('TokenServiceSecretsManagerId', { secretId: SecretId });
			const secretsManagerClient = new SecretsManager({ region: process.env.REGION });
			secretsManagerClient.getSecretValue({ SecretId }, (err, secretsManagerResponse) => {
				if (err) {
					logError('TokenServiceSecretsManagerError', err.message);
					reject(err);
					return;
				}
				configuration = JSON.parse(secretsManagerResponse.SecretString);
				resolve(configuration);
			});
		} else {
			configuration = Object.values(configMetadata)
				.reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
			resolve(configuration);
		}
	});
}

const encryptionPassword = () => {
	return configuration[configMetadata.encryptionPassword];
};

export default {
	bootstrap,
	encryptionPassword,
};
