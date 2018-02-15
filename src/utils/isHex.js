const hexRegex = '/^(0x|0X)?[a-fA-F0-9]+$/';

export default (hexString) => {
	return hexRegex.match(hexString);
};
