import DecryptService from '../services/decryptService';
import config from '../config';
import CreateResponse from '../utils/createResponse';

let configBootstrapped = false;
export const handler = async (event) => {
	if (!configBootstrapped) {
		await config.bootstrap();
		configBootstrapped = true;
	}
	let decryptObject = event.body;
	if (typeof decryptObject === 'string') {
		decryptObject = JSON.parse(event.body);
	}

	if (!event.body || !decryptObject.Token) {
		return CreateResponse({ body: 'No token found in the request body', statusCode: 400 });
	}

	return DecryptService.decrypt(decryptObject.Token);
};

export default handler;
