#!/usr/bin/env node
import { Command } from "commander";
import { mocoConfig } from "./utils/config_factory";
import { MolangCompiler } from "./utils/compiler";
const program = new Command();

program
  .name("moco")
  .description("A tool for molang")
  .version("1.0.0");

program
  .command("init")
  .description("Generate config file")
  .action(() => {
    mocoConfig.generateConfig();
  });

program
  .command("run")
  .description("Compile molang")
  .action(() => {
    new MolangCompiler().compile();
  });

program.parse(process.argv);
