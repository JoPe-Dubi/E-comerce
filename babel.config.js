module.exports = {
    presets: [
        ['@babel/preset-env', {
            targets: {
                browsers: ['> 1%', 'last 2 versions', 'not ie <= 8']
            },
            useBuiltIns: 'usage',
            corejs: 3,
            modules: false // Permite tree shaking
        }]
    ],
    
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator'
    ],
    
    env: {
        test: {
            presets: [
                ['@babel/preset-env', {
                    targets: {
                        node: 'current'
                    }
                }]
            ]
        },
        
        production: {
            plugins: [
                ['transform-remove-console', {
                    exclude: ['error', 'warn']
                }]
            ]
        }
    }
};