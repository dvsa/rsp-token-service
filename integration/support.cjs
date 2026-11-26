'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const inventory = [
	{
		handler: 'decrypt',
		localFunction: 'decrypt',
		interface: 'POST /decrypt (local HTTP API, noAuth); direct Lambda proxy event',
		contract: 'Token in JSON body; proxy response contains statusCode, CORS header and JSON-string body.',
		dependencies: 'No persistence. Local environment password; deployed configuration may use AWS Secrets Manager.',
	},
	{
		handler: 'auth',
		localFunction: 'Test-only auth function; not configured in SAM or serverless offline',
		interface: 'Exported authorizer via a test-only async adapter and local Lambda invocation; no configured route',
		contract: 'authorizationToken event; returns an Allow policy and principal.',
		dependencies: 'No persistence or downstream calls. The current stub always returns Allow, including for missing tokens; the adapter does not prove native Lambda completion behaviour.',
	},
];

function assertLoopbackUrl(value) {
	const url = new URL(value);
	if (url.protocol !== 'http:' || !['127.0.0.1', '::1', '[::1]', 'localhost'].includes(url.hostname)
		|| url.username || url.password) {
		throw new Error('Target must be an unauthenticated loopback HTTP URL');
	}
	return url;
}

function check(actual, expected, label) {
	if (!isDeepStrictEqual(actual, expected)) {
		if (typeof actual === 'number' && typeof expected === 'number') {
			throw new Error(`Assertion mismatch: ${label} (expected ${expected}, actual ${actual})`);
		}
		throw new Error(`Assertion mismatch: ${label} (expected and actual values withheld)`);
	}
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (char) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
	}[char]));
}

function counts(scenarios) {
	const totals = { passed: 0, failed: 0, skipped: 0, 'not-run': 0, 'dependency-unavailable': 0 };
	for (const scenario of scenarios) totals[scenario.status] += 1;
	return totals;
}

function writeReport(directory, result) {
	fs.mkdirSync(directory, { recursive: true });
	const jsonPath = path.join(directory, 'latest.json');
	const htmlPath = path.join(directory, 'latest.html');
	fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
	const rows = result.scenarios.map((scenario) => `<tr><td>${escapeHtml(scenario.name)}</td><td>${escapeHtml(scenario.status)}</td><td>${escapeHtml(scenario.evidence)}</td><td>${escapeHtml(scenario.durationMs)} ms</td></tr>`).join('');
	const handlers = result.inventory.map((item) => `<li><strong>${escapeHtml(item.handler)}</strong>: ${escapeHtml(item.localFunction)}; ${escapeHtml(item.interface)}. ${escapeHtml(item.contract)} ${escapeHtml(item.dependencies)}</li>`).join('');
	const totals = Object.entries(result.totals).map(([name, value]) => `${escapeHtml(name)}: ${value}`).join(' | ');
	const gaps = result.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join('');
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Token integration baseline</title><style>body{font:16px system-ui;max-width:70rem;margin:2rem auto;padding:0 1rem;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:.5rem;text-align:left;vertical-align:top}th{background:#eee}code{overflow-wrap:anywhere}</style></head><body><h1>Token integration baseline</h1><p>${escapeHtml(result.timestamp)} | ${escapeHtml(result.runtime)} | ${escapeHtml(result.target)}</p><p>${escapeHtml(result.safety)}</p><p><strong>${totals}</strong></p><p>Setup: ${escapeHtml(result.setup)}. Cleanup: ${escapeHtml(result.cleanup)}.</p><h2>Inventory</h2><ul>${handlers}</ul><h2>Scenarios</h2><table><thead><tr><th>Scenario</th><th>Result</th><th>Checks and evidence</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table><h2>Limitations</h2><ul>${gaps}</ul></body></html>`;
	fs.writeFileSync(htmlPath, html, { mode: 0o600 });
	return { jsonPath, htmlPath };
}

module.exports = { assertLoopbackUrl, check, counts, escapeHtml, inventory, writeReport };
