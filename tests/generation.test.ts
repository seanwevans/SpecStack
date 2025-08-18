import { generateCreateTableSQL, generateCreateFunctionSQL } from '../transformer/db_transformer';
import { generateUseHook } from '../transformer/frontend_transformer';
import { TableSpec, FunctionSpec } from '../types/specir';

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

  test('generateCreateFunctionSQL for POST', () => {
    const sql = generateCreateFunctionSQL(createFunc);
    expect(sql).toContain('INSERT INTO Pet (id, name) VALUES (_id, _name)');
    expect(sql).toMatch(/createPet\(_id INTEGER, _name VARCHAR\)/);
    expect(sql).toContain('RETURNING *');
  });

  test('generateCreateFunctionSQL for PUT', () => {
    const sql = generateCreateFunctionSQL(updateFunc);
    expect(sql).toContain('UPDATE Pet SET name = _name WHERE id = _id');
    expect(sql).toContain('RETURNING *');
  });

  test('generateCreateFunctionSQL for PATCH', () => {
    const sql = generateCreateFunctionSQL(patchFunc);
    expect(sql).toContain('UPDATE Pet SET tag = _tag WHERE id = _id');
    expect(sql).toContain('RETURNING *');
  });

  test('generateCreateFunctionSQL for DELETE', () => {
    const sql = generateCreateFunctionSQL(deleteFunc);
    expect(sql).toContain('DELETE FROM Pet WHERE id = _id');
    expect(sql).not.toContain('RETURNING *');
  });

  test('generateUseHook', () => {
    const hook = generateUseHook(func);
    expect(hook).toContain("import { useQuery } from '@tanstack/react-query';");
    expect(hook).not.toContain('useMutation');
    expect(hook).toContain('useGetPetById');
    expect(hook).toContain("useQuery({ queryKey: ['getPetById']");
    expect(hook).toContain("fetch(`/pets/${encodeURIComponent(params.id)}${query ? '?' + query : ''}`);");
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
    expect(hook).toContain('const queryParamsObj = Object.fromEntries(Object.entries({ tag: params.tag, limit: params.limit }).filter(([_, v]) => v !== undefined));');
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

  test('generateUseHook includes typed body', () => {
    const hook = generateUseHook(createFunc);
    expect(hook).toContain("import type { Pet } from '../types';");
    expect(hook).toContain('body: Pet');
  });
});
