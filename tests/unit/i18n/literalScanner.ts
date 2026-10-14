/**
 * Finds hard-coded user-facing text in the company app (everything except the platform admin console).
 * Flags letters in JSX text, in string / template literals rendered as JSX children, in text props
 * (label, title, placeholder, aria-label, …), in object properties that end up on screen (column `header`,
 * option `label`, …), in toast.*() calls and in zod messages. Numbers, symbols, translation keys
 * ("labor.form.amount") and a few words that stay as they are in every language are fine.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

export const ROOT = join(__dirname, "..", "..", "..");

/** JSX props and object properties whose value is shown or read out to the user. */
export const TEXT_PROPS = new Set([
  "label",
  "title",
  "description",
  "subtitle",
  "placeholder",
  "aria-label",
  "ariaLabel",
  "alt",
  "submitLabel",
  "confirmLabel",
  "cancelLabel",
  "createLabel",
  "addLabel",
  "approveLabel",
  "uploadLabel",
  "totalLabel",
  "noneLabel",
  "dateLabel",
  "roleLabel",
  "searchPlaceholder",
  "hint",
  "help",
  "crumb",
  "consequence",
  "emptyText",
  "emptyTitle",
  "emptyDesc",
  "emptyDescription",
  "empty",
  "header",
  "message",
  "tooltip",
  "heading",
  "body",
]);

/** Zod / validation calls whose string arguments are error messages shown under a field. */
/** Form-rule helpers whose first argument is the field name shown inside a message (must be a key). */
const LABEL_CALLS = new Set(["requiredText", "paisaSchema", "requiredNumber", "isoDateSchema", "requiredAmount", "pick"]);

/** Values of text props that are not text (next/image placeholder …). */
const NOT_TEXT = new Set(["blur", "empty"]);

const MESSAGE_CALLS = new Set(["min", "max", "regex", "refine", "length", "email", "nonempty", "gt", "gte", "lt", "lte", "positive", "nonnegative", "int", "url"]);

/** Words allowed as they are in every language (currency, units, abbreviations, brands). */
export const ALLOWED_WORDS = new Set(["Rs", "PKR", "kg", "OTP", "PDF", "SMS", "CSV", "Excel", "xlsx", "csv", "WhatsApp", "JazzCash", "Easypaisa", "OT", "BoQ", "sqft", "PM", "ID", "e", "g", "x", "h", "m", "a", "p"]);

const LETTERS = /[A-Za-z؀-ۿ]/;
/** "labor.form.amount", "common.save" — a dictionary key, not text. */
const KEY_LIKE = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/;

export const hasWords = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || KEY_LIKE.test(trimmed)) return false;
  return trimmed.split(/[^A-Za-z؀-ۿ]+/).some((w) => w && !ALLOWED_WORDS.has(w) && LETTERS.test(w));
};

/** Folders (relative to the repo) that make up the company app. */
export const SCANNED_DIRS = ["src/features", "src/components", "src/app"];

/** The platform admin console stays English. */
export const EXCLUDED = [
  /^src\/features\/admin\//,
  /^src\/app\/admin\//,
  /^src\/app\/api\//,
  /^src\/features\/auth\/views\/AdminLoginView\.tsx$/,
  /^src\/components\/layout\/Admin(Rail|Shell)\.tsx$/,
  /^src\/components\/ui\//, // shadcn primitives: only sr-only defaults overridden by callers
];

export function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") ? [full] : [];
  });
}

export const companyAppFiles = () =>
  SCANNED_DIRS.flatMap((d) => files(join(ROOT, d))).filter((f) => {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    return !EXCLUDED.some((re) => re.test(rel));
  });

/** Literal text inside an expression that ends up on screen: strings, template parts, both sides of ?: and ??/||/+. */
function literalTexts(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literalTexts(node.expression);
  if (ts.isConditionalExpression(node)) return [...literalTexts(node.whenTrue), ...literalTexts(node.whenFalse)];
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.PlusToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
    return [...literalTexts(node.left), ...literalTexts(node.right)];
  }
  return [];
}

const propName = (name: ts.PropertyName | ts.JsxAttributeName, source: ts.SourceFile) => (ts.isStringLiteral(name) ? name.text : name.getText(source));

export function scan(file: string, text = readFileSync(file, "utf8")): string[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];
  const lines = text.split(/\r?\n/);
  const report = (node: ts.Node, value: string) => {
    if (!hasWords(value) || NOT_TEXT.has(value.trim())) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    // `// i18n-ignore` on the line (or the line above): text that is the same in every language on purpose.
    if (lines[line]?.includes("i18n-ignore") || lines[line - 1]?.includes("i18n-ignore")) return;
    found.push(`${relative(ROOT, file).replace(/\\/g, "/")}:${line + 1} "${value.trim().replace(/\s+/g, " ")}"`);
  };
  const reportAll = (node: ts.Node, expr: ts.Expression) => {
    for (const value of literalTexts(expr)) report(node, value);
  };
  const visit = (node: ts.Node) => {
    // `export const metadata` / generateMetadata: the browser tab title is rendered on the server, in English.
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "metadata") return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === "generateMetadata") return;
    if (ts.isJsxText(node)) report(node, node.text);
    else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) reportAll(node, node.expression);
    else if (ts.isJsxAttribute(node) && TEXT_PROPS.has(propName(node.name, source)) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) report(node, init.text);
      else if (ts.isJsxExpression(init) && init.expression) reportAll(node, init.expression);
    } else if (ts.isPropertyAssignment(node) && TEXT_PROPS.has(propName(node.name, source))) reportAll(node, node.initializer);
    else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isToast = ts.isPropertyAccessExpression(callee) && callee.expression.getText(source) === "toast";
      const isToastFn = ts.isIdentifier(callee) && callee.text === "toast";
      const isMessageCall = ts.isPropertyAccessExpression(callee) && MESSAGE_CALLS.has(callee.name.text);
      const isLabelCall = ts.isIdentifier(callee) && LABEL_CALLS.has(callee.text);
      if (isToast || isToastFn) for (const arg of node.arguments) reportAll(node, arg);
      else if (isLabelCall && node.arguments[0]) reportAll(node, node.arguments[0]);
      else if (isMessageCall) for (const arg of node.arguments) if (!ts.isRegularExpressionLiteral(arg)) reportAll(node, arg);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
