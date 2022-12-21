/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

/** @type WebpackConfig */
const webExtensionConfig = {
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
	target: 'webworker', // extensions run in a webworker context
	entry: {
		'terminal/extension': './src/terminal/extension.ts',
		'typescript/extension': './src/typescript/extension.ts',
		'assemblyscript/extension': './src/assemblyscript/extension.ts'
	},
	output: {
		filename: '[name].js',
		path: path.join(__dirname, './dist/'),
		libraryTarget: 'commonjs',
		devtoolModuleFilenameTemplate: '../../[resource-path]'
	},
	resolve: {
		mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
		extensions: ['.ts', '.js'], // support ts-files and js-files
		alias: {
			// provides alternate implementation for node module and source files
		},
		fallback: {
			// Webpack 5 no longer polyfills Node.js core modules automatically.
			// see https://webpack.js.org/configuration/resolve/#resolvefallback
			// for the list of Node.js core module polyfills.
			'assert': require.resolve('assert'),
			'path': require.resolve('path-browserify'),
      'crypto': require.resolve('crypto-browserify'),
      'buffer': require.resolve('buffer'),
      'os': require.resolve('os-browserify/browser'),
      'process': require.resolve('process/browser'),
			'fs': require.resolve('memfs'),
			"perf_hooks": require.resolve('universal-perf-hooks'),
      stream: require.resolve('stream-browserify'),
		}
	},
	module: {
		rules: [
      {
				test: /\.worker\.ts$/,
				loader: 'worker-loader',
				options: {
					esModule: false
				}
			},
			{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader'
			}]
		}]
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: 1 // disable chunks by default since web extensions must be a single bundle
		}),
		new webpack.ProvidePlugin({
			process: 'process/browser', // provide a shim for the global `process` variable
		}),
		new CopyPlugin({
			patterns: [
				{
					from: 'package-descriptors/terminal.package.json',
					to: 'terminal/package.json',
          force: true,
				},
				{
					from: 'package-descriptors/typescript.package.json',
					to: 'typescript/package.json',
          force: true,
				},
				{
					from: 'package-descriptors/assemblyscript.package.json',
					to: 'assemblyscript/package.json',
          force: true,
				}
			]
		})
	],
	externals: {
		'vscode': 'commonjs vscode', // ignored because it doesn't exist
	},
	performance: {
		hints: false
	},
	devtool: 'source-map', // create a source map that points to the original source file
	infrastructureLogging: {
		level: "log", // enables logging required for problem matchers
	},
};

module.exports = [ webExtensionConfig ];