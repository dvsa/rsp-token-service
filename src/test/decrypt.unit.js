import expect from 'expect';
import DecryptService from '../services/decryptService';
import config from '../config';

describe('Decrypt Service', () => {
	before(() => {
		config.bootstrap();
	});
	it('should decrypt a valid Payment token', async () => {
		const token = '3b0fbefe2efa2854';
		const expectedRef = '1231231231231';
		const expectedFormattedRef = '1231231231231';
		const expectedDocType = 0;
		const expectedPaymentAmount = 100;

		const res = await DecryptService.decrypt(token);
		expect(res.statusCode).toBe(200);
		const response = JSON.parse(res.body);
		expect(response.Reference).toBe(expectedRef);
		expect(response.FormattedReference).toBe(expectedFormattedRef);
		expect(response.DocumentType).toBe(expectedDocType);
		expect(response.PaymentAmount).toBe(expectedPaymentAmount);
	});

	it('should decrypt a valid Immobilisation token', async () => {
		const token = '6019677b2f024db3';
		const expectedRef = '1111111111111';
		const expectedFormattedRef = '111111-1-111111-IM';
		const expectedDocType = 1;
		const expectedPaymentAmount = 1111;

		const res = await DecryptService.decrypt(token);
		expect(res.statusCode).toBe(200);
		const response = JSON.parse(res.body);
		expect(response.Reference).toBe(expectedRef);
		expect(response.FormattedReference).toBe(expectedFormattedRef);
		expect(response.DocumentType).toBe(expectedDocType);
		expect(response.PaymentAmount).toBe(expectedPaymentAmount);
	});

	it('incorrect hexadecimal token should return statusCode 400', async () => {
		const token = 'ZZZZZZZ';
		const res = await DecryptService.decrypt(token);
		expect(res.statusCode).toBe(400);
	});

	it('unsanitised token should return statusCode 400', async () => {
		const token = '1234-1234-1234-1234';

		const res = await DecryptService.decrypt(token);
		expect(res.statusCode).toBe(400);
	});

	it('incorrect token should return statusCode 400', async () => {
		const token = '1234123412341234';

		const res = await DecryptService.decrypt(token);
		expect(res.statusCode).toBe(400);
	});

	it.skip('missing env password should return statusCode 400', async () => {
		// test currently skipped as the password is stored in env variable and is needed for the other tests to pass
		// TODO use test password for tests and stub config so env variable not required for unit tests
		const res = await DecryptService.decrypt('1234123412341234');
		expect(res.statusCode).toBe(400);
	});
});
