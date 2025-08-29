// generator/type_writer.ts

import { SpecIR } from '../types/specir.js';

/**
 * Generates a TypeScript types file from the SpecIR tables.
 * @param spec The SpecIR containing table definitions.
 */
export function generateTypes(spec: SpecIR): string {
  const parts: string[] = [];
  for (const table of spec.tables) {
    const fields = table.columns
      .map(col => `  ${col.name}${col.nullable ? '?' : ''}: ${mapSqlTypeToTs(col.type)};`)
      .join('\n');
    parts.push(`export interface ${table.name} {\n${fields}\n}`);
  }
  return parts.join('\n\n');
}

/**
 * Maps basic SQL types to TypeScript types.
 */
function mapSqlTypeToTs(sqlType: string): string {
  const isArray = sqlType.endsWith('[]');
  const base = isArray ? sqlType.slice(0, -2) : sqlType;
  let tsType: string;
  switch (base.toUpperCase()) {
    case 'INTEGER':
    case 'INT':
    case 'FLOAT':
    case 'DOUBLE':
    case 'DECIMAL':
    case 'NUMERIC':
      tsType = 'number';
      break;
    case 'BOOLEAN':
      tsType = 'boolean';
      break;
    case 'TIMESTAMP':
    case 'DATE':
    case 'TIME':
    case 'VARCHAR':
    case 'TEXT':
    case 'CHAR':
      tsType = 'string';
      break;
    case 'JSONB':
      tsType = 'any';
      break;
    default:
      tsType = 'any';
  }
  return isArray ? `${tsType}[]` : tsType;
}
