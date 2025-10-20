import { behaviorDir, getSubFolders, getVaildDirectoires, resourceDir } from "./dir";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { Functions } from "./functions";

export interface ExportPath { jsonPath: string; targetComponent: string }
export interface MolangData { paths: ExportPath[]; content: string }

export class MolangParser {
  public molangData: Promise<MolangData[]>;
  private directories: Promise<string[]> = Promise.resolve([]);

  constructor() {
    this.directories = this.processDirs();
    const molangData: Promise<MolangData[]> = this.directories
      .then(paths => this.parse(paths))
      .catch(err => { console.error(err); return [] as MolangData[]; });
    if (molangData) this.molangData = molangData;
    else throw Error("");
  }

  private async processDirs(): Promise<string[]> {
    const tDir: string[] = [];
    const dirs: string[] = await getVaildDirectoires();
    if (dirs.length === 0) throw new Error("No directories found");
    const subDirs: string[] = [];
    dirs.forEach((p: string) => {
      subDirs.push(...getSubFolders(p));
      tDir.push(p);
    });
    tDir.push(...subDirs);
    return tDir;
  }

  private getMolangFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    try {
      return fs.readdirSync(dir)
        .filter(f => path.extname(f) === ".molang")
        .map(f => path.relative(process.cwd(), path.join(dir, f)))
        .map(file => {
          console.log(chalk.yellow(`Found Molang: ${chalk.green(file)}`));
          return file;
        });
    } catch (err) {
      console.error(chalk.red(`Error reading directory "${dir}":`), err);
      return [];
    }
  }

  private parseMolangFile(filePath: string): MolangData | undefined {
    const baseDir = this.resolveBaseDir(filePath);
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error(`Failed to read Molang file: ${filePath}`, err);
      return undefined;
    }

    const noComments = this.stripComments(raw);
    const { functions, rest: withoutFunctions } = Functions.extractFunctions(noComments);

    const singleLine = withoutFunctions.replace(/\s+/g, " ").trim();
    if (!singleLine) return undefined;

    const stmts = singleLine.split(";").map(s => s.trim()).filter(Boolean);

    const paths: ExportPath[] = [];
    const contentStmts: string[] = [];
    const exportRe = /^#export\s+([^(]+)\(\s*([^)]+)\s*\)$/;

    for (const s of stmts) {
      if (s.startsWith("#")) {
        const m = s.match(exportRe);
        if (!m) {
          console.error(`Invalid directive in ${filePath}: "${s}"`);
          return undefined;
        }
        const exportPath = m[1].replace(/\\/g, "/").trim();
        const targetComponent = m[2].replace(/\\/g, "/").trim();
        const jsonPath = path.join(baseDir, `${exportPath}.json`);
        paths.push({ jsonPath, targetComponent });
      } else {
        contentStmts.push(s + ";");
      }
    }

    let content = contentStmts.join(" ").trim();
    if (functions.length) {
      content = Functions.inlineFunctionCalls(content, functions).trim();
    }

    return paths.length > 0 ? { paths, content } : undefined;
  }

  // ---------- Helpers ----------

  private resolveBaseDir(filePath: string): string {
    const isBP = /(^|[\\/])BP([\\/]|$)/.test(filePath);
    const isRP = /(^|[\\/])RP([\\/]|$)/.test(filePath);
    if (isBP) return behaviorDir();
    if (isRP) return resourceDir();
    else throw Error("Error resolving base directory.")
  }

  private stripComments(src: string): string {
    const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
    const noLine = noBlock.replace(/\/\/.*$/gm, "");
    return noLine.replace(/[ \t]+$/gm, "");
  }

  private async parse(paths: string[]): Promise<MolangData[]> {
    const filePaths: string[] = [];
    paths.forEach((p: string) => filePaths.push(...this.getMolangFiles(p)));

    const molangData: MolangData[] = [];
    filePaths.forEach((p: string) => {
      const data = this.parseMolangFile(p);
      if (data) molangData.push(data);
    });
    return molangData;
  }
}
