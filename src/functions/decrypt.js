import '@babel/polyfill';
import DecryptService from '../services/decryptService';
import config from '../config';

let configBootstrapped = false;
export default async (event) => {
	if (!configBootstrapped) {
		await config.bootstrap();
		configBootstrapped = true;
	}
	let decryptObject = event.body;
	if (typeof decryptObject === 'string') {
		decryptObject = JSON.parse(event.body);
	}

	return DecryptService.decrypt(decryptObject.Token);
};
