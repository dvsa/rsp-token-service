'use strict';

const net = require('node:net');
const originalConnect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function guardedConnect(...args) {
	const first = Array.isArray(args[0]) ? args[0][0] : args[0];
	const options = typeof first === 'object' && first !== null
		? first
		: { port: args[0], host: typeof args[1] === 'string' ? args[1] : undefined };
	const host = options.host || 'localhost';
	if (options.path || !['localhost', '127.0.0.1', '::1'].includes(host)) {
		throw new Error('Integration network guard blocked a non-loopback connection');
	}
	return originalConnect.apply(this, args);
};
