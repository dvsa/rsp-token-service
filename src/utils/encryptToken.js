export default class Encrypt {
	static encrypt(referenceNo, documentType, amount) {
		const referenceNoBits = this.numberToBits(referenceNo, 44);
		const documentTypeBits = this.numberToBits(documentType, 2);
		const amountBits = this.numberToBits(amount, 14);

		const totalBits = this.getBits(referenceNoBits, documentTypeBits, amountBits);

		return this.tokenInBytes(totalBits);

	}

	static tokenInBytes(bits) {
		const bytesArr = [];
		for (let i = 0; i < bits.length; i += 8) {
			bytesArr.push(bits.slice(i, i + 8));
		}

		const tokenInBytes = bytesArr.map((element) => parseInt(element.reverse().join(''), 2));
		return tokenInBytes;
	}

	static getBits(ref, doc, amount) {
		return [...ref, ...doc, ...amount, 0, 0, 0, 0];
	}

	static numberToBits(ref, size) {
		const bigInt = BigInt(ref).toString(2);
		const splitRef = (bigInt.split('')).reverse();
		const arr = [];
		splitRef.forEach((bit, i) => {
			arr[i] = parseInt(bit, 10);
		});

		if (arr.length !== size) {
			const extras = size - arr.length;
			for (let i = 0; i < extras; i += 1) {
				arr.push(0);
			}
		}
		return arr;
	}

}
