// transformer/db_transformer.ts

import { TableSpec, FunctionSpec, ColumnSpec } from '../types/specir.js';

/**
 * Generates a full CREATE TABLE SQL statement from a TableSpec.
 */
export function generateCreateTableSQL(table: TableSpec): string {
  const columnsSQL = table.columns.map(generateColumnSQL).join(',\n  ');

  const primaryKeys = table.columns.filter(col => col.primaryKey).map(col => col.name);
  const primaryKeySQL = primaryKeys.length ? `, PRIMARY KEY (${primaryKeys.join(', ')})` : '';

  return `
CREATE TABLE IF NOT EXISTS ${table.name} (
  ${columnsSQL}${primaryKeySQL}
);`.trim();
}

/**
 * Generates SQL for a single column.
 */
function generateColumnSQL(column: ColumnSpec): string {
  const nullableSQL = column.nullable ? '' : 'NOT NULL';
  return `${column.name} ${column.type} ${nullableSQL}`.trim();
}

/**
 * Generates a full SQL FUNCTION or PROCEDURE based on a FunctionSpec.
 * (for now just stubs out the function, assuming use in PostgreSQL)
 */
export function generateCreateFunctionSQL(func: FunctionSpec): string {
  const paramList = func.params.map(p => `${p.name} ${mapTypeToSQL(p.type)}`).join(', ');
  const returnType = func.responseBodyType ? mapTypeToSQL(func.responseBodyType) : 'VOID';

  return `
CREATE OR REPLACE FUNCTION ${func.name}(${paramList})
RETURNS ${returnType}
LANGUAGE sql
AS $$
  -- TODO: Implement SQL body for ${func.name}
  SELECT 1;
$$;`.trim();
}

/**
 * Maps basic types to SQL equivalents.
 */
function mapTypeToSQL(type: string): string {
  switch (type) {
    case 'string':
      return 'VARCHAR';
    case 'integer':
      return 'INTEGER';
    case 'boolean':
      return 'BOOLEAN';
    case 'number':
      return 'FLOAT';
    case 'array':
      return 'TEXT[]'; // Simplification for now
    default:
      return 'TEXT';
  }
}
