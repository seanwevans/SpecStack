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
  });
});
