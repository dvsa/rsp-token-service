import expect from 'expect';
import sinon from 'sinon';
import DecryptService from '../services/decryptService';
import config from '../config';

describe('Decrypt Service', () => {
	let configStub;
	beforeEach(() => {
		sinon.stub(console, 'log');
		sinon.stub(console, 'debug');
		sinon.stub(console, 'error');
		configStub = sinon.stub(config, 'encryptionPassword').returns('a8D90c092e835dD662');
	});
	afterEach(() => {
		sinon.restore();
	});
	it('should decrypt a valid Payment token', async () => {
		const token = '76372ffa74869e0c';
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
		const token = '423b38ef1c4c46b7';
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
		expect(res.body).toBe(JSON.stringify({ message: 'Token is not in the correct format' }));
		expect(res.statusCode).toBe(400);
	});

	it('unsanitised token should return statusCode 400', async () => {
		const token = '1234-1234-1234-1234';

		const res = await DecryptService.decrypt(token);
		expect(res.body).toBe(JSON.stringify({ message: 'Token is not in the correct format' }));
		expect(res.statusCode).toBe(400);
	});

	it('incorrect token should return statusCode 400', async () => {
		const token = '1234123412341234';

		const res = await DecryptService.decrypt(token);
		expect(res.body).toBe(JSON.stringify({ message: 'Token is not in the correct format' }));
		expect(res.statusCode).toBe(400);
	});

	it('missing env password should return statusCode 400', async () => {
		configStub.returns(undefined);
		const res = await DecryptService.decrypt('1234123412341234');
		expect(res.body).toBe(JSON.stringify({ message: 'Failed to retrieve password' }));
		expect(res.statusCode).toBe(400);
	});
});
