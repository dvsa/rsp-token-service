const hexRegex = /^(0x|0X)?[a-fA-F0-9]+$/;

export default (hexString) => {
	const result = hexString.match(hexRegex);
	if (result || result !== null) {
		return true;
	}
	return false;
};
