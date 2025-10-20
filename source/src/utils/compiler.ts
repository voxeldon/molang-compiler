import { ExportPath, MolangData, MolangParser } from "./parser";
import * as fs from "fs";
import chalk from "chalk";
import * as jsonc from 'jsonc-parser';

export class MolangCompiler {
    private parseJsonFile(filePath: string): any | null {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return jsonc.parse(fileContent);
        } catch (err) {
            console.error(`Error reading or parsing JSON file ${filePath}:`, err);
            return null;
        }
    }

    private writeJsonFile(filePath: string, jsonContent: any): void {
        try {
            fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2));
        } catch (err) {
            console.error(`Error writing JSON file ${filePath}:`, err);
        }
    }

    private findNestedComponent(jsonContent: any, targetComponent: string): boolean {
        const keys = targetComponent.split('/');
        let current = jsonContent;

        for (const key of keys) {
            if (current[key] !== undefined) {
                current = current[key];
            } else {
                return false;
            }
        }

        return true;
    }

    private updateNestedComponent(jsonContent: any, targetComponent: string, newValue: string): void {
        const keys = targetComponent.split('/');
        let current = jsonContent;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = newValue;
    }

    //Requires a case to handle array values with in a component

    private injectMolang(molangData: MolangData): void {
        molangData.paths.forEach((path: ExportPath) => {
            const targetFile: string = path.jsonPath;
            const targetComponent: string = path.targetComponent;
            const content: string = molangData.content;

            if (!fs.existsSync(targetFile)) {
                console.log(chalk.red(`Target JSON file not found: ${targetFile}`));
                return;
            }

            const jsonContent = this.parseJsonFile(targetFile);
            if (!jsonContent) return;

            if (!this.findNestedComponent(jsonContent, targetComponent)) {
                console.log(chalk.red(`Target component: ${targetComponent} not found in ${targetFile}`));
                return;
            }

            this.updateNestedComponent(jsonContent, targetComponent, content);
            this.writeJsonFile(targetFile, jsonContent);
        });
    }

    private processData(data: MolangData): void {
        this.injectMolang(data)
    }

    public async compile(): Promise<void> {
        const parser = new MolangParser();

        try {
            const data: MolangData[] = await parser.molangData; 
            for (const i of data) {
                this.processData(i);
            }
            console.log(chalk.green("Finished processing molang data"));
        } catch (err) {
            console.error(chalk.red("Error loading molang data:"), err);
        }
    }

}