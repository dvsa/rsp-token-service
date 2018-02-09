import DecryptService from '../services/decryptService';

export default (event, context, callback) => {
	const decryptObject = JSON.parse(event.body);

	DecryptService.decrypt(decryptObject.Token, callback);
};
