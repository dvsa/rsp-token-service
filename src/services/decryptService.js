import ConvertHex from 'convert-hex';

import TokenValidator from '../utils/CheckTokenFormat';
import DecryptTea from '../utils/decryptTea';
import ParseDecryptedToken from '../utils/parseDecryptedToken';
import CreateResponse from '../utils/createResponse';

const teaPass = process.env.ENCRYPTION_PASSWORD;

export default class Notify {

	static decrypt(token, callback) {
		const isTokenValid = TokenValidator(token);

		if (!isTokenValid) {
			callback(
				null,
				Notify.ErrorResponse({ message: 'Token has not been sanitised' }),
			);
			return;
		}

		const tokenByteArray = new Uint8Array(ConvertHex.hexToBytes(token));
		const teaPassArray = new Uint32Array(ConvertHex.hexToBytes(teaPass));
		const uint32Token = new Uint32Array(tokenByteArray.buffer);

		const decryptedVal = DecryptTea(uint32Token, teaPassArray);
		const penaltyItems = ParseDecryptedToken(decryptedVal);

		if (penaltyItems === '') {
			callback(
				null,
				Notify.ErrorResponse({ message: 'Token is not in the correct format' }),
			);
			return;
		}

		callback(
			null,
			Notify.SuccessfulResponse(penaltyItems),
		);
	}

	static SuccessfulResponse(decryptedObj) {
		return CreateResponse({ body: decryptedObj, statusCode: 200 });
	}

	static ErrorResponse(error) {
		return CreateResponse({ body: error, statusCode: 400 });
	}
}
