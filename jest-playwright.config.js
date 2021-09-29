module.exports = {
    
    config: {
        globalSetup: require.resolve('./test/globalSetup.js'),
    },
    server: {
        command: 'node test/server.js',
        port: 30001,
        launchTimeout: 10000,
    },
}