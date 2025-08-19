// cli/generate.ts

import { parseOpenAPI } from '../parser/openapi_parser.js';
import { generateCreateTableSQL, generateCreateFunctionSQL } from '../transformer/db_transformer.js';
import { generateUseHook } from '../transformer/frontend_transformer.js';
import { writeToFile } from '../generator/file_writer.js';
import { join } from 'path';

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: npm run dev <path-to-openapi.yaml> [output-folder]');
  process.exit(1);
}

const openapiPath = args[0];
const outputBase = args[1] || './generated'; // optional second argument

async function main(): Promise<void> {
  try {
    console.log(`Parsing OpenAPI spec from ${openapiPath}...`);

    const spec = await parseOpenAPI(openapiPath);

    const dbOut = join(outputBase, 'db');
    const frontendOut = join(outputBase, 'frontend/src/hooks');

    console.log('Generating DB schema and functions...');
    for (const table of spec.tables) {
      const sql = generateCreateTableSQL(table);
      await writeToFile(join(dbOut, `${table.name}_table.sql`), sql + '\n');
    }

    for (const func of spec.functions) {
      const sql = generateCreateFunctionSQL(func);
      await writeToFile(join(dbOut, `${func.name}_function.sql`), sql + '\n');
    }

    console.log('Generating frontend React hooks...');
    const hookFiles: string[] = [];

    for (const func of spec.functions) {
      const hookName = `use${capitalize(func.name)}`;
      const hook = generateUseHook(func);
      await writeToFile(join(frontendOut, `${hookName}.ts`), hook);
      hookFiles.push(hookName);
    }

    // Generate frontend index.ts to re-export all hooks
    if (hookFiles.length > 0) {
      const indexContent = hookFiles.map(hook => `export * from './${hook}';`).join('\n');
      await writeToFile(join(frontendOut, 'index.ts'), indexContent + '\n');
    }

    console.log('✅ Generation complete.');
  } catch (err) {
    console.error('Generation failed:', err);
    process.exit(1);
  }
}

await main();

// Helper
function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
