'use strict';

const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { assertLoopbackUrl, check, counts, inventory, writeReport } = require('./support.cjs');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'integration-results');
const networkGuardOption = `--require=${JSON.stringify(path.join(__dirname, 'network-guard.cjs'))}`;
// These are the synthetic fixtures used by the existing unit tests.
const password = 'a8D90c092e835dD662';
const paymentToken = '76372ffa74869e0c';
const immobilisationToken = '423b38ef1c4c46b7';
const payment = { Reference: '1231231231231', FormattedReference: '1231231231231', DocumentType: 0, PaymentAmount: 100 };
const immobilisation = { Reference: '1111111111111', FormattedReference: '111111-1-111111-IM', DocumentType: 1, PaymentAmount: 1111 };
const badToken = { message: 'Token is not in the correct format' };
const authPolicy = {
	principalId: 'Auth User',
	policyDocument: { Version: '2012-10-17', Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: '*' }] },
};

const definitions = [
	{ name: 'HTTP: payment token', description: '200, CORS and exact payment reference, type and amount', kind: 'http', body: { Token: paymentToken }, status: 200, expected: payment },
	{ name: 'HTTP: immobilisation token', description: '200, CORS and exact formatted reference, type and amount', kind: 'http', body: { Token: immobilisationToken }, status: 200, expected: immobilisation },
	{ name: 'HTTP: missing token', description: '400, CORS and exact missing-token message', kind: 'http', body: {}, status: 400, expected: 'No token found in the request body' },
	{ name: 'HTTP: invalid hexadecimal token', description: '400, CORS and exact invalid-token message', kind: 'http', body: { Token: 'ZZZZZZZ' }, status: 400, expected: badToken },
	{ name: 'HTTP: valid format, invalid token', description: '400, CORS and exact invalid-token message', kind: 'http', body: { Token: '1234123412341234' }, status: 400, expected: badToken },
	{ name: 'Lambda: object body', description: 'Invoke transport 200, no function error, exact proxy envelope and payment fields', kind: 'lambda', body: { Token: paymentToken }, status: 200, expected: payment },
	{ name: 'Lambda: JSON string body', description: 'Invoke transport 200, no function error, exact proxy envelope and immobilisation fields', kind: 'lambda', body: JSON.stringify({ Token: immobilisationToken }), status: 200, expected: immobilisation },
	{ name: 'Lambda: missing body', description: 'Invoke transport 200, no function error and exact 400 proxy envelope', kind: 'lambda', body: undefined, status: 400, expected: 'No token found in the request body' },
	{ name: 'Authorizer: supplied token', description: 'Test-only async adapter returns exact current Allow policy and principal', kind: 'auth', event: { authorizationToken: 'synthetic-test-value' }, expected: authPolicy },
	{ name: 'Authorizer: missing token', description: 'Test-only async adapter returns the same Allow policy with no token (current stub behaviour)', kind: 'auth', event: {}, expected: authPolicy },
];

const result = {
	timestamp: new Date().toISOString(),
	runtime: process.version,
	target: 'Task-owned Serverless Offline process on loopback; synthetic fixtures',
	safety: 'CI runs prohibited; isolated environment; Secrets Manager disabled; non-loopback TCP connections blocked; no shared storage or AWS access.',
	setup: 'Not started',
	cleanup: 'Not started',
	inventory,
	scenarios: definitions.map(({ name, description }) => ({ name, status: 'not-run', evidence: description, durationMs: 0 })),
	gaps: [
		'The auth handler is not configured as a deployed or local function in this repository; its test-only async adapter does not prove native Lambda completion or deployment.',
		'Serverless Offline timed out when the synchronous auth export was wired directly; the adapter makes its returned policy observable without changing service code.',
		'Local HTTP API emulation does not prove deployed REST API, IAM/SigV4 or AWS Secrets Manager behaviour.',
		'The local emulator runs on the Node process version shown above, not the AWS Lambda runtime.',
		'No real AWS resources, downstream integrations or live credentials were used.',
		'Scenario coverage is not source coverage and does not cover every malformed input or configuration failure.',
	],
};

let child;
let workspace;
let interrupted = false;

function safeMessage(error) {
	if (error && typeof error.message === 'string'
		&& /^(Assertion mismatch:|Setup:|Transport:|Interrupted)/.test(error.message)) return error.message;
	return 'Unexpected error; details withheld to avoid exposing response or configuration data.';
}

function reservePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => resolve(server));
	});
}

function request(url, body) {
	assertLoopbackUrl(url);
	return new Promise((resolve, reject) => {
		const req = http.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, timeout: 10000 }, (res) => {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				data += chunk;
				if (data.length > 65536) req.destroy(new Error('Transport: response exceeds size limit'));
			});
			res.on('end', () => {
				try {
					resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
				} catch {
					reject(new Error('Transport: response was not JSON'));
				}
			});
			res.on('error', reject);
		});
		req.on('timeout', () => req.destroy(new Error('Transport: request timed out')));
		req.on('error', reject);
		req.end(JSON.stringify(body));
	});
}

function startServer(httpPort, lambdaPort) {
	return new Promise((resolve, reject) => {
		const cli = path.join(root, 'node_modules/serverless/bin/serverless.js');
		if (!fs.existsSync(cli)) return reject(new Error('Setup: Serverless is missing; install the lockfile dependencies.'));
		const args = [cli, 'offline', 'start', '--host', '127.0.0.1', '--httpPort', String(httpPort),
			'--lambdaPort', String(lambdaPort), '--stage', 'integration', '--noAuth'];
		child = spawn(process.execPath, args, {
			cwd: workspace,
			env: {
				PATH: process.env.PATH || '',
				HOME: workspace,
				NODE_OPTIONS: networkGuardOption,
				AWS_EC2_METADATA_DISABLED: 'true',
				AWS_ACCESS_KEY_ID: 'local-only',
				AWS_SECRET_ACCESS_KEY: 'local-only',
				SLS_TELEMETRY_DISABLED: '1',
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let readyHttp = false;
		let readyLambda = false;
		let startupOutput = '';
		const timer = setTimeout(() => reject(new Error('Setup: local server did not become ready within 45 seconds.')), 45000);
		const inspectStartup = (chunk) => {
			if (readyHttp && readyLambda) return;
			startupOutput = (startupOutput + chunk.toString()).slice(-8192);
			readyHttp ||= startupOutput.includes(`Server ready: http://127.0.0.1:${httpPort}`);
			readyLambda ||= startupOutput.includes(`Offline [http for lambda] listening on http://127.0.0.1:${lambdaPort}`);
			if (readyHttp && readyLambda) {
				clearTimeout(timer);
				resolve();
			}
		};
		// Service logs may contain tokens; consume them without writing them to reports or the terminal.
		child.stdout.on('data', inspectStartup);
		child.stderr.on('data', inspectStartup);
		child.once('error', () => { clearTimeout(timer); reject(new Error('Setup: could not start the local server.')); });
		child.once('exit', () => { clearTimeout(timer); reject(new Error('Setup: local server exited before readiness.')); });
	});
}

function buildAuthorizer() {
	return new Promise((resolve, reject) => {
		const webpack = path.join(root, 'node_modules/webpack/bin/webpack.js');
		if (!fs.existsSync(webpack)) return reject(new Error('Setup: Webpack is missing; install the lockfile dependencies.'));
		const authSource = path.join(root, 'src/functions/auth.js');
		const entry = path.join(workspace, 'auth-entry.cjs');
		fs.writeFileSync(entry, `const { handler } = require(${JSON.stringify(authSource)});\nexports.handler = async (event) => handler(event);\n`);
		const loader = path.join(root, 'node_modules/babel-loader');
		const config = `module.exports = {
			mode: 'development', target: 'node', entry: ${JSON.stringify(entry)},
			output: { path: ${JSON.stringify(path.join(workspace, 'auth'))}, filename: 'app.js', libraryTarget: 'commonjs2' },
			module: { rules: [{ test: /\\.m?js$/, exclude: /node_modules/, use: { loader: ${JSON.stringify(loader)}, options: { presets: [${JSON.stringify(path.join(root, 'node_modules/@babel/preset-env'))}] } } }] }
		};`;
		const configPath = path.join(workspace, 'webpack-auth.cjs');
		fs.writeFileSync(configPath, config);
		child = spawn(process.execPath, [webpack, '--config', configPath], {
			cwd: workspace,
			env: { PATH: process.env.PATH || '', HOME: workspace, NODE_OPTIONS: networkGuardOption },
			stdio: 'ignore',
		});
		const timer = setTimeout(() => {
			child.kill('SIGTERM');
			reject(new Error('Setup: test-only authorizer build timed out.'));
		}, 60000);
		child.once('error', () => { clearTimeout(timer); reject(new Error('Setup: could not start the authorizer build.')); });
		child.once('exit', (code) => {
			clearTimeout(timer);
			if (code !== 0) reject(new Error('Setup: test-only authorizer build failed.'));
			else resolve();
		});
	});
}

async function executeScenario(definition, httpPort, lambdaPort) {
	if (definition.kind === 'http') {
		const response = await request(`http://127.0.0.1:${httpPort}/decrypt`, definition.body);
		check(response.status, definition.status, 'HTTP status');
		check(response.headers['access-control-allow-origin'], '*', 'HTTP CORS header');
		check((response.headers['content-type'] || '').split(';')[0], 'application/json', 'HTTP content type');
		check(response.body, definition.expected, 'HTTP response body and domain fields');
	} else if (definition.kind === 'lambda') {
		const event = definition.body === undefined ? {} : { body: definition.body };
		const response = await request(`http://127.0.0.1:${lambdaPort}/2015-03-31/functions/rsp-token-decrypt-integration-decrypt/invocations`, event);
		check(response.status, 200, 'Lambda invoke transport status');
		check(response.headers['x-amz-function-error'], undefined, 'Lambda function error');
		check(response.body, {
			statusCode: definition.status,
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: JSON.stringify(definition.expected),
		}, 'Lambda proxy envelope and domain fields');
	} else {
		const response = await request(`http://127.0.0.1:${lambdaPort}/2015-03-31/functions/rsp-token-decrypt-integration-auth/invocations`, definition.event);
		check(response.status, 200, 'Authorizer invoke transport status');
		check(response.headers['x-amz-function-error'], undefined, 'Authorizer function error');
		check(response.body, definition.expected, 'Authorizer principal and policy');
	}
}

async function cleanup() {
	if (child && child.exitCode === null && child.signalCode === null) {
		const exited = new Promise((resolve) => child.once('exit', resolve));
		child.kill('SIGTERM');
		await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
		if (child.exitCode === null && child.signalCode === null) {
			child.kill('SIGKILL');
			await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
		}
		if (child.exitCode === null && child.signalCode === null) throw new Error('Local server could not be stopped');
	}
	if (workspace) fs.rmSync(workspace, { recursive: true, force: true });
}

async function main() {
	console.log('Integration baseline: checking safety and local build...');
	process.on('SIGINT', () => { interrupted = true; if (child) child.kill('SIGTERM'); });
	process.on('SIGTERM', () => { interrupted = true; if (child) child.kill('SIGTERM'); });
	try {
		if (process.env.CI) throw new Error('Setup: integration runs are not allowed in CI.');
		const build = path.join(root, 'build');
		const configPath = path.join(build, 'serverless.yml');
		if (!fs.existsSync(configPath) || !fs.existsSync(path.join(build, 'decrypt/app.js'))) {
			throw new Error('Setup: local build is missing; run npm run build first.');
		}
		const config = fs.readFileSync(configPath, 'utf8');
		if (!config.includes('USE_SECRETS_MANAGER: "false"')
			|| !config.includes("ENCRYPTION_PASSWORD: ${env:ENCRYPTION_PASSWORD, 'password'}")) {
			throw new Error('Setup: expected local-only configuration was not found; rebuild and review the local configuration.');
		}
		if (!/runtime:\s*nodejs\d+\.x/.test(config)) {
			throw new Error('Setup: local Node runtime configuration was not found.');
		}
		workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'rsp-token-integration-'));
		fs.cpSync(path.join(build, 'decrypt'), path.join(workspace, 'decrypt'), { recursive: true });
		fs.cpSync(path.join(build, 'models'), path.join(workspace, 'models'), { recursive: true });
		fs.symlinkSync(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
		const offlineConfig = config.replace("ENCRYPTION_PASSWORD: ${env:ENCRYPTION_PASSWORD, 'password'}", `ENCRYPTION_PASSWORD: "${password}"`);
		fs.writeFileSync(path.join(workspace, 'serverless.yml'), `${offlineConfig}\n  auth:\n    handler: auth/app.handler\n`);
		console.log('Building the exported authorizer for test-only Lambda invocation...');
		await buildAuthorizer();
		if (interrupted) throw new Error('Interrupted before emulator startup.');
		const first = await reservePort();
		const second = await reservePort();
		const httpPort = first.address().port;
		const lambdaPort = second.address().port;
		await Promise.all([new Promise((resolve) => first.close(resolve)), new Promise((resolve) => second.close(resolve))]);
		console.log('Starting isolated loopback HTTP and Lambda emulators...');
		await startServer(httpPort, lambdaPort);
		if (interrupted) throw new Error('Interrupted before scenarios started.');
		result.setup = 'Local emulator ready; synthetic configuration and loopback network guard enabled';
		for (let index = 0; index < definitions.length; index += 1) {
			const definition = definitions[index];
			const scenario = result.scenarios[index];
			if (interrupted) continue;
			console.log(`[${index + 1}/${definitions.length}] ${definition.name}...`);
			const started = Date.now();
			try {
				await executeScenario(definition, httpPort, lambdaPort);
				scenario.status = 'passed';
				scenario.evidence += '; assertions passed';
			} catch (error) {
				scenario.status = 'failed';
				scenario.evidence += `; ${safeMessage(error)}`;
			}
			scenario.durationMs = Date.now() - started;
			console.log(`  ${scenario.status}`);
		}
	} catch (error) {
		result.setup = safeMessage(error);
		result.scenarios[0].status = 'dependency-unavailable';
		result.scenarios[0].evidence += `; ${result.setup}`;
	} finally {
		console.log('Stopping task-owned emulator and removing temporary files...');
		try {
			await cleanup();
			result.cleanup = 'Task-owned process stopped and temporary files removed; no persistent fixtures were created';
		} catch {
			result.cleanup = 'Cleanup failed; check for a task-owned emulator or temporary rsp-token-integration directory';
			result.gaps.push('Cleanup failed and needs manual investigation.');
		}
		result.totals = counts(result.scenarios);
		try {
			const reports = writeReport(outputDirectory, result);
			console.log(`Results: ${JSON.stringify(result.totals)}\nHTML: ${reports.htmlPath}\nJSON: ${reports.jsonPath}`);
		} catch {
			console.error('Could not write integration reports; check permissions for integration-results.');
			process.exitCode = 1;
		}
		if (result.totals.failed || result.totals['dependency-unavailable'] || interrupted || result.cleanup.startsWith('Cleanup failed')) process.exitCode = 1;
	}
}

main();
