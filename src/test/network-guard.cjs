const http = require('node:http');
const https = require('node:https');

function denyNetwork() {
	throw new Error('Network requests are not allowed in unit tests');
}

http.request = denyNetwork;
http.get = denyNetwork;
https.request = denyNetwork;
https.get = denyNetwork;
