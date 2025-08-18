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
  const paramList = func.params
    .map(p => `_${p.name} ${mapTypeToSQL(p.type)}`)
    .join(', ');
  const returnType = func.responseBodyType ? mapTypeToSQL(func.responseBodyType) : 'VOID';

  const tableName = getTableNameFromFunc(func);
  const bodySQL = generateFunctionBodySQL(func, tableName);

  return `
CREATE OR REPLACE FUNCTION ${func.name}(${paramList})
RETURNS ${returnType}
LANGUAGE sql
AS $$
  ${bodySQL}
$$;`.trim();
}

/**
 * Determine table name from the function specification.
 */
function getTableNameFromFunc(func: FunctionSpec): string {
  const typeName = func.method === 'GET' ? func.responseBodyType : func.requestBodyType;
  if (typeName) {
    return typeName.replace(/\[\]$/, '');
  }
  return func.name;
}

/**
 * Generate the SQL body for the function based on method and params.
 */
function generateFunctionBodySQL(func: FunctionSpec, tableName: string): string {
  const paramNames = func.params.map(p => p.name);
  const placeholders: Record<string, string> = Object.fromEntries(
    paramNames.map(name => [name, `_${name}`])
  );
  switch (func.method) {
    case 'GET': {
      const whereClause = paramNames.length
        ?
            ' WHERE ' +
            paramNames
              .map(name => `${name} = ${placeholders[name]}`)
              .join(' AND ')
        : '';
      return `SELECT * FROM ${tableName}${whereClause};`;
    }
    case 'POST': {
      if (paramNames.length) {
        const columns = paramNames.join(', ');
        const values = paramNames.map(name => placeholders[name]).join(', ');
        return `INSERT INTO ${tableName} (${columns}) VALUES (${values})${func.responseBodyType ? ' RETURNING *' : ''};`;
      }
      return `INSERT INTO ${tableName} DEFAULT VALUES${func.responseBodyType ? ' RETURNING *' : ''};`;
    }
    case 'PUT':
    case 'PATCH': {
      if (paramNames.length) {
        const [idParam, ...rest] = paramNames;
        if (rest.length) {
          const setClause = rest
            .map(name => `${name} = ${placeholders[name]}`)
            .join(', ');
          return `UPDATE ${tableName} SET ${setClause} WHERE ${idParam} = ${placeholders[idParam]}${func.responseBodyType ? ' RETURNING *' : ''};`;
        }
      }
      return `-- TODO: Implement SQL body for ${func.name}`;
    }
    case 'DELETE': {
      const whereClause = paramNames.length
        ?
            ' WHERE ' +
            paramNames
              .map(name => `${name} = ${placeholders[name]}`)
              .join(' AND ')
        : '';
      return `DELETE FROM ${tableName}${whereClause}${func.responseBodyType ? ' RETURNING *' : ''};`;
    }
    default:
      return `-- TODO: Implement SQL body for ${func.name}`;
  }
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
