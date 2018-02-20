import ConvertHex from 'convert-hex';

import TokenValidator from '../utils/checkFormat';
import DecryptTea from '../utils/decryptTea';
import ParseDecryptedToken from '../utils/parseDecryptedToken';
import CreateResponse from '../utils/createResponse';

require('dotenv').config();

const teaPass = process.env.ENCRYPTION_PASSWORD;

export default class Notify {

	static decrypt(token, callback) {
		if (!TokenValidator(token)) {
			console.log('Token failed validation');
			Notify.IncorrectTokenFormatResponse(callback);
			return;
		} else if (!TokenValidator(teaPass)) {
			console.log('Pass failed validation');
			Notify.IncorrectPassFormat(callback);
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
			console.log(error);
			Notify.IncorrectTokenFormatResponse(callback);
			return;
		}

		if (penaltyItems === '') {
			console.log('Token has decrypted in the incorrect format');
			Notify.IncorrectTokenFormatResponse(callback);
			return;
		}

		callback(
			null,
			Notify.SuccessfulResponse(penaltyItems),
		);
	}

	static IncorrectPassFormat(callback) {
		callback(
			null,
			Notify.ErrorResponse({ message: 'Pass set in environment is not correct' }),
		);
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
