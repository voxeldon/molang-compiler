# 🧩 Molang Compiler — MOCO

The **Molang Compiler (MOCO)** is a simple tool for organizing and compiling `.molang` files into valid Minecraft JSON structures.
It allows you to write more readable and modular logic for Bedrock Edition.

---

## ⚡️ Installation & Command

**Install globally** (recommended for project-wide access):

```bash
npm i -g moco-mcbe
```

**Or install locally** within a project:

```bash
npm i moco-mcbe --save-dev
```

Once installed, run the compiler with:

---

### 🧰 Initialize Your Project

Before running the compiler, you must initialize your project to create a configuration file:

```bash
moco init
```

This command generates a `moco.config.json` file in your project root.
You can edit this file to customize:

* Paths to your **BP** and **RP** directories
* File inclusion or exclusion rules
* Output behavior and logging options

Example generated config:

```json
{
  "packs": {
    "behaviorPack": "./packs/BP",
    "resourcePack": "./packs/RP"
  }
}
```

---

### ▶️ Run the Compiler

Once initialized, you can compile all `.molang` files across your BP and RP directories using:

```bash
moco run
```

This will:

* Locate all `molang` folders within configured paths
* Parse and expand all `.molang` files
* Write the compiled content into their respective JSON files

---

## 📁 Setup

1. In your project’s **Behavior Pack (BP)** or **Resource Pack (RP)** directory,
   create a new folder named:

   ```
   molang
   ```

2. Inside that folder, create a file with the `.molang` extension, for example:

   ```
   my_script.molang
   ```

3. (Optional but recommended)
   Associate the `.molang` file type with **C language syntax highlighting** in your code editor.
   This will give you basic colorization for functions and math expressions.

---

## ✏️ Example File Structure

Here’s an example `.molang` file with exports, variables, and functions:

```c
#export feature_rules/test_rule(minecraft:feature_rules/distribution/iterations);
// ↑ Specifies where the compiled result will be written.
//    Format: [output_path_in_BP_or_RP] (target_json_component_path)

function myTestFunction(myVar, multiplier) {
    // Basic function support:
    // - Declare functions before using them.
    // - Accepts multiple parameters.
    // - No return values (functions are always void).
    // - No lambdas or nested functions.

    myVar * multiplier;
    math.abs(myVar);
    math.floor(myVar);
}

v.test = -1.5; // Comment
myTestFunction(v.test, 2.5);
```

---

## ⚙️ Compilation Process

When compiled, the script produces a JSON file at the specified export path.
Each exported rule or function becomes an entry inside the target JSON object.

**Example Output:**

```json
{
  "minecraft:feature_rules": {
    "distribution": {
      "iterations": "v.test = -1.5; v.test * 2.5; math.abs(v.test); math.floor(v.test);"
    }
  }
}
```