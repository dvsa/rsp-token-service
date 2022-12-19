import Validation from '@dvsa/rsp-validation';

export default (decryptedToken) => {

	const decryptedBytes = new Uint8Array(decryptedToken.buffer);

	let byteArray = [];
	decryptedBytes.forEach((val, index) => {
		const bin = parseInt(val, 10).toString(2);
		byteArray[index] = '00000000'.slice(bin.length) + bin;
	});

	byteArray = byteArray.reverse();

	const binaryArray = [];
	byteArray.forEach((val) => {
		val.split('').forEach((bit) => {
			binaryArray.push(bit);
		});
	});

	const checkBits = binaryArray.slice(0, 4).join('');
	const paymentAmount = parseInt(binaryArray.slice(4, 18).join(''), 2);
	const docType = parseInt(binaryArray.slice(18, 20).join(''), 2);
	let parsedRef = parseInt(binaryArray.slice(20, 64).join(''), 2).toString();
	let ref = parsedRef;

	if (docType === 1) {
		ref = '0000000000000'.slice(ref.length) + ref;
		parsedRef = ref;
		const splitRef = ref.split('');
		const section1 = parseInt(splitRef.slice(0, 6).join(''), 10);
		const section2 = parseInt(splitRef.slice(6, 7).join(''), 10);
		const section3 = parseInt(splitRef.slice(7, 13).join(''), 10);

		ref = `${section1}-${section2}-${section3}-IM`;
	}

	const validateInfo = {
		checkBits,
		paymentAmount,
		docType,
		parsedRef,
		formattedRef: ref,
	};
	const validationResponse = Validation.tokenValidation(validateInfo);

	if (!validationResponse.valid) {
		return '';
	}

	return {
		Reference: parsedRef,
		FormattedReference: ref,
		DocumentType: docType,
		PaymentAmount: paymentAmount,
	};
};
