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

  test('generateCreateTableSQL', () => {
    const sql = generateCreateTableSQL(table);
    expect(sql).toBe(`CREATE TABLE IF NOT EXISTS Pet (
  id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  tag VARCHAR, PRIMARY KEY (id)
);`);
  });

  test('generateCreateFunctionSQL', () => {
    const sql = generateCreateFunctionSQL(func);
    expect(sql).toBe(`CREATE OR REPLACE FUNCTION getPetById(id INTEGER)
RETURNS TEXT
LANGUAGE sql
AS $$
  -- TODO: Implement SQL body for getPetById
  SELECT 1;
$$;`);
  });

  test('generateUseHook', () => {
    const hook = generateUseHook(func);
    expect(hook).toContain("useGetPetById");
    expect(hook).toContain("useQuery({ queryKey: ['getPetById']");
    expect(hook).toContain("fetch(`/pets/${params.id}");
  });
});
