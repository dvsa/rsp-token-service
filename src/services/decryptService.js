import ConvertHex from 'convert-hex';

import TokenValidator from '../utils/CheckTokenFormat';
import DecryptTea from '../utils/decryptTea';
import ParseDecryptedToken from '../utils/parseDecryptedToken';
import CreateResponse from '../utils/createResponse';

const teaPass = process.env.ENCRYPTION_PASSWORD;

export default class Notify {

	static decrypt(token, callback) {
		if (!TokenValidator(token)) {
			Notify.ErrorResponse(callback);
			console.log('Token failed validation');
			return;
		} else if (!TokenValidator(teaPass)) {
			Notify.IncorrectPassFormat(callback);
			console.log('Pass failed validation');
			return;
		}

		const tokenByteArray = new Uint8Array(ConvertHex.hexToBytes(token));
		const teaPassArray = new Uint32Array(ConvertHex.hexToBytes(teaPass));
		const uint32Token = new Uint32Array(tokenByteArray.buffer);

		let penaltyItems = '';
		try {
			const decryptedVal = DecryptTea(uint32Token, teaPassArray);
			penaltyItems = ParseDecryptedToken(decryptedVal);
		} catch (error) {
			Notify.ErrorResponse(callback);
			console.log(error);
			return;
		}

		if (penaltyItems === '') {
			Notify.IncorrectTokenFormatResponse(callback);
			console.log('Token has decrypted in the incorrect format');
			return;
		}

		Notify.SuccessfulResponse(penaltyItems);
	}

	static IncorrectTokenFormatResponse(callback) {
		callback(
			null,
			Notify.ErrorResponse({ message: 'Token is not in the correct format' }),
		);
	}

	static SuccessfulResponse(decryptedObj) {
		return CreateResponse({ body: decryptedObj, statusCode: 200 });
	}

	static ErrorResponse(error) {
		return CreateResponse({ body: error, statusCode: 400 });
	}
}
