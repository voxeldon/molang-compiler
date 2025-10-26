# 🧩 Molang Compiler — MOCO

The **Molang Compiler (MOCO)** allows you to create modular `.molang` files and compiles them into JSON that is valid for Bedrock.

---

## Change Log

* Function parameters: now supports **default values** (e.g., `beans = 3`)
* **Safe parameter substitution**: only replaces standalone identifiers (will not alter `t.biome.id` when the parameter is `biome`)
* **Nested function calls**: functions are capable of invoking other functions; the inliner operates until a stable state is reached
* Fixed: no mandatory trailing `;` at the conclusion of each compiled statement
* Minor parser enhancements for strings/commas within argument/default lists

---

## ⚡️ Installation & Command

```bash
npm i -g moco-mcbe
# or
npm i -D moco-mcbe
```

Initialize once:

```bash
moco init
```

Run:

```bash
moco run
```

---

## 📁 Setup

Establish a `molang` directory in your BP/RP and include `.molang` files. It is advisable to map `.molang` to C syntax highlighting.

---

## ✏️ Exports & Example

```c
#export feature_rules/test_rule(minecraft:feature_rules/distribution/iterations);
```

This command writes the compiled statements to the specified JSON path.

---

## 🧠 Functions (New)

MOCO accommodates simple functions that you can **declare once** and **inline** wherever they are invoked.

### Declaration

```c
function name(paramA, paramB, paramC = defaultExpr) {
    // body;
}
```

* Parameters: multiple, optional **defaults** using `=`.
* Defaults can reference **previous** parameters: `c = a + b`.
* The body consists of plain statements separated by `;`.

### Calls

```c
name(argA, argB);     // standard call
name(1);              // missing parameters utilize defaults
name();               // all parameters may derive from defaults
```

### Nested Calls

Functions have the ability to invoke other functions. The compiler continuously inlines until no changes occur (with an internal safety limit to prevent infinite recursion).

---

## ✅ Worked Examples

### 1) Basic + Defaults

```c
#export target/target(minecraft:json/target_component);

function super(multiplier = 5){
    v.my_var = v.my_var * multiplier;
}

function test(my_var, multiplier, divider = 3)