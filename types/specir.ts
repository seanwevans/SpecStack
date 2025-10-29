// types/specir.ts

// High-level representation of an OpenAPI model after parsing
export interface SpecIR {
  tables: TableSpec[];
  functions: FunctionSpec[];
}

// Represents a database table
export interface TableSpec {
  name: string;
  columns: ColumnSpec[];
}

// Represents a database column
export interface ColumnSpec {
  name: string;
  type: string;   // e.g., "varchar", "integer"
  nullable: boolean;
  primaryKey?: boolean;
  // Original schema object for advanced typing (e.g., arrays)
  schema?: any;
}

// Represents a database function (or API operation)
export interface FunctionSpec {
  name: string;
  method: HttpMethod;          // GET, POST, PUT, DELETE
  path: string;                // API route, like "/pets/{id}"
  params: ParamSpec[];         // URL parameters, query parameters, etc.
  requestBodyType?: string;    // For POST/PUT/PATCH
  responseBodyType?: string;   // Type returned on success
  entityName?: string;         // Preferred entity/table identifier inferred from the spec
}

// Represents a single parameter
export interface ParamSpec {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  type: string; // e.g., "string", "integer"
  // Original schema object for advanced typing (e.g., arrays)
  schema?: any;
}

// Enumerates supported HTTP methods
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE';
