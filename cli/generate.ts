// cli/generate.ts

import { parseOpenAPI } from '../parser/openapi_parser.js';
import { generateCreateTableSQL, generateCreateFunctionSQL } from '../transformer/db_transformer.js';
import { generateUseHook } from '../transformer/frontend_transformer.js';
import { writeToFile } from '../generator/file_writer.js';
import { generateTypes } from '../generator/type_writer.js';
import { join } from 'path';
import { capitalize } from '../utils/string.js';

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
    const frontendSrcOut = join(outputBase, 'frontend/src');

    console.log('Generating DB schema and functions...');
    const tableWrites: Promise<void>[] = [];
    for (const table of spec.tables) {
      const sql = generateCreateTableSQL(table);
      const filePath = join(dbOut, `${table.name}_table.sql`);
      tableWrites.push(
        writeToFile(filePath, sql + '\n').catch(err => {
          throw new Error(`Failed to write ${filePath}: ${err.message}`);
        })
      );
    }

    const functionWrites: Promise<void>[] = [];
    for (const func of spec.functions) {
      const sql = generateCreateFunctionSQL(func);
      const filePath = join(dbOut, `${func.name}_function.sql`);
      functionWrites.push(
        writeToFile(filePath, sql + '\n').catch(err => {
          throw new Error(`Failed to write ${filePath}: ${err.message}`);
        })
      );
    }

    console.log('Generating frontend types...');
    const typesContent = generateTypes(spec);
    const typesPath = join(frontendSrcOut, 'types.ts');
    const typeWrite = writeToFile(typesPath, typesContent + '\n').catch(err => {
      throw new Error(`Failed to write ${typesPath}: ${err.message}`);
    });

    console.log('Generating frontend React hooks...');
    const hookFiles: string[] = [];
    const hookWrites: Promise<void>[] = [];

    for (const func of spec.functions) {
      const hookName = `use${capitalize(func.name)}`;
      const hook = generateUseHook(func);
      const filePath = join(frontendOut, `${hookName}.ts`);
      hookFiles.push(hookName);
      hookWrites.push(
        writeToFile(filePath, hook).catch(err => {
          throw new Error(`Failed to write ${filePath}: ${err.message}`);
        })
      );
    }

    // Generate frontend index.ts to re-export all hooks
    if (hookFiles.length > 0) {
      const indexContent = hookFiles.map(hook => `export * from './${hook}';`).join('\n');
      const indexPath = join(frontendOut, 'index.ts');
      hookWrites.push(
        writeToFile(indexPath, indexContent + '\n').catch(err => {
          throw new Error(`Failed to write ${indexPath}: ${err.message}`);
        })
      );
    }

    await Promise.all([typeWrite, ...tableWrites, ...functionWrites, ...hookWrites]);

    console.log('✅ Generation complete.');
  } catch (err) {
    console.error('Generation failed:', err);
    process.exit(1);
  }
}

await main();

