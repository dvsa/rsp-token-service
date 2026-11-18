'use strict';

const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

function denyNetwork() {
	throw new Error('Network access is disabled during unit tests');
}
http.request = denyNetwork;
http.get = denyNetwork;
https.request = denyNetwork;
https.get = denyNetwork;
net.Socket.prototype.connect = denyNetwork;
process.env.AWS_ACCESS_KEY_ID = 'unit-test-only';
process.env.AWS_SECRET_ACCESS_KEY = 'unit-test-only';
process.env.AWS_EC2_METADATA_DISABLED = 'true';
process.env.AWS_SDK_LOAD_CONFIG = '0';
delete process.env.AWS_PROFILE;
require('dotenv').config = () => ({ parsed: {} });
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
SecretsManagerClient.prototype.send = () => {
	throw new Error('Unexpected Secrets Manager call in unit tests');
};
