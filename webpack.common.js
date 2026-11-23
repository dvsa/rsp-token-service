const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { lambdas } = require('./lambdas.json');

module.exports = {
	entry: Object.fromEntries(lambdas.map((name) => [name, path.resolve(__dirname, `src/functions/${name}.js`)])),
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: '[name]/app.js',
		libraryTarget: 'commonjs2',
		asyncChunks: false,
	},
	target: 'node',
	mode: 'development',
	resolve: { extensions: ['.js', '.ts'] },
	externals: { fsevents: 'require(\'fsevents\')' },
	module: {
		rules: [{
			test: /\.m?js$/,
			exclude: /node_modules/,
			use: { loader: 'babel-loader', options: { presets: [['@babel/preset-env']] } },
		}],
	},
	plugins: [new CopyWebpackPlugin({
		patterns: [
			{ from: 'serverless/serverless.yml', to: 'serverless.yml' },
			{ from: 'src/models', to: 'models' },
		],
	})],
};
