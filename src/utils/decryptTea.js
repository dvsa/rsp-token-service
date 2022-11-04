export default (token, password) => {
	if (token.length !== 2 && password.length !== 4) {
		return '';
	}

	let sum = 0xC6EF3720;
	const delta = 0x9E3779B9;

	const value = new Uint32Array(token.buffer);
	const key = password;

	for (let i = 0; i < 32; i += 1) {
		value[1] = value[1] - (((value[0]<<4) + key[2]) ^ (value[0] + sum) ^ ((value[0]>>>5) + key[3])); // eslint-disable-line
		value[0] = value[0] - (((value[1]<<4) + key[0]) ^ (value[1] + sum) ^ ((value[1]>>>5) + key[1])); // eslint-disable-line
		sum = sum - delta; // eslint-disable-line
	}

	return value;
};
