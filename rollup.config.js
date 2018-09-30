import typescript from 'rollup-plugin-typescript';


export default {
    input: './src/main.ts',
    output: {
        file: './dist/app.js',
        sourcemap: true,
        format: 'iife'
    },
    plugins: [
        typescript({
            typescript: require('typescript')
        })
    ]
};
