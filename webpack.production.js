const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { merge } = require('webpack-merge');
const { lambdas } = require('./lambdas.json');
const common = require('./webpack.common');

class BundlePlugin {
	apply(compiler) {
		compiler.hooks.afterEmit.tapPromise('zip-pack-plugin', async () => {
			await fs.promises.mkdir(path.resolve(__dirname, 'dist'), { recursive: true });
			await Promise.all(lambdas.map((name) => new Promise((resolve, reject) => {
				const output = fs.createWriteStream(path.resolve(__dirname, 'dist', `${name}.zip`));
				const archive = archiver('zip');
				output.on('close', resolve);
				output.on('error', reject);
				archive.on('error', reject);
				archive.on('warning', reject);
				archive.pipe(output);
				archive.directory(path.resolve(__dirname, 'build', name), false);
				archive.finalize().catch(reject);
			})));
		});
	}
}

module.exports = () => merge(common, {
	mode: 'production',
	output: { asyncChunks: false },
	plugins: [new BundlePlugin()],
});
