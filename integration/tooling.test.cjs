'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { assertLoopbackUrl, check, counts, escapeHtml, inventory, writeReport } = require('./support.cjs');

test('only unauthenticated loopback HTTP targets are permitted', () => {
	assert.equal(assertLoopbackUrl('http://127.0.0.1:1234/decrypt').hostname, '127.0.0.1');
	for (const url of ['https://127.0.0.1/', 'http://example.com/', 'http://127.0.0.1.example.com/', 'http://user:pass@localhost/']) {
		assert.throws(() => assertLoopbackUrl(url));
	}
});

test('network guard blocks remote and Unix socket connections', () => {
	for (const target of ["443, 'example.com'", "{ port: 443, host: '203.0.113.1' }", "{ path: '/tmp/socket' }"]) {
		const script = `try { require('node:net').connect(${target}); process.exit(2); } catch { process.exit(0); }`;
		const run = spawnSync(process.execPath, ['--require', path.join(__dirname, 'network-guard.cjs'), '-e', script]);
		assert.equal(run.status, 0);
	}
});

test('assertion failures do not expose response values', () => {
	assert.throws(() => check({ token: 'private-value' }, {}, 'response'), (error) => {
		assert.doesNotMatch(error.message, /private-value/);
		return true;
	});
	assert.throws(() => check(500, 400, 'HTTP status'), /expected 400, actual 500/);
});

test('inventory matches exports and configured local function and route', () => {
	const root = path.resolve(__dirname, '..');
	const handler = fs.readFileSync(path.join(root, 'src/handler.js'), 'utf8');
	const names = handler.match(/export\s*{([^}]+)}/)[1].split(',').map((name) => name.trim()).filter(Boolean).sort();
	assert.deepEqual(inventory.map((item) => item.handler).sort(), names);
	const config = fs.readFileSync(path.join(root, 'serverless.yml'), 'utf8');
	assert.match(config, /path:\s*\/decrypt/);
	assert.match(config, /method:\s*post/);
	assert.match(config, /handler:\s*build\/decrypt\/app\.handler/);
});

test('reports escape markup and count every outcome', () => {
	assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
	assert.deepEqual(counts([{ status: 'passed' }, { status: 'not-run' }]), {
		passed: 1, failed: 0, skipped: 0, 'not-run': 1, 'dependency-unavailable': 0,
	});
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsp-token-report-test-'));
	try {
		const result = {
			timestamp: 'now', runtime: 'test', target: '<script>', safety: 'local', setup: 'ok', cleanup: 'ok',
			inventory: [], scenarios: [{ name: '<img>', status: 'passed', evidence: 'safe', durationMs: 1 }],
			totals: counts([{ status: 'passed' }]), gaps: [],
		};
		const reports = writeReport(dir, result);
		assert.match(fs.readFileSync(reports.htmlPath, 'utf8'), /&lt;img&gt;/);
		assert.doesNotMatch(fs.readFileSync(reports.htmlPath, 'utf8'), /<img>/);
		assert.equal(JSON.parse(fs.readFileSync(reports.jsonPath, 'utf8')).totals.passed, 1);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('CI rejection writes an honest report without environment secrets', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsp-token-ci-test-'));
	try {
		fs.cpSync(__dirname, path.join(dir, 'integration'), { recursive: true });
		const secret = 'private-test-value-do-not-report';
		const run = spawnSync(process.execPath, [path.join(dir, 'integration/run.cjs')], {
			env: { ...process.env, CI: 'true', SECRET_TOKEN: secret }, encoding: 'utf8', timeout: 15000,
		});
		assert.equal(run.status, 1);
		const json = fs.readFileSync(path.join(dir, 'integration-results/latest.json'), 'utf8');
		const html = fs.readFileSync(path.join(dir, 'integration-results/latest.html'), 'utf8');
		const result = JSON.parse(json);
		assert.equal(result.totals['dependency-unavailable'], 1);
		assert.equal(result.totals.passed, 0);
		assert.match(result.setup, /not allowed in CI/);
		assert.doesNotMatch(json + html + run.stdout + run.stderr, new RegExp(secret));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
