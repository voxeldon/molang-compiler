import esbuild from "esbuild";
/** @type { esbuild.BuildOptions } */
const options = {
    format: "cjs",
    bundle: true,
    target: [ "es2021" ],
    platform: "node",
    entryPoints: [ "source/src/index.ts" ],
    outfile: "_app/index.js",
    sourcemap: false,
    logLevel: "info",
    external: [
        "ajv",
        "all",
        "chalk",
        "commander",
        "jsonc-parser"
    ]
};

esbuild.build(options);