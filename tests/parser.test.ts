import path from 'path';
import { parseOpenAPI } from '../parser/openapi_parser';
import { SpecIR } from '../types/specir';

describe('parseOpenAPI', () => {
  const specPath = path.join(__dirname, 'petstore.yaml');
  let spec: SpecIR;

  beforeAll(async () => {
    spec = await parseOpenAPI(specPath);
  });

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
      name: 'listPets',
      method: 'GET',
      path: '/pets',
      params: [],
      requestBodyType: undefined,
      responseBodyType: 'Pet[]',
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
      name: 'headPets',
      method: 'HEAD',
      path: '/pets',
      params: [],
      requestBodyType: undefined,
      responseBodyType: undefined,
    });

    expect(spec.functions).toContainEqual({
      name: 'optionsPets',
      method: 'OPTIONS',
      path: '/pets',
      params: [],
      requestBodyType: undefined,
      responseBodyType: undefined,
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

  test('throws a clear error when file is missing', async () => {
    const badPath = path.join(__dirname, 'missing_file.yaml');
    await expect(parseOpenAPI(badPath)).rejects.toThrowError('OpenAPI file not found');
  });

  test('throws a clear error when YAML is invalid', async () => {
    const badPath = path.join(__dirname, 'invalid.yaml');
    await expect(parseOpenAPI(badPath)).rejects.toThrowError(/Failed to parse OpenAPI file:/);
  });
});

describe('parseOpenAPI with complex schemas', () => {
  const specPath = path.join(__dirname, 'complex.yaml');
  let spec: SpecIR;

  beforeAll(async () => {
    spec = await parseOpenAPI(specPath);
  });

  test('handles array and object types', () => {
    expect(spec.tables).toEqual([
      {
        name: 'Complex',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
          {
            name: 'tags',
            type: 'VARCHAR[]',
            nullable: true,
            primaryKey: false,
            schema: { type: 'array', items: { type: 'string' } },
          },
          { name: 'attributes', type: 'JSONB', nullable: true, primaryKey: false },
          {
            name: 'nested',
            type: 'JSONB[]',
            nullable: true,
            primaryKey: false,
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
          },
        ],
      },
    ]);
  });
});

describe('parseOpenAPI with array item types', () => {
  const specPath = path.join(__dirname, 'array-items.yaml');
  let spec: SpecIR;

  beforeAll(async () => {
    spec = await parseOpenAPI(specPath);
  });

  test('parses arrays of primitives correctly', () => {
    expect(spec.tables).toEqual([
      {
        name: 'ArrayExample',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
          {
            name: 'numbers',
            type: 'INTEGER[]',
            nullable: true,
            primaryKey: false,
            schema: { type: 'array', items: { type: 'integer' } },
          },
          {
            name: 'flags',
            type: 'BOOLEAN[]',
            nullable: true,
            primaryKey: false,
            schema: { type: 'array', items: { type: 'boolean' } },
          },
        ],
      },
    ]);
  });
});

describe('parseOpenAPI with referenced parameters', () => {
  const specPath = path.join(__dirname, 'ref-params.yaml');
  let spec: SpecIR;

  beforeAll(async () => {
    spec = await parseOpenAPI(specPath);
  });

  test('resolves parameter references', () => {
    expect(spec.functions).toContainEqual({
      name: 'listItems',
      method: 'GET',
      path: '/items',
      params: [
        { name: 'limit', in: 'query', required: false, type: 'integer' },
      ],
      requestBodyType: undefined,
      responseBodyType: undefined,
    });
  });
});

describe('parseOpenAPI with path-level parameters', () => {
  const specPath = path.join(__dirname, 'path-params.yaml');
  let spec: SpecIR;

  beforeAll(async () => {
    spec = await parseOpenAPI(specPath);
  });

  test('merges path parameters into each operation', () => {
    expect(spec.functions).toContainEqual({
      name: 'getWidget',
      method: 'GET',
      path: '/widgets/{widgetId}',
      params: [
        { name: 'widgetId', in: 'path', required: true, type: 'string' },
      ],
      requestBodyType: undefined,
      responseBodyType: undefined,
    });

    expect(spec.functions).toContainEqual({
      name: 'updateWidget',
      method: 'POST',
      path: '/widgets/{widgetId}',
      params: [
        { name: 'widgetId', in: 'path', required: true, type: 'string' },
        { name: 'verbose', in: 'query', required: false, type: 'boolean' },
      ],
      requestBodyType: undefined,
      responseBodyType: undefined,
    });
  });
});
