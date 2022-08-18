import IsHex from './isHex';

export default (token) => {
	// This util will check the basic format of the token.
	return token.length === 16 && IsHex(token);
};
