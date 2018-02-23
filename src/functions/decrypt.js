import DecryptService from '../services/decryptService';

export default (event, context, callback) => {
	console.log(JSON.stringify(event, null, 2));
	let decryptObject = event.body;
	if (typeof decryptObject === 'string') {
		decryptObject = JSON.parse(event.body);
	}

	DecryptService.decrypt(decryptObject.Token, callback);
};
