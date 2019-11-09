const webpack = require('webpack');
const path = require('path');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin-next');
const WebpackNotifierPlugin = require('webpack-notifier');
const CompressionPlugin = require('compression-webpack-plugin');

const { MODE = 'development' } = process.env;

const base = {
    entry: {
        main: [
            './src/styles/main.scss',
            './src/scripts/main.js',
        ],
    },
    output: {
        path: path.join(__dirname, './dist/'),
        filename: '[name].js',
    },
    module: {
        rules: [{
                enforce: 'pre',
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'eslint-loader',
                options: {
                    'no-debugger': WP_ENV === 'production' ? 2 : 0,
                },
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    cacheDirectory: true,
                    presets: [
                        '@babel/preset-env',
                    ],
                },
            },
            {
                test: /\.(sa|sc|c)ss$/,
                exclude: /node_modules/,
                use: [{
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: WP_ENV === 'development',
                        },
                    },
                    'css-loader?sourceMap',
                    'sass-loader?sourceMap',
                ],
            },
            {
                test: /\.(png|jp(e*)g|gif)$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 8000, // Convert images < 8kb to base64 strings
                        name: '../images/[name].[ext]',
                    },
                }],
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)$/,
                loader: 'url-loader',
                options: {
                    limit: 1024,
                    name: '../fonts/[name].[ext]',
                },
            }
        ],
    },
    plugins: [
        new Dotenv(),
        new WebpackShellPlugin({
            onBuildStart: {
                scripts: ['rm -f ./dist/**/*.*'],
                blocking: true,
                parallel: false,
            },
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: MODE === 'production',
            debug: MODE !== 'production',
        }),
    ],
    node: {
        fs: 'empty', // avoids error messages
    },
};

const development = {
    ...base,
    mode: 'development',
    watch: true,
    devtool: 'source-map',
    module: {
        ...base.module,
    },
    plugins: [
        ...base.plugins,
    ],
};

const production = {
    ...base,
    mode: 'production',
    devtool: false,
    module: {
        ...base.module,
    },
    plugins: [
        ...base.plugins,
        new WebpackNotifierPlugin({
            excludeWarnings: true
        }),
        new CompressionPlugin({
            test: /\.(html|css|js)$/,
            exclude: /node_modules/,
            algorithm: 'gzip',
            compressionOptions: { level: 9 },
            // filename: '[path][query]',
            filename(info) {
                const filename = info.file.match(/^[^.]+/)[0];
                const extension = info.file.match(/[^.]+$/)[0];
                return `${filename}.gz.${extension}${info.query}`;
            },
            deleteOriginalAssets: true,
        }),
    ],
};

module.exports = (MODE === 'development' ? development : production);
