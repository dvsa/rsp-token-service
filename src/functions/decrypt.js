import 'babel-polyfill';
import DecryptService from '../services/decryptService';
import config from '../config';

let configBootstrapped = false;
export default async (event, context, callback) => {
	if (!configBootstrapped) {
		await config.bootstrap();
		configBootstrapped = true;
	}
	console.log(JSON.stringify(event, null, 2));
	let decryptObject = event.body;
	if (typeof decryptObject === 'string') {
		decryptObject = JSON.parse(event.body);
	}

	DecryptService.decrypt(decryptObject.Token, callback);
};
