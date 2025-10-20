import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

export const rootDir = process.cwd();

export const getConfig = (): Config => {
    const configPath = join(rootDir, "moco_config.json");
    if (!existsSync(configPath)) {
        throw new Error(`Config file not found at ${configPath}`);
    }

    const config: Config = JSON.parse(readFileSync(configPath, "utf-8"));
    return config;
};

export const behaviorDir = (): string => {
    const config = getConfig();
    if (!config.packs || !config.packs.behaviorPack) {
        console.log("Behavior pack path not found in config file");
        return "";
    }

    return join(rootDir, config.packs.behaviorPack);
};

export const resourceDir = (): string => {
    const config = getConfig();
    if (!config.packs || !config.packs.resourcePack) {
        console.log("Resource pack path not found in config file");
        return "";
    }

    return join(rootDir, config.packs.resourcePack);
};

export const pathExists = (path: string): boolean => {
    return existsSync(path);
};

export const getVaildDirectoires = async (): Promise<string[]> => {
    const rootDirectories: string[] = [`${behaviorDir()}/molang`, `${resourceDir()}/molang`];
    const validDirectories: string[] = [];

    for (const p of rootDirectories) {
        if (p && pathExists(p)) {
            validDirectories.push(p);
        } else {
            console.log(`Directory does not exist: ${p}`);
        }
    }
    return validDirectories;
};

export const getSubFolders = (dir: string): string[] => {
    try {
        return readdirSync(dir)
            .map((name: string) => join(dir, name))
            .filter((entry: string) => statSync(entry).isDirectory());
    } catch (err) {
        console.error(`Error reading directory ${dir}`, err);
        return [];
    }
};