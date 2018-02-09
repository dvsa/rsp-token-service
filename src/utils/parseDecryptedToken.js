
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

	if (checkBits !== '0000') {
		return '';
	}

	const paymentAmount = parseInt(binaryArray.slice(4, 18).join(''), 2);
	const docType = parseInt(binaryArray.slice(18, 20).join(''), 2);
	const ref = parseInt(binaryArray.slice(20, 64).join(''), 2);

	return {
		ReferenceNumber: ref,
		DocumentType: docType,
		PaymentAmount: paymentAmount,
	};
};
