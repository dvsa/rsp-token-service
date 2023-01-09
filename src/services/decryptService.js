import ConvertHex from 'convert-hex';

import TokenValidator from '../utils/checkFormat';
import IsHex from '../utils/isHex';
import DecryptTea from '../utils/decryptTea';
import ParseDecryptedToken from '../utils/parseDecryptedToken';
import CreateResponse from '../utils/createResponse';
import config from '../config';
import { logError, logInfo } from '../utils/logger';

require('dotenv').config();

export default class Decrypt {

	static async decrypt(token) {
		const teaPass = config.encryptionPassword();
		if (!teaPass) {
			logError('MissingPassword', 'Password missing');
			return Decrypt.MissingPassword();
		}
		if (!TokenValidator(token)) {
			logError('DecryptTokenFailedValidation', { token });
			return Decrypt.IncorrectTokenFormatResponse();
		}
		if (!IsHex(teaPass)) {
			logError('DecryptPassFailedValidation', 'Pass failed validation');
			return Decrypt.IncorrectPassFormat();
		}

		const tokenByteArray = new Uint8Array(ConvertHex.hexToBytes(token));
		const teaPassArray = new Uint32Array(ConvertHex.hexToBytes(teaPass));
		const uint32Token = new Uint32Array(tokenByteArray.buffer);
		logInfo('Bits', { tokenByteArray, teaPassArray, uint32Token });

		let penaltyItems = '';
		try {
			const decryptedVal = DecryptTea(uint32Token, teaPassArray);
			penaltyItems = ParseDecryptedToken(decryptedVal);
		} catch (error) {
			logInfo('DecryptError', { token });
			return Decrypt.IncorrectTokenFormatResponse();
		}

		if (penaltyItems === '') {
			logInfo('DecryptError', { token, message: 'Token has decrypted in the incorrect format' });
			return Decrypt.IncorrectTokenFormatResponse();
		}

		return Decrypt.SuccessfulResponse(penaltyItems);
	}

	static MissingPassword() {
		return Decrypt.ErrorResponse({ message: 'Failed to retrieve password' });
	}

	static IncorrectPassFormat() {
		return Decrypt.ErrorResponse({ message: 'Pass set in environment is not correct' });
	}

	static IncorrectTokenFormatResponse() {
		return Decrypt.ErrorResponse({ message: 'Token is not in the correct format' });
	}

	static SuccessfulResponse(decryptedObj) {
		return CreateResponse({ body: decryptedObj, statusCode: 200 });
	}

	static ErrorResponse(error) {
		return CreateResponse({ body: error, statusCode: 400 });
	}
}
