'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const configManager_1 = require("./configManager");
const serverManager_1 = require("./serverManager");
let serverManager = new serverManager_1.default(new configManager_1.default('php-project', 'php'));
function activate(context) {
    serverManager.allocateOutput('PHP server');
    context.subscriptions.push(vscode.commands.registerCommand('extension.startDefaultServer', () => {
        serverManager.launch(false);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.startRelativeServer', () => {
        serverManager.launch(true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.stopServer', () => {
        serverManager.terminate();
    }));
}
exports.activate = activate;
function deactivate() {
    serverManager.terminate();
    serverManager.freeOutput();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map