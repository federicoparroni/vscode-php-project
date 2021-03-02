"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const child_process = require("child_process");
const path = require("path");
class ServerManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.isRunning = false;
        this.isRestarting = false;
        this.prelauchError = false;
        this.outputChannel = undefined;
        this.serverProcess = undefined;
        this.lastOutputChar = '\n';
    }
    launch(relativePath) {
        this.configManager.update();
        if (this.isRunning) {
            if (this.configManager.get('php-project').get('automaticRestart')) {
                this.isRestarting = true;
                this.relativePathAfterRestart = relativePath;
                this.terminate();
                return;
            }
            else {
                vscode.window.showInformationMessage('PHP server is already running! Change extension settings to restart automatically.');
                return;
            }
        }
        let executablePath = this.getExecutablePath();
        let rootDirectory = this.getRootDirectory(relativePath);
        if (executablePath && rootDirectory) {
            let args = this.configManager.get('php-project').get('args');
            let finalArgs = [];
            let template = '';
            for (let i = 0; i < args.length; i++) {
                if (typeof args[i] === 'string')
                    finalArgs.push(this.resolveArgument(args[i], rootDirectory));
            }
            template = this.replaceVariables(this.replaceDebugString(this.configManager.get('php-project').get('launchOutputTemplate')));
            template = template.replace(/\${cwd}/g, rootDirectory).replace(/\${args}/g, JSON.stringify(finalArgs, null, 4));
            if (this.outputChannel) {
                this.outputChannel.clear();
                this.outputChannel.show();
            }
            this.serverProcess = child_process.spawn(executablePath, finalArgs, { cwd: rootDirectory });
            this.serverProcess.stdout.on('data', (data) => {
                if (this.outputChannel) {
                    let dataString = data.toString();
                    this.outputChannel.append(dataString);
                    this.lastOutputChar = dataString.slice(-1);
                }
            });
            this.serverProcess.stderr.on('data', (data) => {
                if (this.outputChannel) {
                    let dataString = data.toString();
                    this.outputChannel.append(dataString);
                    this.lastOutputChar = dataString.slice(-1);
                }
            });
            this.serverProcess.on('exit', () => {
                if (this.isRunning) {
                    this.isRunning = false;
                    if (this.isRestarting) {
                        this.launch(this.relativePathAfterRestart);
                        this.isRestarting = false;
                    }
                    else {
                        if (this.outputChannel) {
                            if (this.lastOutputChar.search(/\r|\n/) === -1)
                                this.outputChannel.appendLine('');
                            this.outputChannel.appendLine('PHP server stoped.');
                        }
                    }
                }
            });
            this.serverProcess.on('error', (data) => {
                if (this.outputChannel) {
                    if (this.prelauchError) {
                        this.outputChannel.appendLine('Server failed to start. Providing debug info:');
                        this.outputChannel.appendLine('           Error message: ' + data.message);
                        this.outputChannel.appendLine('Resolved executable path: ' + executablePath);
                        this.outputChannel.appendLine(' Resolved directory path: ' + rootDirectory);
                    }
                    else {
                        this.outputChannel.appendLine('Error message: ' + data.message);
                    }
                }
                this.isRunning = false;
            });
            this.isRunning = true;
            this.prelauchError = true;
            setTimeout(() => {
                if (this.isRunning && this.outputChannel) {
                    if (template.length) {
                        this.outputChannel.appendLine(template);
                    }
                }
                this.prelauchError = false;
            }, 500);
        }
    }
    terminate() {
        if (this.isRunning && this.serverProcess) {
            this.serverProcess.kill();
        }
    }
    allocateOutput(name) {
        this.outputChannel = vscode.window.createOutputChannel(name);
    }
    freeOutput() {
        if (this.outputChannel) {
            this.outputChannel.dispose();
            this.outputChannel = undefined;
        }
    }
    replaceDebugString(input) {
        if (/\${debug}/gm.test(input)) {
            let variables = ['workspaceRoot', 'workspaceRootFolderName', 'file', 'relativeFile', 'fileBasename', 'fileBasenameNoExtension', 'fileDirname', 'fileExtname', 'cwd', 'args'];
            let variableString = '';
            for (let i = 0; i < variables.length; i++) {
                variableString += `${variables[i]}: \${${variables[i]}}`;
                if (i !== variables.length - 1)
                    variableString += '\r\n';
            }
            input = input.replace(/\${debug}/gm, variableString);
        }
        return input;
    }
    resolveArgument(arg, rootDir) {
        const regExpr = /^\${([PR]+?)}\$\s?/;
        let match = arg.match(regExpr);
        if (match !== null) {
            let replace = match[1].indexOf('R') !== -1;
            let resolve = match[1].indexOf('P') !== -1;
            arg = arg.replace(regExpr, '');
            if (replace)
                arg = arg.replace(/\${cwd}/gm, rootDir);
            if (resolve)
                arg = this.resolvePath(arg, rootDir, replace);
            else
                arg = this.replaceVariables(arg);
        }
        return arg;
    }
    getExecutablePath() {
        let executablePath = undefined;
        if (this.configManager.get('php-project').get('useNativeExecutablePath')) {
            executablePath = this.configManager.get('php').get('executablePath') || this.configManager.get('php').get('validate.executablePath');
            if (executablePath == undefined)
                vscode.window.showErrorMessage('"php.executablePath" or "php.validate.executablePath" is not set. Change PHP Project settings to use custom path.');
            else {
                executablePath = this.resolvePath(executablePath);
                if (executablePath == undefined)
                    vscode.window.showErrorMessage('Unable to resolve ""php.executablePath" or "php.validate.executablePath" path.');
            }
        }
        else {
            executablePath = this.configManager.get('php-project').get('executablePath');
            if (executablePath == undefined) {
                vscode.window.showWarningMessage('"php-project.executablePath" is not set. Defaulting to system path.');
                executablePath = this.resolvePath('php');
            }
            else {
                executablePath = this.resolvePath(executablePath);
                if (executablePath == undefined)
                    vscode.window.showErrorMessage('Unable to resolve "php-project.executablePath" path.');
            }
        }
        return executablePath;
    }
    getRootDirectory(relativePath) {
        let rootDirectory = undefined;
        let rootPath = this.getWorkspaceRootPath();
        if (relativePath || rootPath == undefined) {
            rootDirectory = path.dirname(vscode.window.activeTextEditor.document.fileName);
            if (rootDirectory !== '.') {
                if (!relativePath && rootPath == undefined)
                    vscode.window.showInformationMessage('Open workspace was not detected. Using opened editor\'s path as root directory.');
            }
            else {
                vscode.window.showInformationMessage('Cannot start PHP server for an unsaved file.');
                rootDirectory = undefined;
            }
        }
        else {
            rootDirectory = this.configManager.get('php-project').get('defaultDirectory');
            rootDirectory = this.resolvePath(rootDirectory);
            if (rootDirectory == undefined)
                vscode.window.showErrorMessage('Unable to resolve "defaultDirectory" path.');
            else if (rootDirectory[rootDirectory.length - 1] !== path.sep) {
                rootDirectory = rootDirectory.concat(path.sep);
            }
        }
        return rootDirectory;
    }
    getWorkspaceRootPath() {
        const editor = vscode.window.activeTextEditor;
        let rootPath = undefined;
        if (editor.document.uri.scheme === 'file') {
            const folder = vscode.workspace['getWorkspaceFolder'](editor.document.uri);
            if (folder)
                rootPath = folder.uri.fsPath;
        }
        else {
            rootPath = (vscode.workspace['workspaceFolders'] ? vscode.workspace['workspaceFolders'][0].uri.fsPath : undefined);
        }
        return rootPath;
    }
    replaceVariables(input) {
        let rootPath = this.getWorkspaceRootPath() || '';
        let currentFile = vscode.window.activeTextEditor.document.fileName;
        input = input.replace(/\${workspaceRoot}/gm, rootPath);
        input = input.replace(/\${workspaceRootFolderName}/gm, path.basename(rootPath));
        input = input.replace(/\${file}/gm, currentFile);
        input = input.replace(/\${relativeFile}/gm, vscode.workspace.asRelativePath(currentFile));
        input = input.replace(/\${fileBasename}/gm, path.basename(currentFile));
        input = input.replace(/\${fileBasenameNoExtension}/gm, path.basename(currentFile, path.extname(currentFile)));
        input = input.replace(/\${fileDirname}/gm, path.dirname(currentFile));
        input = input.replace(/\${fileExtname}/gm, path.extname(currentFile));
        return input;
    }
    resolvePath(pathToResolve, rootDir, replaceVariables = true) {
        if (pathToResolve) {
            if (replaceVariables)
                pathToResolve = this.replaceVariables(pathToResolve);
            if (rootDir == undefined)
                rootDir = this.getWorkspaceRootPath() || '';
            if (!path.isAbsolute(pathToResolve))
                path.resolve(rootDir, pathToResolve);
            pathToResolve = path.normalize(pathToResolve);
        }
        return pathToResolve;
    }
}
exports.default = ServerManager;
//# sourceMappingURL=serverManager.js.map
