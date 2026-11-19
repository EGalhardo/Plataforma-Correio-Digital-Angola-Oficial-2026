import { Project, SyntaxKind, JsxText } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
  skipFileDependencyResolution: true,
});

const targetFiles = [
  'src/components/features/InstQrCodeContent.tsx',
  'src/components/features/CitizenProfile.tsx',
  'src/components/features/ProfileContent.tsx',
  'src/components/features/RegisterStepper.tsx',
  'src/components/features/AIChatAssistant.tsx',
  'src/components/features/VoiceGuideAssistant.tsx',
];

let totalInjected = 0;
let filesModified = 0;

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`skip missing ${relPath}`);
    continue;
  }
  const sourceFile = project.addSourceFileAtPath(fullPath);
  
  // 1. Ensure useLanguage import
  let hasUseLanguageImport = false;
  sourceFile.getImportDeclarations().forEach(imp => {
    const module = imp.getModuleSpecifierValue();
    if (module.includes('useLanguage') || module.includes('Language')) {
      const named = imp.getNamedImports().map(n => n.getName());
      if (named.includes('useLanguage')) hasUseLanguageImport = true;
    }
  });
  if (!hasUseLanguageImport) {
    // find last import
    const imports = sourceFile.getImportDeclarations();
    if (imports.length > 0) {
      const lastImport = imports[imports.length-1];
      const insertPos = lastImport.getEnd();
      sourceFile.insertText(insertPos, `\nimport { useLanguage } from '../../hooks/useLanguage';`);
    } else {
      sourceFile.insertStatements(0, `import { useLanguage } from '../../hooks/useLanguage';\n`);
    }
  }

  // 2. Find main component function to inject const { t } = useLanguage();
  // heuristic: find first function with React.FC or export const X: React.FC or export function
  let injectedT = false;
  
  // Check if t is already declared
  const text = sourceFile.getFullText();
  if (/\bconst\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\s*\(/.test(text)) {
    injectedT = true;
  }

  if (!injectedT) {
    // try to find function body start
    // Look for ArrowFunction with block or FunctionDeclaration
    sourceFile.forEachDescendant(node => {
      if (injectedT) return;
      const kind = node.getKind();
      if (kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression || kind === SyntaxKind.FunctionDeclaration) {
        const body: any = (node as any).getBody?.();
        if (body && body.getKind && body.getKind() === SyntaxKind.Block) {
          const statements = body.getStatements();
          // avoid injecting inside nested small functions - check if parent is exported component
          const parentText = node.getParent?.()?.getText?.() || '';
          // simple heuristic: component files usually have props destructuring first
          // inject at top of body if t not already there
          const bodyText = body.getText();
          if (!bodyText.includes('useLanguage()')) {
            body.insertStatements(0, 'const { t } = useLanguage();\n  try { void t; } catch {}\n');
            injectedT = true;
            return;
          }
        }
      }
    });
  }

  // 3. Wrap JSXText nodes
  let fileChanges = 0;
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  // process reverse to avoid offset issues
  [...jsxTexts].reverse().forEach(jsxText => {
    const raw = jsxText.getText();
    // Clean: trim, collapse whitespace
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    if (cleaned.length < 2) return;
    // skip if only punctuation / numbers / symbols
    if (/^[\s{}()[\]<>\/=:;,.\-+*0-9]+$/.test(cleaned)) return;
    // skip if already inside {t(...)}
    const parent = jsxText.getParent();
    if (!parent) return;
    const parentText = parent.getText();
    // avoid double wrapping - if parent already is JsxExpression with t(
    // JsxText parent is JsxElement, so safe
    // skip very short technical strings, and strings that look like code
    if (cleaned.length < 2) return;
    // skip if string is mostly symbols
    const letters = cleaned.replace(/[^A-Za-zÀ-ÿ]/g, '').length;
    if (letters < 2) return;
    // Escape quotes
    const escaped = cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
    // Replace the JsxText node with an expression {t("...")}
    try {
      // Preserve leading/trailing whitespace by keeping formatting simple
      const leadingWs = raw.match(/^\s*/)?.[0] || '';
      const trailingWs = raw.match(/\s*$/)?.[0] || '';
      // ts-morph replaceWithText
      jsxText.replaceWithText(`${leadingWs}{t("${escaped}")}${trailingWs}`);
      fileChanges++;
      totalInjected++;
    } catch (e) {
      // ignore
    }
  });

  if (fileChanges > 0 || injectedT || hasUseLanguageImport === false) {
    filesModified++;
    sourceFile.saveSync();
    console.log(`✓ ${relPath} — ${fileChanges} textos envolvidos, t inject: ${injectedT}`);
  } else {
    console.log(`- ${relPath} — sem alterações`);
  }
  // cleanup project to free memory
  project.removeSourceFile(sourceFile);
}

console.log(`\nTotal: ${filesModified} ficheiros modificados, ${totalInjected} strings JSX envoltas em t().`);
