import path from 'path';
import { parseOpenAPI } from '../parser/openapi_parser';

describe('parseOpenAPI', () => {
  const specPath = path.join(__dirname, 'petstore.yaml');
  const spec = parseOpenAPI(specPath);

  test('parses tables', () => {
    expect(spec.tables).toEqual([
      {
        name: 'Pet',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR', nullable: false, primaryKey: false },
          { name: 'tag', type: 'VARCHAR', nullable: true, primaryKey: false },
        ],
      },
    ]);
  });

  test('parses functions', () => {
    expect(spec.functions).toContainEqual({
      name: 'getPetById',
      method: 'GET',
      path: '/pets/{id}',
      params: [
        { name: 'id', in: 'path', required: true, type: 'integer' },
      ],
      requestBodyType: undefined,
      responseBodyType: 'Pet',
    });

    expect(spec.functions).toContainEqual({
      name: 'createPet',
      method: 'POST',
      path: '/pets',
      params: [],
      requestBodyType: 'Pet',
      responseBodyType: 'Pet',
    });

    expect(spec.functions).toContainEqual({
      name: 'createPet201',
      method: 'POST',
      path: '/pets-creation',
      params: [],
      requestBodyType: 'Pet',
      responseBodyType: 'Pet',
    });

    expect(spec.functions).toContainEqual({
      name: 'deletePet',
      method: 'DELETE',
      path: '/pets/{id}',
      params: [
        { name: 'id', in: 'path', required: true, type: 'integer' },
      ],
      requestBodyType: undefined,
      responseBodyType: undefined,
    });
  });

  test('throws a clear error when file is missing', () => {
    const badPath = path.join(__dirname, 'missing_file.yaml');
    expect(() => parseOpenAPI(badPath)).toThrowError('OpenAPI file not found');
  });

  test('throws a clear error when YAML is invalid', () => {
    const badPath = path.join(__dirname, 'invalid.yaml');
    expect(() => parseOpenAPI(badPath)).toThrowError(/Failed to parse OpenAPI file:/);
  });
});

describe('parseOpenAPI with complex schemas', () => {
  const specPath = path.join(__dirname, 'complex.yaml');
  const spec = parseOpenAPI(specPath);

  test('handles array and object types', () => {
    expect(spec.tables).toEqual([
      {
        name: 'Complex',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
          { name: 'tags', type: 'VARCHAR[]', nullable: true, primaryKey: false },
          { name: 'attributes', type: 'JSONB', nullable: true, primaryKey: false },
          { name: 'nested', type: 'JSONB[]', nullable: true, primaryKey: false },
        ],
      },
    ]);
  });
});
