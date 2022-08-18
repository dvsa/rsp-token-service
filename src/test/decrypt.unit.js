import expect from 'expect';
import DecryptService from '../services/decryptService';
import config from '../config';

describe('Decrypt Service', () => {
	before(() => {
		config.bootstrap();
	});
	it('should decrypt a valid Payment token', () => {
		const token = '3b0fbefe2efa2854';
		const expectedRef = '1231231231231';
		const expectedFormattedRef = '1231231231231';
		const expectedDocType = 0;
		const expectedPaymentAmount = 100;

		DecryptService.decrypt(token, (req, res) => {
			const response = JSON.parse(res.body);
			expect(response.Reference).toBe(expectedRef);
			expect(response.FormattedReference).toBe(expectedFormattedRef);
			expect(response.DocumentType).toBe(expectedDocType);
			expect(response.PaymentAmount).toBe(expectedPaymentAmount);
		});
	});

	it('should decrypt a valid Immobilisation token', () => {
		const token = '6019677b2f024db3';
		const expectedRef = '1111111111111';
		const expectedFormattedRef = '111111-1-111111-IM';
		const expectedDocType = 1;
		const expectedPaymentAmount = 1111;

		DecryptService.decrypt(token, (req, res) => {
			const response = JSON.parse(res.body);
			expect(response.Reference).toBe(expectedRef);
			expect(response.FormattedReference).toBe(expectedFormattedRef);
			expect(response.DocumentType).toBe(expectedDocType);
			expect(response.PaymentAmount).toBe(expectedPaymentAmount);
		});
	});

	it('incorrect hexadecimal token should return statusCode 400', () => {
		const token = 'ZZZZZZZ';

		DecryptService.decrypt(token, (req, res) => {
			expect(res.statusCode).toBe(400);
		});
	});

	it('unsanitised token should return statusCode 400', () => {
		const token = '1234-1234-1234-1234';

		DecryptService.decrypt(token, (req, res) => {
			expect(res.statusCode).toBe(400);
		});
	});

	it('incorrect token should return statusCode 400', () => {
		const token = '1234123412341234';

		DecryptService.decrypt(token, (req, res) => {
			expect(res.statusCode).toBe(400);
		});
	});
});
