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
    .map(p => `_${p.name} ${mapTypeToSQL(p.type, p.schema)}`)
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
  const pathParams = func.params.filter(p => p.in === 'path').map(p => p.name);
  const queryParams = func.params.filter(p => p.in === 'query').map(p => p.name);
  const allParamNames = func.params.map(p => p.name);
  const placeholders: Record<string, string> = Object.fromEntries(
    allParamNames.map(name => [name, `_${name}`])
  );
  switch (func.method) {
    case 'GET': {
      const whereClause = pathParams.length
        ?
            ' WHERE ' +
            pathParams
              .map(name => `${name} = ${placeholders[name]}`)
              .join(' AND ')
        : '';
      const baseSelect = `SELECT * FROM ${tableName}${whereClause};`;
      if (!queryParams.length) {
        return baseSelect;
      }

      const filterComments = queryParams
        .map(name => `-- Optional filter: ${name}`)
        .join('\n  ');

      return `${baseSelect}\n  ${filterComments}`;
    }
    case 'POST': {
      const bodyDescriptor = func.requestBodyType
        ? `${func.requestBodyType} request body`
        : 'request body';
      const returningClause = func.responseBodyType ? ' RETURNING *' : '';
      const comment = `-- TODO: Map fields from ${bodyDescriptor} to INSERT columns`;
      return `${comment}\nINSERT INTO ${tableName} DEFAULT VALUES${returningClause};`;
    }
    case 'PUT':
    case 'PATCH': {
      if (!pathParams.length) {
        const warning = `-- Warning: unable to update ${tableName} without identifying path parameters`;
        console.warn(warning);
        return warning;
      }

      const bodyDescriptor = func.requestBodyType
        ? `${func.requestBodyType} request body`
        : 'request body';
      const whereClause = pathParams
        .map(name => `${name} = ${placeholders[name]}`)
        .join(' AND ');
      const returningClause = func.responseBodyType ? ' RETURNING *' : '';
      const comment = `-- TODO: Map fields from ${bodyDescriptor} to UPDATE columns`;
      return `${comment}\n-- Path filter: WHERE ${whereClause}${returningClause};`;
    }
    case 'DELETE': {
      const whereClause = pathParams.length
        ?
            ' WHERE ' +
            pathParams
              .map(name => `${name} = ${placeholders[name]}`)
              .join(' AND ')
        : '';
      return `DELETE FROM ${tableName}${whereClause}${func.responseBodyType ? ' RETURNING *' : ''};`;
    }
    case 'HEAD':
    case 'OPTIONS':
    case 'TRACE':
    default:
      return `-- Unsupported HTTP method: ${func.method}`;
  }
}

/**
 * Maps basic types (and arrays) to SQL equivalents.
 */
function mapTypeToSQL(type: string, schema?: any): string {
  if (type === 'array') {
    const itemSchema = schema?.items;
    if (itemSchema) {
      const itemType = itemSchema.type
        ? mapTypeToSQL(itemSchema.type, itemSchema)
        : 'TEXT';
      return `${itemType}[]`;
    }
    return 'TEXT[]';
  }

  if (type.endsWith('[]')) {
    const baseType = type.slice(0, -2);
    return `${mapTypeToSQL(baseType)}[]`;
  }

  switch (type) {
    case 'string':
      return 'VARCHAR';
    case 'integer':
      return 'INTEGER';
    case 'boolean':
      return 'BOOLEAN';
    case 'number':
      return 'FLOAT';
    default:
      if (/^[A-Z]/.test(type)) {
        return 'JSONB';
      }
      return 'TEXT';
  }
}
