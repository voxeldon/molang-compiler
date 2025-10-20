import chalk from "chalk";
import { getConfig, rootDir } from "./dir";
import { existsSync, writeFileSync } from "fs";
import configSchema = require('../../schemas/configSchema.json');
import { join } from "path";
import Ajv from "ajv";

const ajv = new Ajv();

class ConfigFactory {
    private configPath: string;

    constructor() {
        this.configPath = join(rootDir, "moco_config.json");
    }

    private parseConfigFromSchema(schema: any): any {
        const defaultConfig: any = {};

        for (const key in schema.properties) {
            const property = schema.properties[key];
            if (property.type === "object") {
                defaultConfig[key] = this.parseConfigFromSchema(property);
            } else if (property.default !== undefined) {
                defaultConfig[key] = property.default;
            } else if (property.type === "string") {
                defaultConfig[key] = "";
            } else if (property.type === "number") {
                defaultConfig[key] = 0;
            } else if (property.type === "boolean") {
                defaultConfig[key] = false;
            }
        }

        return defaultConfig;
    }

    public verifyConfig(): void {
        const config = getConfig();
        const validate = ajv.compile(configSchema);
        const valid = validate(config);
        if (valid) {
            console.log(chalk.green("Config file is valid."));
        } else {
            console.log(chalk.red("Config file is invalid:", validate.errors));
        }
    }

    public generateConfig(): void {
        if (!existsSync(this.configPath)) {
            const defaultConfig = this.parseConfigFromSchema(configSchema);
            defaultConfig.packs = {
                behaviorPack: "./packs/BP",
                resourcePack: "./packs/RP"
            };

            writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
            console.log(chalk.green("Config file created at", this.configPath));
            console.log(chalk.greenBright("MOCO initialized!"));
        } else {
            console.log(chalk.red("MOCO already initialized."));
        }
    }
}

export const mocoConfig = new ConfigFactory();