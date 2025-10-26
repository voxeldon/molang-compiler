interface MolangFunction {
    name: string;
    params: { name: string; defaultExpr?: string }[];
    body: string;
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
                j++; // after '('

                // --- find matching ')' with balance + strings ---
                let depth = 0, inStr: '"' | "'" | null = null, esc = false;
                const paramsStart = j;
                let pos = j;
                for (; pos < src.length; pos++) {
                    const ch = src[pos];

                    if (inStr) {
                        if (esc) { esc = false; continue; }
                        if (ch === "\\") { esc = true; continue; }
                        if (ch === inStr) inStr = null;
                        continue;
                    }

                    if (ch === "'" || ch === '"') { inStr = ch as any; continue; }
                    if (ch === "(") { depth++; continue; }
                    if (ch === ")") {
                        if (depth === 0) break;
                        depth--;
                        continue;
                    }
                }
                if (pos >= src.length) { out += src[i++]; continue; }

                const paramsText = src.slice(paramsStart, pos);
                const params = this.parseParamsBalanced(paramsText);
                j = pos + 1; // after ')'

                while (j < src.length && /\s/.test(src[j])) j++;
                if (src[j] !== "{") { out += src[i++]; continue; }

                // --- capture function body with brace balancing ---
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


    /** Split on top-level commas, respecting parens and strings. (You already have this for args.) */
    private static splitArgsBalanced(argText: string): string[] {
        const args: string[] = [];
        let depth = 0, cur = "", inStr: '"' | "'" | null = null, esc = false;

        for (let i = 0; i < argText.length; i++) {
            const ch = argText[i];

            if (inStr) {
                cur += ch;
                if (esc) { esc = false; continue; }
                if (ch === "\\") { esc = true; continue; }
                if (ch === inStr) inStr = null;
                continue;
            }

            if (ch === "'" || ch === '"') { inStr = ch as any; cur += ch; continue; }
            if (ch === "(") { depth++; cur += ch; continue; }
            if (ch === ")") { depth = Math.max(0, depth - 1); cur += ch; continue; }

            if (ch === "," && depth === 0) { args.push(cur.trim()); cur = ""; continue; }

            cur += ch;
        }
        if (cur.trim()) args.push(cur.trim());
        return args;
    }

    /** Split a single parameter token on a top-level '=' (so defaults can have parens). */
    private static splitParamOnEquals(tok: string): [string, string | undefined] {
        let depth = 0, inStr: '"' | "'" | null = null, esc = false;
        for (let i = 0; i < tok.length; i++) {
            const ch = tok[i];

            if (inStr) {
                if (esc) { esc = false; continue; }
                if (ch === "\\") { esc = true; continue; }
                if (ch === inStr) inStr = null;
                continue;
            }

            if (ch === "'" || ch === '"') { inStr = ch as any; continue; }
            if (ch === "(") { depth++; continue; }
            if (ch === ")") { depth = Math.max(0, depth - 1); continue; }

            if (ch === "=" && depth === 0) {
                const left = tok.slice(0, i).trim();
                const right = tok.slice(i + 1).trim();
                return [left, right];
            }
        }
        return [tok.trim(), undefined];
    }

    /** Parse the full parameter list text into {name, defaultExpr?}[] */
    private static parseParamsBalanced(paramListText: string): { name: string; defaultExpr?: string }[] {
        const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
        const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);

        const items = this.splitArgsBalanced(paramListText);
        const params: { name: string; defaultExpr?: string }[] = [];

        for (const raw of items) {
            if (!raw) continue;
            const [left, def] = this.splitParamOnEquals(raw);

            // left must be a single identifier
            if (!left || !isIdentStart(left[0]) || ![...left].every((c, idx) => idx === 0 ? isIdentStart(c) : isIdent(c))) {
                // skip invalid parameter token
                continue;
            }

            params.push(def ? { name: left, defaultExpr: def } : { name: left });
        }

        return params;
    }


    private static replaceIdent(body: string, ident: string, expr: string): string {
        const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
        const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);

        let i = 0;
        let out = "";
        const n = body.length;

        while (i < n) {
            const ch = body[i];

            // --- strings ---
            if (ch === '"' || ch === "'") {
                const quote = ch;
                out += ch; i++;
                while (i < n) {
                    const c = body[i];
                    out += c; i++;
                    if (c === "\\" && i < n) { out += body[i]; i++; continue; }
                    if (c === quote) break;
                }
                continue;
            }

            // --- line comment //... ---
            if (ch === "/" && i + 1 < n && body[i + 1] === "/") {
                out += "//"; i += 2;
                while (i < n && body[i] !== "\n") { out += body[i++]; }
                continue;
            }

            // --- block comment /* ... */ ---
            if (ch === "/" && i + 1 < n && body[i + 1] === "*") {
                out += "/*"; i += 2;
                while (i + 1 < n && !(body[i] === "*" && body[i + 1] === "/")) {
                    out += body[i++];
                }
                if (i + 1 < n) { out += "*/"; i += 2; }
                continue;
            }

            // --- identifier token ---
            if (isIdentStart(ch)) {
                const start = i;
                i++;
                while (i < n && isIdent(body[i])) i++;
                const token = body.slice(start, i);

                if (token === ident) {
                    // find previous non-space char
                    let p = start - 1;
                    while (p >= 0 && /\s/.test(body[p])) p--;

                    // If the immediate non-space previous char is a dot, this
                    // token is a property segment (e.g. t.<ident>.id) → do NOT replace.
                    if (p >= 0 && body[p] === ".") {
                        out += token;
                    } else {
                        out += expr;
                    }
                } else {
                    out += token;
                }
                continue;
            }

            // default: copy one char
            out += ch; i++;
        }

        return out;
    }


    /**
     * Inlines calls for known functions.
     * Runs to a fixed point so that nested calls are expanded too.
     * Guarded by MAX_PASSES to avoid infinite growth on recursive/mutual calls.
     */
    public static inlineFunctionCalls(content: string, functions: MolangFunction[]): string {
        const MAX_PASSES = 32;
        let cur = content;

        for (let pass = 0; pass < MAX_PASSES; pass++) {
            let prev = cur;
            for (const fn of functions) {
                cur = Functions.expandFunctionCallsFor(cur, fn);
            }
            if (cur === prev) break; // reached fixed point
        }

        // Normalize spacing & semicolons (no trailing double-semicolons)
        return cur
            .replace(/[ \t]+/g, " ")
            .replace(/\s*;\s*/g, "; ")
            .replace(/;\s*$/, ";")
            .trim();
    }


    private static expandFunctionCallsFor(text: string, fn: MolangFunction): string {
        const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);
        let i = 0, out = "";

        while (i < text.length) {
            const idx = text.indexOf(fn.name, i);
            if (idx === -1) { out += text.slice(i); break; }

            const prev = idx > 0 ? text[idx - 1] : "";
            let j = idx + fn.name.length;
            let k = j; while (k < text.length && /\s/.test(text[k])) k++;
            if ((prev && isIdent(prev)) || text[k] !== "(") {
                out += text.slice(i, idx + 1);
                i = idx + 1;
                continue;
            }

            // find matching ')'
            let depth = 0, startArgs = k + 1, pos = startArgs;
            while (pos < text.length) {
                const ch = text[pos];
                if (ch === "(") depth++;
                else if (ch === ")") {
                    if (depth === 0) break;
                    depth--;
                }
                pos++;
            }
            if (pos >= text.length) { out += text.slice(i, idx + 1); i = idx + 1; continue; }

            const endParen = pos;
            const argText = text.slice(startArgs, endParen);
            const callArgs = this.splitArgsBalanced(argText);

            // Optional trailing ';'
            let after = endParen + 1;
            while (after < text.length && /\s/.test(text[after])) after++;
            const hasSemi = text[after] === ";";
            const afterCall = hasSemi ? after + 1 : endParen + 1;

            // Build param -> value map (use arg or default)
            const resolved: Record<string, string> = {};

            for (let p = 0; p < fn.params.length; p++) {
                const { name: pName, defaultExpr } = fn.params[p];
                let value = (p < callArgs.length) ? callArgs[p] : (defaultExpr ?? "");

                // allow defaults to reference earlier params
                if (defaultExpr && p > 0) {
                    for (let q = 0; q < p; q++) {
                        const earlier = fn.params[q].name;
                        const earlierVal = resolved[earlier] ?? "";
                        value = this.replaceIdent(value, earlier, earlierVal);
                    }
                }
                resolved[pName] = value;
            }

            // Substitute into body
            let expanded = fn.body;
            for (const { name } of fn.params) {
                expanded = this.replaceIdent(expanded, name, resolved[name]);
            }
            expanded = expanded.trim();

            out += text.slice(i, idx) + expanded;
            i = afterCall;
        }

        return out;
    }

}