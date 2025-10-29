import { generateCreateTableSQL, generateCreateFunctionSQL } from '../transformer/db_transformer';
import { generateUseHook } from '../transformer/frontend_transformer';
import { generateTypes } from '../generator/type_writer';
import { TableSpec, FunctionSpec, SpecIR } from '../types/specir';

describe('generation functions', () => {
  const table: TableSpec = {
    name: 'Pet',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      { name: 'name', type: 'VARCHAR', nullable: false, primaryKey: false },
      { name: 'tag', type: 'VARCHAR', nullable: true, primaryKey: false },
    ],
  };

  const func: FunctionSpec = {
    name: 'getPetById',
    method: 'GET',
    path: '/pets/{id}',
    params: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
    requestBodyType: undefined,
    responseBodyType: 'Pet',
  };

  const createFunc: FunctionSpec = {
    name: 'createPet',
    method: 'POST',
    path: '/pets',
    params: [
      { name: 'id', in: 'query', required: true, type: 'integer' },
      { name: 'name', in: 'query', required: true, type: 'string' },
    ],
    requestBodyType: 'Pet',
    responseBodyType: 'Pet',
  };

  const funcWithQuery: FunctionSpec = {
    name: 'searchPets',
    method: 'GET',
    path: '/pets',
    params: [
      { name: 'tag', in: 'query', required: false, type: 'string' },
      { name: 'limit', in: 'query', required: false, type: 'integer' },
    ],
    requestBodyType: undefined,
    responseBodyType: 'Pet[]',
  };

  const funcWithArrayParams: FunctionSpec = {
    name: 'filterPets',
    method: 'GET',
    path: '/pets/filter',
    params: [
      {
        name: 'ids',
        in: 'query',
        required: false,
        type: 'array',
        schema: { type: 'array', items: { type: 'integer' } },
      },
      {
        name: 'flags',
        in: 'query',
        required: false,
        type: 'array',
        schema: { type: 'array', items: { type: 'boolean' } },
      },
    ],
    requestBodyType: undefined,
    responseBodyType: 'Pet[]',
  };

  const updateFunc: FunctionSpec = {
    name: 'updatePet',
    method: 'PUT',
    path: '/pets/{id}',
    params: [
      { name: 'id', in: 'path', required: true, type: 'integer' },
      { name: 'name', in: 'query', required: false, type: 'string' },
    ],
    requestBodyType: 'Pet',
    responseBodyType: 'Pet',
  };

  const patchFunc: FunctionSpec = {
    name: 'patchPet',
    method: 'PATCH',
    path: '/pets/{id}',
    params: [
      { name: 'id', in: 'path', required: true, type: 'integer' },
      { name: 'tag', in: 'query', required: false, type: 'string' },
    ],
    requestBodyType: 'Pet',
    responseBodyType: 'Pet',
  };

  const updateFuncNoParams: FunctionSpec = {
    name: 'updatePetNoParams',
    method: 'PUT',
    path: '/pets/{id}',
    params: [
      { name: 'id', in: 'path', required: true, type: 'integer' },
    ],
    requestBodyType: 'Pet',
    responseBodyType: 'Pet',
  };

  const patchFuncNoParams: FunctionSpec = {
    name: 'patchPetNoParams',
    method: 'PATCH',
    path: '/pets/{id}',
    params: [
      { name: 'id', in: 'path', required: true, type: 'integer' },
    ],
    requestBodyType: 'Pet',
    responseBodyType: 'Pet',
  };

  const headFunc: FunctionSpec = {
    name: 'headPets',
    method: 'HEAD',
    path: '/pets',
    params: [],
    requestBodyType: undefined,
    responseBodyType: undefined,
  };

  const optionsFunc: FunctionSpec = {
    name: 'optionsPets',
    method: 'OPTIONS',
    path: '/pets',
    params: [],
    requestBodyType: undefined,
    responseBodyType: undefined,
  };

  const deleteFunc: FunctionSpec = {
    name: 'deletePet',
    method: 'DELETE',
    path: '/pets/{id}',
    params: [
      { name: 'id', in: 'path', required: true, type: 'integer' },
    ],
    requestBodyType: 'Pet',
    responseBodyType: undefined,
  };

  const funcWithEncodedPath: FunctionSpec = {
    name: 'getPetByTag',
    method: 'GET',
    path: '/pets/{tag}',
    params: [
      { name: 'tag', in: 'path', required: true, type: 'string' },
    ],
    requestBodyType: undefined,
    responseBodyType: 'Pet',
  };

  const inlineRequestFunc: FunctionSpec = {
    name: 'createInlineReport',
    method: 'POST',
    path: '/reports/summary',
    params: [],
    requestBodyType: 'Record<string, any>',
    responseBodyType: undefined,
  };

  const inlineResponseFunc: FunctionSpec = {
    name: 'getInlineReport',
    method: 'GET',
    path: '/reports/summary',
    params: [],
    requestBodyType: undefined,
    responseBodyType: 'Record<string, any>',
  };

  test('generateCreateTableSQL', () => {
    const sql = generateCreateTableSQL(table);
    expect(sql).toBe(`CREATE TABLE IF NOT EXISTS Pet (
  id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  tag VARCHAR, PRIMARY KEY (id)
);`);
  });

  test('generateCreateFunctionSQL for GET', () => {
    const sql = generateCreateFunctionSQL(func);
    expect(sql).toContain('SELECT * FROM Pet');
    expect(sql).toContain('WHERE id = _id');
    expect(sql).toMatch(/getPetById\(_id INTEGER\)/);
  });

  test('generateCreateFunctionSQL maps non-primitive return types to JSONB', () => {
    const sql = generateCreateFunctionSQL(func);
    expect(sql).toContain('RETURNS JSONB');

    const arraySql = generateCreateFunctionSQL(funcWithQuery);
    expect(arraySql).toContain('RETURNS JSONB[]');
    expect(arraySql).not.toMatch(/tag = _tag/);
    expect(arraySql).not.toMatch(/limit = _limit/);
  });

  test('generateCreateFunctionSQL falls back to sanitized path name for inline response type', () => {
    const sql = generateCreateFunctionSQL(inlineResponseFunc);
    expect(sql).toContain('SELECT * FROM ReportsSummary');
    expect(sql).not.toContain('FROM Recordstringany');
  });

  test('generateCreateFunctionSQL for POST', () => {
    const sql = generateCreateFunctionSQL(createFunc);
    expect(sql).toContain('INSERT INTO Pet DEFAULT VALUES RETURNING *');
    expect(sql).toContain('TODO: Map fields from Pet request body to INSERT columns');
    expect(sql).not.toContain('INSERT INTO Pet (id, name)');
    expect(sql).toMatch(/createPet\(_id INTEGER, _name VARCHAR\)/);
  });

  test('generateCreateFunctionSQL falls back to sanitized path name for inline request type', () => {
    const sql = generateCreateFunctionSQL(inlineRequestFunc);
    expect(sql).toContain('INSERT INTO ReportsSummary');
    expect(sql).not.toContain('INSERT INTO Recordstringany');
  });

  test('generateCreateFunctionSQL for PUT', () => {
    const sql = generateCreateFunctionSQL(updateFunc);
    expect(sql).toContain('TODO: Map fields from Pet request body to UPDATE columns');
    expect(sql).toContain('-- Path filter: WHERE id = _id RETURNING *;');
    expect(sql).not.toContain('name = _name');
  });

  test('generateCreateFunctionSQL for PATCH', () => {
    const sql = generateCreateFunctionSQL(patchFunc);
    expect(sql).toContain('TODO: Map fields from Pet request body to UPDATE columns');
    expect(sql).toContain('-- Path filter: WHERE id = _id RETURNING *;');
    expect(sql).not.toContain('tag = _tag');
  });

  test('generateCreateFunctionSQL for PUT with only id param', () => {
    const sql = generateCreateFunctionSQL(updateFuncNoParams);
    expect(sql).toContain('TODO: Map fields from Pet request body to UPDATE columns');
    expect(sql).toContain('-- Path filter: WHERE id = _id RETURNING *;');
  });

  test('generateCreateFunctionSQL for PATCH with only id param', () => {
    const sql = generateCreateFunctionSQL(patchFuncNoParams);
    expect(sql).toContain('TODO: Map fields from Pet request body to UPDATE columns');
    expect(sql).toContain('-- Path filter: WHERE id = _id RETURNING *;');
  });

  test('generateCreateFunctionSQL with array params', () => {
    const sql = generateCreateFunctionSQL(funcWithArrayParams);
    expect(sql).toMatch(/_ids INTEGER\[]/);
    expect(sql).toMatch(/_flags BOOLEAN\[]/);
  });

  test('generateCreateFunctionSQL for DELETE', () => {
    const sql = generateCreateFunctionSQL(deleteFunc);
    expect(sql).toContain('DELETE FROM Pet WHERE id = _id');
    expect(sql).not.toContain('RETURNING *');
  });

  test('generateCreateFunctionSQL for unsupported methods', () => {
    const headSql = generateCreateFunctionSQL(headFunc);
    expect(headSql).toContain('-- Unsupported HTTP method: HEAD');
    const optionsSql = generateCreateFunctionSQL(optionsFunc);
    expect(optionsSql).toContain('-- Unsupported HTTP method: OPTIONS');
  });

  test('generateUseHook', () => {
    const hook = generateUseHook(func);
    expect(hook).toContain("import { useQuery } from '@tanstack/react-query';");
    expect(hook).toContain("import type { Pet } from '../types';");
    expect(hook).not.toContain('useMutation');
    expect(hook).toContain('useGetPetById');
    expect(hook).toContain("useQuery<Pet>({ queryKey: ['getPetById', params.id]");
    expect(hook).toContain("fetch(`/pets/${encodeURIComponent(params.id)}${query ? '?' + query : ''}`);");
    expect(hook).toContain('if (!response.ok)');
    expect(hook).toContain("throw new Error('Network response was not ok')");
    expect(hook).toContain('return response.json();');
  });

  test('generateUseHook encodes path params', () => {
    const hook = generateUseHook(funcWithEncodedPath);
    expect(hook).toContain("fetch(`/pets/${encodeURIComponent(params.tag)}${query ? '?' + query : ''}`);");

    const fetchLine = hook.split('\n').find(line => line.includes('fetch('));
    const match = fetchLine?.match(/fetch\((`.*`)\)/);
    expect(match).toBeTruthy();
    const template = match![1];
    const buildUrl = new Function('params', `const query = ''; return ${template};`);
    expect(buildUrl({ tag: 'hello world' })).toBe('/pets/hello%20world');
  });

  test('generateUseHook with query params', () => {
    const hook = generateUseHook(funcWithQuery);
    expect(hook).toContain("queryKey: ['searchPets', params?.tag, params?.limit]");
    expect(hook).toContain('const queryParamsObj = Object.fromEntries(Object.entries({ tag: params?.tag, limit: params?.limit }).filter(([_, v]) => v !== undefined));');
    expect(hook).toContain('const query = new URLSearchParams(queryParamsObj).toString();');
    expect(hook).toContain("fetch(`/pets${query ? '?' + query : ''}`)");

    const snippetStart = hook.indexOf('const queryParamsObj');
    const snippetEnd = hook.indexOf('const response');
    const snippet = hook.slice(snippetStart, snippetEnd);
    const buildQuery = new Function('params', `${snippet}; return query;`);
    expect(buildQuery({ tag: undefined, limit: 5 })).toBe('limit=5');
    expect(buildQuery({ tag: 'cute', limit: undefined })).toBe('tag=cute');
    expect(buildQuery({ tag: undefined, limit: undefined })).toBe('');
  });

  test('generateUseHook with only optional params allows omitting arguments', () => {
    const hook = generateUseHook(funcWithQuery);
    expect(hook).toContain('export function useSearchPets(paramsArg?: {');
    expect(hook).toContain('const params = paramsArg ?? ({} as {');
  });

  test('generateUseHook returns typed array', () => {
    const hook = generateUseHook(funcWithQuery);
    expect(hook).toContain("import type { Pet } from '../types';");
    expect(hook).toContain('useQuery<Pet[]>');
  });

  test('generateUseHook includes typed body', () => {
    const hook = generateUseHook(createFunc);
    expect(hook).toContain("import type { Pet } from '../types';");
    expect(hook).toContain('body: Pet');
  });

  test('generateUseHook mutation includes query params in fetch url', () => {
    const hook = generateUseHook(createFunc);
    expect(hook).toContain('const queryParamsObj = Object.fromEntries(Object.entries({ id: params.id, name: params.name }).filter(([_, v]) => v !== undefined));');
    expect(hook).toContain('const query = new URLSearchParams(queryParamsObj).toString();');
    expect(hook).toContain("fetch(`/pets${query ? '?' + query : ''}`, {");
  });


  test('generateTypes produces interfaces', () => {
    const spec: SpecIR = { tables: [table], functions: [] };
    const output = generateTypes(spec);
    expect(output).toContain('export interface Pet');
    expect(output).toContain('id: number;');
    expect(output).toContain('name: string;');
    expect(output).toContain('tag?: string;');
  });

  test('generateUseHook without response body', () => {
    const hook = generateUseHook(deleteFunc);
    expect(hook).toContain("import { useMutation } from '@tanstack/react-query';");
    expect(hook).toContain('if (!response.ok)');
    expect(hook).toContain("throw new Error('Network response was not ok')");
    expect(hook).toContain('return undefined;');
    expect(hook).not.toContain('response.json()');

  });
});
