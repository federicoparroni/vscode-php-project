"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class ConfigManager {
    constructor(...configName) {
        if (configName.length > 0)
            this.setConfigurations(...configName);
        else {
            this.configs = [];
            this.configList = [];
        }
    }
    setConfigurations(...configName) {
        this.configs = [];
        this.configList = [];
        for (let i = 0; i < configName.length; i++)
            this.configList[i] = configName[i];
        return this.update();
    }
    update() {
        for (let i = 0; i < this.configList.length; i++)
            this.configs[this.configList[i]] = vscode.workspace.getConfiguration(this.configList[i]);
        return this;
    }
    get(configName) {
        return this.configs[configName];
    }
}
exports.default = ConfigManager;
//# sourceMappingURL=configManager.js.map