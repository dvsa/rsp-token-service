import IsHex from '../utils/isHex';

export default (token) => {
	// This util will check the basic format of the passed in token.

	if (token === '' || token.includes('-') || token.includes(' ')) {
		return false;
	}
	return !IsHex(token);
};
