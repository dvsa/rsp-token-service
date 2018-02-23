const hexRegex = /^(0x|0X)?[a-fA-F0-9]+$/;

export default (hexString) => {
	return hexString.match(hexRegex) != null;
};
