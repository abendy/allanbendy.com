const webpack = require('webpack');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin-next');
const WebpackNotifierPlugin = require('webpack-notifier');
const CompressionPlugin = require('compression-webpack-plugin');
const S3Plugin = require('webpack-s3-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const {
  MODE = 'development',
  accessKeyId,
  secretAccessKey,
  region,
  s3Bucket,
  cloudFrontId,
} = process.env;

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
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    minimize: MODE === 'production',
    minimizer: [
      new TerserJSPlugin({
        test: /\.js$/,
        exclude: /node_modules/,
        sourceMap: MODE !== 'production',
        extractComments: true,
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  module: {
    rules: [{
      test: /\.pug$/,
      loader: 'pug-loader',
      options: {
        pretty: MODE !== 'production',
      },
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
      use: [
        {
          loader: MiniCssExtractPlugin.loader,
          options: {
            hmr: MODE === 'development', // true in development MODE
          },
        },
        'css-loader',
        'sass-loader',
      ],
    }],
  },
  plugins: [
    new WebpackNotifierPlugin({
      alwaysNotify: true,
      excludeWarnings: false,
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
      inject: false,
      minify: MODE === 'production',
    }),
    new CopyPlugin([
      {
        from: './src/html/**/*',
        to: '../',
        flatten: true,
        ignore: ['*.pug'],
      },
    ]),
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
      onBeforeBuild: {
        scripts: ['rm -f ./dist/**/*.*'],
        blocking: true,
      },
    }),
    new CopyPlugin([
      { from: './src/images', to: '../images' },
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
    new S3Plugin({
      s3Options: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        region: region,
      },
      s3UploadOptions: {
        Bucket: s3Bucket,
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
      cloudfrontInvalidateOptions: {
        DistributionId: cloudFrontId,
        Items: ['/*'],
      },
    }),
  ],
};

module.exports = (MODE === 'development' ? development : production);
