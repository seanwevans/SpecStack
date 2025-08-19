// parser/openapi_parser.ts

import { SpecIR, TableSpec, ColumnSpec, FunctionSpec, ParamSpec, HttpMethod } from '../types/specir.js';
import { readFile, access } from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';
import { OpenAPIV3 } from 'openapi-types';

/**
 * Parses an OpenAPI YAML or JSON file into a SpecIR intermediate model.
 * @param filePath The path to the OpenAPI spec file.
 */
export async function parseOpenAPI(filePath: string): Promise<SpecIR> {
  console.log(`Parsing OpenAPI spec from: ${filePath}`);

  try {
    await access(filePath);
  } catch {
    throw new Error(`OpenAPI file not found: ${filePath}`);
  }

  const fileContent = await readFile(filePath, 'utf-8');
  let openapiDoc: OpenAPIV3.Document;
  try {
    openapiDoc = yaml.load(fileContent) as OpenAPIV3.Document;
  } catch (err: any) {
    throw new Error('Failed to parse OpenAPI file: ' + err.message);
  }

  if (!openapiDoc || typeof openapiDoc !== 'object') {
    throw new Error('Invalid OpenAPI document');
  }

  const tables: TableSpec[] = [];
  const functions: FunctionSpec[] = [];

  // --- Parse Components/Schemas into tables ---
  if (openapiDoc.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(openapiDoc.components.schemas as Record<string, OpenAPIV3.SchemaObject>)) {
      const table = parseSchemaToTable(schemaName, schema);
      tables.push(table);
    }
  }

  // --- Parse Paths into functions ---
  if (openapiDoc.paths) {
    for (const [pathKey, pathItem] of Object.entries(openapiDoc.paths as Record<string, OpenAPIV3.PathItemObject>)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = pathItem[method];
        if (operation) {
          const func = parseOperationToFunction(
            method.toUpperCase(),
            pathKey,
            operation,
            openapiDoc.components?.parameters
          );
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
function parseSchemaToTable(name: string, schema: OpenAPIV3.SchemaObject): TableSpec {
  const columns: ColumnSpec[] = [];

  const requiredFields: string[] = (schema.required as string[]) || [];

  const properties = schema.properties as Record<string, OpenAPIV3.SchemaObject> | undefined;
  for (const [propName, propSchema] of Object.entries(properties || {})) {
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
function parseOperationToFunction(
  method: string,
  path: string,
  operation: OpenAPIV3.OperationObject,
  globalParams?: Record<string, OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject>
): FunctionSpec {
  const params: ParamSpec[] = [];

  if (operation.parameters) {
    for (const param of operation.parameters as (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]) {
      if ('$ref' in param) {
        const resolved = resolveParameterRef(param.$ref, globalParams);
        if (resolved) {
          params.push(parameterObjectToParamSpec(resolved));
        }
        continue;
      }
      params.push(parameterObjectToParamSpec(param));
    }
  }

  // Guess request and response types
  let requestBodyType: string | undefined;
  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  const reqSchema = requestBody?.content?.['application/json']?.schema;
  if (reqSchema && '$ref' in reqSchema) {
    requestBodyType = extractRefName(reqSchema.$ref);
  }

  let responseBodyType: string | undefined;
  const responses = operation.responses as OpenAPIV3.ResponsesObject | undefined;
  if (responses) {
    const statusCodes = Object.keys(responses)
      .filter(code => /^2\d\d$/.test(code))
      .sort();
    for (const code of statusCodes) {
      const response = responses[code] as OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject;
      if ('$ref' in response) continue;
      const schema = response.content?.['application/json']?.schema;
      if (schema && '$ref' in schema) {
        responseBodyType = extractRefName(schema.$ref);
        break;
      }
    }
  }

  return {
    name: operation.operationId || generateFunctionName(method, path),
    method: method as HttpMethod,
    path,
    params,
    requestBodyType,
    responseBodyType
  };
}

function parameterObjectToParamSpec(param: OpenAPIV3.ParameterObject): ParamSpec {
  return {
    name: param.name,
    in: param.in as ParamSpec['in'],
    required: !!param.required,
    type: (param.schema as OpenAPIV3.SchemaObject | undefined)?.type || 'string'
  };
}

function resolveParameterRef(
  ref: string,
  globalParams: Record<string, OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject> | undefined
): OpenAPIV3.ParameterObject | undefined {
  const refName = extractRefName(ref);
  let resolved = globalParams?.[refName];
  while (resolved && '$ref' in resolved) {
    resolved = globalParams?.[extractRefName(resolved.$ref)];
  }
  return resolved as OpenAPIV3.ParameterObject | undefined;
}

/**
 * Maps OpenAPI primitive types to rough SQL types.
 */
function mapOpenAPITypeToSQLType(propSchema: any): string {
  if (!propSchema) return 'TEXT';

  // Handle referenced schemas as generic JSON objects
  if (propSchema.$ref) {
    return 'JSONB';
  }

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
    case 'array': {
      const itemType = mapOpenAPITypeToSQLType(propSchema.items);
      return `${itemType}[]`;
    }
    case 'object':
      return 'JSONB';
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
