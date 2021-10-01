module.exports = {
    server: {
        command: 'node test/server.js',
        port: 30001,
        launchTimeout: 10000,
    },
    browsers: ["chromium"],
    exitOnPageError: false, // GitHub currently throws errors
    launchOptions: {
        headless: false
    }
}