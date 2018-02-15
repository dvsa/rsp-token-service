const hexRegex = '/^(0z|0X)?[a-fA-F0-9]+$/';

export default (hexString) => {
	const isHex = hexRegex.match(hexString);
	return isHex;
};
