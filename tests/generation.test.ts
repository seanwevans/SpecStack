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
    expect(sql).toContain('WHERE id = id');
  });

  test('generateCreateFunctionSQL for POST', () => {
    const sql = generateCreateFunctionSQL(createFunc);
    expect(sql).toContain('INSERT INTO Pet (id, name) VALUES (id, name)');
    expect(sql).toContain('RETURNING *');
  });

  test('generateUseHook', () => {
    const hook = generateUseHook(func);
    expect(hook).toContain("useGetPetById");
    expect(hook).toContain("useQuery({ queryKey: ['getPetById']");
    expect(hook).toContain("fetch(`/pets/${params.id}");
  });

  test('generateUseHook with query params', () => {
    const hook = generateUseHook(funcWithQuery);
    expect(hook).toContain('const queryParamsObj = { tag: params.tag, limit: params.limit };');
    expect(hook).toContain('const query = new URLSearchParams(queryParamsObj).toString();');
    expect(hook).toContain("fetch(`/pets${query ? '?' + query : ''}`)");
  });
});
