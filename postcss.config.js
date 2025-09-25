module.exports = {
    plugins: [
        require('autoprefixer')({
            overrideBrowserslist: [
                '> 1%',
                'last 2 versions',
                'not ie <= 8'
            ]
        }),
        
        require('cssnano')({
            preset: ['default', {
                discardComments: {
                    removeAll: true
                },
                normalizeWhitespace: true,
                colormin: true,
                convertValues: true,
                discardDuplicates: true,
                discardEmpty: true,
                mergeRules: true,
                minifyFontValues: true,
                minifyGradients: true,
                minifyParams: true,
                minifySelectors: true,
                normalizeCharset: true,
                normalizeDisplayValues: true,
                normalizePositions: true,
                normalizeRepeatStyle: true,
                normalizeString: true,
                normalizeTimingFunctions: true,
                normalizeUnicode: true,
                normalizeUrl: true,
                orderedValues: true,
                reduceIdents: true,
                reduceInitial: true,
                reduceTransforms: true,
                svgo: true,
                uniqueSelectors: true
            }]
        }),
        
        // Plugin para purificar CSS não utilizado (apenas em produção)
        ...(process.env.NODE_ENV === 'production' ? [
            require('@fullhuman/postcss-purgecss')({
                content: [
                    './index.html',
                    './js/**/*.js'
                ],
                defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
                safelist: [
                    /^modal/,
                    /^notification/,
                    /^spinner/,
                    /^cart/,
                    /^product/,
                    /^auth/,
                    /^search/,
                    /^filter/,
                    /^pagination/,
                    /^dropdown/,
                    /^tooltip/,
                    /^loading/,
                    /^error/,
                    /^success/,
                    /^warning/,
                    /^info/,
                    /^fade/,
                    /^slide/,
                    /^zoom/,
                    /^bounce/,
                    /^pulse/,
                    /^shake/,
                    /^active/,
                    /^disabled/,
                    /^hidden/,
                    /^visible/,
                    /^show/,
                    /^hide/
                ]
            })
        ] : [])
    ]
};