const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    mode: isProduction ? 'production' : 'development',
    
    entry: {
        main: './js/main.js',
        auth: './js/auth.js',
        utils: './js/utils.js',
        security: './js/security.js',
        validation: './js/validation.js',
        products: './js/products.js',
        cart: './js/cart.js',
        search: './js/search.js'
    },
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
        chunkFilename: isProduction ? 'js/[name].[contenthash:8].chunk.js' : 'js/[name].chunk.js',
        publicPath: '/',
        clean: true
    },
    
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    browsers: ['> 1%', 'last 2 versions', 'not ie <= 8']
                                },
                                useBuiltIns: 'usage',
                                corejs: 3
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-syntax-dynamic-import'
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: [
                    isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            sourceMap: !isProduction
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    ['autoprefixer'],
                                    ['cssnano', { preset: 'default' }]
                                ]
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(png|jpe?g|gif|svg|webp)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024 // 8kb
                    }
                },
                generator: {
                    filename: 'img/[name].[contenthash:8][ext]'
                }
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[contenthash:8][ext]'
                }
            }
        ]
    },
    
    plugins: [
        new CleanWebpackPlugin(),
        
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            inject: 'body',
            minify: isProduction ? {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            } : false
        }),
        
        ...(isProduction ? [
            new MiniCssExtractPlugin({
                filename: 'css/[name].[contenthash:8].css',
                chunkFilename: 'css/[name].[contenthash:8].chunk.css'
            }),
            
            new CompressionPlugin({
                algorithm: 'gzip',
                test: /\.(js|css|html|svg)$/,
                threshold: 8192,
                minRatio: 0.8
            }),
            
            // Descomente para análise de bundle
            // new BundleAnalyzerPlugin({
            //     analyzerMode: 'static',
            //     openAnalyzer: false
            // })
        ] : [])
    ],
    
    optimization: {
        minimize: isProduction,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: isProduction,
                        drop_debugger: isProduction
                    },
                    format: {
                        comments: false
                    }
                },
                extractComments: false
            }),
            new CssMinimizerPlugin()
        ],
        
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10
                },
                common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    priority: 5,
                    reuseExistingChunk: true
                },
                styles: {
                    name: 'styles',
                    test: /\.css$/,
                    chunks: 'all',
                    enforce: true
                }
            }
        },
        
        runtimeChunk: {
            name: 'runtime'
        }
    },
    
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'js'),
            '@css': path.resolve(__dirname, 'css'),
            '@img': path.resolve(__dirname, 'img')
        }
    },
    
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist')
        },
        compress: true,
        port: 8080,
        hot: true,
        open: true,
        historyApiFallback: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    performance: {
        hints: isProduction ? 'warning' : false,
        maxEntrypointSize: 250000,
        maxAssetSize: 250000
    },
    
    stats: {
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false
    }
};