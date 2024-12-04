const vscode = require('vscode');

function activate(context) {
    console.log('VS Code agent extension is now active');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
