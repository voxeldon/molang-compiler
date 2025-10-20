interface MolangFunction {
    name: string;
    params: string[]; // multi-arg now
    body: string;     // raw statements, may include semicolons
};

export class Functions {
    public static extractFunctions(src: string): { functions: MolangFunction[]; rest: string } {
        const fns: MolangFunction[] = [];
        let i = 0;
        let out = "";

        const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
        const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);

        while (i < src.length) {
            if (src.startsWith("function", i) &&
                (i === 0 || !isIdent(src[i - 1])) &&
                (i + 8 >= src.length || !isIdent(src[i + 8]))) {

                let j = i + "function".length;
                while (j < src.length && /\s/.test(src[j])) j++;

                if (j >= src.length || !isIdentStart(src[j])) { out += src[i++]; continue; }
                const nameStart = j; j++;
                while (j < src.length && isIdent(src[j])) j++;
                const name = src.slice(nameStart, j);

                while (j < src.length && /\s/.test(src[j])) j++;
                if (src[j] !== "(") { out += src[i++]; continue; }
                j++;

                // --- parse comma-separated identifiers until ')' ---
                const params: string[] = [];
                while (j < src.length) {
                    while (j < src.length && /\s/.test(src[j])) j++;
                    if (src[j] === ")") { j++; break; }
                    if (!isIdentStart(src[j])) { out += src[i++]; params.length = 0; break; }

                    const pStart = j; j++;
                    while (j < src.length && isIdent(src[j])) j++;
                    params.push(src.slice(pStart, j).trim());

                    while (j < src.length && /\s/.test(src[j])) j++;
                    if (src[j] === ",") { j++; continue; }
                    else if (src[j] === ")") { j++; break; }
                    else { out += src[i++]; params.length = 0; break; }
                }
                if (!params.length && src[j - 1] !== ")") continue; // fallback if parse failed

                while (j < src.length && /\s/.test(src[j])) j++;
                if (src[j] !== "{") { out += src[i++]; continue; }

                let braceDepth = 0;
                const bodyStart = j + 1;
                let k = j;
                while (k < src.length) {
                    if (src[k] === "{") braceDepth++;
                    else if (src[k] === "}") {
                        braceDepth--;
                        if (braceDepth === 0) break;
                    }
                    k++;
                }
                if (k >= src.length) { out += src[i++]; continue; }

                const bodyRaw = src.slice(bodyStart, k).trim();
                fns.push({ name, params, body: bodyRaw });

                i = k + 1;
                continue;
            }

            out += src[i++];
        }

        return { functions: fns, rest: out };
    }

    // --- small utils for balanced parsing ---

    /** Split a single string of args on top-level commas, respecting balanced parentheses. */
    private static splitArgsBalanced(argText: string): string[] {
        const args: string[] = [];
        let depth = 0, cur = "";
        for (let i = 0; i < argText.length; i++) {
            const ch = argText[i];
            if (ch === "(") { depth++; cur += ch; }
            else if (ch === ")") { depth = Math.max(0, depth - 1); cur += ch; }
            else if (ch === "," && depth === 0) { args.push(cur.trim()); cur = ""; }
            else { cur += ch; }
        }
        if (cur.trim()) args.push(cur.trim());
        return args;
    }

    /** Word-boundary safe replacement of an identifier with an expression. */
    private static replaceIdent(body: string, ident: string, expr: string): string {
        const re = new RegExp(`\\b${ident}\\b`, "g");
        return body.replace(re, expr);
    }

    /**
     * Inlines calls for known multi-arg functions.
     * Handles nested parentheses in call arguments.
     */
    public static inlineFunctionCalls(content: string, functions: MolangFunction[]): string {
        let result = content;

        for (const fn of functions) {
            result = Functions.expandFunctionCallsFor(result, fn);
        }

        // Normalize spacing & semicolons (no trailing double-semicolons)
        return result
            .replace(/[ \t]+/g, " ")
            .replace(/\s*;\s*/g, "; ")
            .replace(/;\s*$/, ";")
            .trim();
    }

    private static expandFunctionCallsFor(text: string, fn: MolangFunction): string {
        const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);
        let i = 0, out = "";

        while (i < text.length) {
            // find next potential call start
            const idx = text.indexOf(fn.name, i);
            if (idx === -1) { out += text.slice(i); break; }

            // Check word boundaries: prev char not ident, next non-space is '('
            const prev = idx > 0 ? text[idx - 1] : "";
            let j = idx + fn.name.length;
            let k = j; while (k < text.length && /\s/.test(text[k])) k++;
            if ((prev && isIdent(prev)) || text[k] !== "(") {
                out += text.slice(i, idx + 1);
                i = idx + 1;
                continue;
            }

            // We have name '(' ... find matching ')'
            let depth = 0;
            let startArgs = k + 1;
            let pos = startArgs;
            while (pos < text.length) {
                const ch = text[pos];
                if (ch === "(") depth++;
                else if (ch === ")") {
                    if (depth === 0) break;
                    depth--;
                }
                pos++;
            }
            if (pos >= text.length) {
                // unmatched paren; bail as plain text
                out += text.slice(i, idx + 1);
                i = idx + 1;
                continue;
            }

            const endParen = pos; // index of ')'
            const argText = text.slice(startArgs, endParen);
            const args = this.splitArgsBalanced(argText);

            // Optional trailing semicolon
            let after = endParen + 1;
            while (after < text.length && /\s/.test(text[after])) after++;
            const hasSemi = text[after] === ";";
            const afterCall = hasSemi ? after + 1 : endParen + 1;

            // Build expansion by substituting each param
            let expanded = fn.body;
            for (let p = 0; p < fn.params.length; p++) {
                const pName = fn.params[p];
                const aVal = (p < args.length) ? args[p] : ""; // missing arg → empty
                expanded = this.replaceIdent(expanded, pName, aVal);
            }
            expanded = expanded.trim();

            // ensure a single trailing semicolon for inline statement blocks
            if (!/[;]\s*$/.test(expanded)) expanded += ";";

            // commit: everything before call + expanded + continue after call
            out += text.slice(i, idx) + expanded;
            i = afterCall;
        }

        return out;
    }
}