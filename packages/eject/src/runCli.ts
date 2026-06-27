import { ejectFieldsFromDocs } from './ejectFromDocs';
import { renderFieldsModule, renderPageModule } from './fieldToCode';

export async function runCli(ctx: {
  command?: string;
  target?: string;
  rest: string[];
  flag: (name: string, fallback: string) => string;
  writeFileSync: (path: string, data: string) => void;
  resolve: (...paths: string[]) => string;
}): Promise<void> {
  const { command, target, rest, flag, writeFileSync, resolve } = ctx;

  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage:
  nubit eject fields <apiUrl> [--docs http://localhost:8000/api/docs.jsonld] [--out file.ts]
  nubit eject page <Name> <apiUrl> [--docs ...] [--out Pages/Name.tsx] [--title "Title"]
`);
    return;
  }

  const docsUrl = flag('--docs', 'http://localhost:8000/api/docs.jsonld');
  const outPath = flag('--out', '');

  if (command === 'eject' && target === 'fields') {
    const apiUrl = rest.find((arg) => !arg.startsWith('--') && arg !== docsUrl && arg !== outPath);
    if (!apiUrl) throw new Error('Missing apiUrl argument');

    const result = await ejectFieldsFromDocs(apiUrl, docsUrl);
    const code = renderFieldsModule(result.apiUrl, result.fields);
    if (outPath) {
      writeFileSync(resolve(outPath), code);
      console.log(`Wrote ${outPath} (${result.className}, ${result.fields.length} fields)`);
    } else {
      console.log(code);
    }
    return;
  }

  if (command === 'eject' && target === 'page') {
    const positional = rest.filter((arg) => !arg.startsWith('--') && arg !== docsUrl && arg !== outPath);
    const [componentName, apiUrl] = positional;
    if (!componentName || !apiUrl) throw new Error('Usage: nubit eject page <ComponentName> <apiUrl>');

    const title = flag('--title', componentName.replace(/Page$/, ''));
    const code = renderPageModule(componentName, apiUrl, title);
    if (outPath) {
      writeFileSync(resolve(outPath), code);
      console.log(`Wrote ${outPath}`);
    } else {
      console.log(code);
    }
    return;
  }

  throw new Error(`Unknown command: ${command} ${target ?? ''}`);
}