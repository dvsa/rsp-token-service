import ConvertHex from 'convert-hex';

import TokenValidator from '../utils/checkFormat';
import IsHex from '../utils/isHex';
import DecryptTea from '../utils/decryptTea';
import ParseDecryptedToken from '../utils/parseDecryptedToken';
import CreateResponse from '../utils/createResponse';
import config from '../config';

require('dotenv').config();

export default class Decrypt {

	static decrypt(token, callback) {
		const teaPass = config.encryptionPassword();
		if (!TokenValidator(token)) {
			console.log('Token failed validation');
			Decrypt.IncorrectTokenFormatResponse(callback);
			return;
		} else if (!IsHex(teaPass)) {
			console.log('Pass failed validation');
			Decrypt.IncorrectPassFormat(callback);
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
			Decrypt.IncorrectTokenFormatResponse(callback);
			return;
		}

		if (penaltyItems === '') {
			console.log('Token has decrypted in the incorrect format');
			Decrypt.IncorrectTokenFormatResponse(callback);
			return;
		}

		callback(
			null,
			Decrypt.SuccessfulResponse(penaltyItems),
		);
	}

	static IncorrectPassFormat(callback) {
		callback(
			null,
			Decrypt.ErrorResponse({ message: 'Pass set in environment is not correct' }),
		);
	}

	static IncorrectTokenFormatResponse(callback) {
		callback(
			null,
			Decrypt.ErrorResponse({ message: 'Token is not in the correct format' }),
		);
	}

	static SuccessfulResponse(decryptedObj) {
		return CreateResponse({ body: decryptedObj, statusCode: 200 });
	}

	static ErrorResponse(error) {
		return CreateResponse({ body: error, statusCode: 400 });
	}
}
