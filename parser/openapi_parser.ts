// parser/openapi_parser.ts

import { SpecIR, TableSpec, ColumnSpec, FunctionSpec, ParamSpec } from '../types/specir.ts';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

/**
 * Parses an OpenAPI YAML or JSON file into a SpecIR intermediate model.
 * @param filePath The path to the OpenAPI spec file.
 */
export function parseOpenAPI(filePath: string): SpecIR {
  console.log(`Parsing OpenAPI spec from: ${filePath}`);

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const openapiDoc = yaml.load(fileContent) as any;

  if (!openapiDoc || typeof openapiDoc !== 'object') {
    throw new Error('Invalid OpenAPI document');
  }

  const tables: TableSpec[] = [];
  const functions: FunctionSpec[] = [];

  // --- Parse Components/Schemas into tables ---
  if (openapiDoc.components?.schemas) {
    for (const [schemaName, schema] of Object.entries<any>(openapiDoc.components.schemas)) {
      const table = parseSchemaToTable(schemaName, schema);
      tables.push(table);
    }
  }

  // --- Parse Paths into functions ---
  if (openapiDoc.paths) {
    for (const [pathKey, pathItem] of Object.entries<any>(openapiDoc.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        if (pathItem[method]) {
          const operation = pathItem[method];
          const func = parseOperationToFunction(method.toUpperCase(), pathKey, operation);
          functions.push(func);
        }
      }
    }
  }

  return { tables, functions };
}

/**
 * Converts an OpenAPI schema into a TableSpec.
 */
function parseSchemaToTable(name: string, schema: any): TableSpec {
  const columns: ColumnSpec[] = [];

  const requiredFields: string[] = schema.required || [];

  for (const [propName, propSchema] of Object.entries<any>(schema.properties || {})) {
    columns.push({
      name: propName,
      type: mapOpenAPITypeToSQLType(propSchema),
      nullable: !requiredFields.includes(propName),
      primaryKey: propName === 'id' // simple heuristic
    });
  }

  return { name, columns };
}

/**
 * Converts an OpenAPI operation into a FunctionSpec.
 */
function parseOperationToFunction(method: string, path: string, operation: any): FunctionSpec {
  const params: ParamSpec[] = [];

  if (operation.parameters) {
    for (const param of operation.parameters) {
      params.push({
        name: param.name,
        in: param.in,
        required: !!param.required,
        type: param.schema?.type || 'string'
      });
    }
  }

  // Guess request and response types
  let requestBodyType: string | undefined;
  if (operation.requestBody?.content?.['application/json']?.schema?.$ref) {
    requestBodyType = extractRefName(operation.requestBody.content['application/json'].schema.$ref);
  }

  let responseBodyType: string | undefined;
  const responses = operation.responses;
  if (responses?.['200']?.content?.['application/json']?.schema?.$ref) {
    responseBodyType = extractRefName(responses['200'].content['application/json'].schema.$ref);
  }

  return {
    name: operation.operationId || generateFunctionName(method, path),
    method: method as any,
    path,
    params,
    requestBodyType,
    responseBodyType
  };
}

/**
 * Maps OpenAPI primitive types to rough SQL types.
 */
function mapOpenAPITypeToSQLType(propSchema: any): string {
  switch (propSchema.type) {
    case 'integer':
      return 'INTEGER';
    case 'number':
      return 'FLOAT';
    case 'boolean':
      return 'BOOLEAN';
    case 'string':
      if (propSchema.format === 'date-time') return 'TIMESTAMP';
      return 'VARCHAR';
    default:
      return 'TEXT';
  }
}

/**
 * Extracts the type name from a $ref string like "#/components/schemas/Pet"
 */
function extractRefName(ref: string): string {
  return path.basename(ref);
}

/**
 * Fallback: Generates a function name from HTTP method and path.
 * e.g., "GET /pets" -> "getPets"
 */
function generateFunctionName(method: string, pathStr: string): string {
  const parts = pathStr.split('/').filter(Boolean);
  return method.toLowerCase() + parts.map(capitalize).join('');
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
