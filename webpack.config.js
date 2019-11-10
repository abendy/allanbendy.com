const webpack = require('webpack');
const path = require('path');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin-next');
const WebpackNotifierPlugin = require('webpack-notifier');
const CompressionPlugin = require('compression-webpack-plugin');
const S3Plugin = require('webpack-s3-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const { MODE = 'development' } = process.env;

const base = {
    entry: {
        main: [
            './src/styles/main.scss',
            './src/scripts/main.js',
        ],
    },
    output: {
        path: path.join(__dirname, './dist/assets/'),
        filename: '[name].js',
    },
    module: {
        rules: [{
            test: /\.pug$/,
            loader: 'pug-loader',
        },
        {
            enforce: 'pre',
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'eslint-loader',
            options: {
                'no-debugger': MODE === 'production' ? 2 : 0,
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
                    hmr: MODE === 'development',
                },
            },
            'css-loader',
            'sass-loader',
            ],
        }],
    },
    plugins: [
        new Dotenv(),
        new WebpackNotifierPlugin({
            excludeWarnings: true,
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: MODE === 'production',
            debug: MODE !== 'production',
        }),
        new HtmlWebpackPlugin({
            template: './src/html/index.pug',
            filename: '../index.html',
        }),
        new CopyPlugin([
            {
                from: './src/html/**/*',
                to: '../',
                flatten: true,
                ignore: ['*.pug'],
            },
        ]),
        new CompressionPlugin({
            test: /\.(css|js)$/,
            algorithm: 'gzip',
            compressionOptions: { level: 9 },
            filename(info) {
                const filename = info.file.match(/^[^.]+/)[0];
                const extension = info.file.match(/[^.]+$/)[0];
                return `${filename}.${extension}${info.query}`;
            },
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
    devtool: 'none',
    module: {
        ...base.module,
    },
    plugins: [
        ...base.plugins,
        new WebpackShellPlugin({
            onBuildEnd: {
                scripts: ['rsync -r --checksum --size-only src/images/. dist/images/'],
                blocking: false,
                parallel: true,
            },
        }),
        new BrowserSyncPlugin({
            host: 'localhost',
            port: 3000,
            server: {
                baseDir: ['dist'],
            },
        }),
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
        new WebpackShellPlugin({
            onBuildStart: {
                scripts: ['rm -f ./dist/**/*.*'],
                blocking: true,
                parallel: false,
            },
        }),
        new CopyPlugin([
            { from: './src/images', to: '../images' },
        ]),
        new S3Plugin({
            s3Options: {
                accessKeyId: process.env.accessKeyId,
                secretAccessKey: process.env.secretAccessKey,
                region: process.env.region,
            },
            s3UploadOptions: {
                Bucket: process.env.bucket,
                // Here we set the Content-Encoding header for all the gzipped files to 'gzip'
                // eslint-disable-next-line consistent-return
                ContentEncoding(fileName) {
                    if (/\.(css|js)$/.test(fileName)) {
                        return 'gzip';
                    }
                },
                // Here we set the Content-Type header
                // for the gzipped files to their appropriate values
                // so the browser can interpret them properly
                // eslint-disable-next-line consistent-return
                ContentType(fileName) {
                    if (/\.css/.test(fileName)) {
                        return 'text/css';
                    }
                    if (/\.js/.test(fileName)) {
                        return 'text/javascript';
                    }
                },
            },
            directory: './dist/', // This is the directory you want to upload
        }),
    ],
};

module.exports = (MODE === 'development' ? development : production);
