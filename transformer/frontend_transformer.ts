// transformer/frontend_transformer.ts

import { FunctionSpec } from '../types/specir.js';
import { capitalize } from '../utils/string.js';

/**
 * Generates a React Query hook for a given API function.
 */
export function generateUseHook(func: FunctionSpec): string {
  const hookName = `use${capitalize(func.name)}`;
  const queryKey = func.name;
  const urlParams = func.params.filter(p => p.in === 'path');
  const queryParams = func.params.filter(p => p.in === 'query');

  const needsParams = urlParams.length > 0 || queryParams.length > 0 || func.requestBodyType;

  const paramsFields: string[] = [];
  paramsFields.push(
    ...urlParams.map(p => `${p.name}: ${mapTypeToTS(p.schema || p.type)}`),
  );
  paramsFields.push(
    ...queryParams.map(p => `${p.name}?: ${mapTypeToTS(p.schema || p.type)}`),
  );
  if (func.requestBodyType) {
    paramsFields.push(`body: ${func.requestBodyType}`);
  }

  const paramsInterface = needsParams
    ? `params: {\n    ${paramsFields.join(';\n    ')}\n  }`
    : '';

  const urlPath = buildUrlTemplate(func.path, urlParams);

  const queryKeyParts = [
    `'${queryKey}'`,
    ...urlParams.map(p => `params.${p.name}`),
    ...queryParams.map(p => `params.${p.name}`),
  ];
  const queryKeyArray = `[${queryKeyParts.join(', ')}]`;

  const responseHandling = func.responseBodyType
    ? `if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();`
    : `if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return undefined;`;

  const queryParamsObjSnippet = `Object.fromEntries(Object.entries({ ${queryParams
    .map(p => `${p.name}: params.${p.name}`)
    .join(', ')} }).filter(([_, v]) => v !== undefined))`;

  const queryParamsDeclaration = `const queryParamsObj = ${queryParams.length > 0 ? queryParamsObjSnippet : '{}'};
    const query = new URLSearchParams(queryParamsObj).toString();`;

  const queryFn =
    func.method === 'GET'
      ? `async () => {
    ${queryParamsDeclaration}
    const response = await fetch(\`${urlPath}\${query ? '?' + query : ''}\`);
    ${responseHandling}
  }`
      : `async (${needsParams ? 'params' : ''}) => {
    ${queryParamsDeclaration}
    const response = await fetch(\`${urlPath}\${query ? '?' + query : ''}\`, {
      method: '${func.method}'${func.requestBodyType ? `,\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(params.body)` : ''}
    });
    ${responseHandling}
  }`;

  const importList = func.method === 'GET' ? 'useQuery' : 'useMutation';

  const typeSet = new Set<string>();
  const addType = (t?: string) => {
    if (!t) return;
    const base = t.replace(/\[\]$/, '');
    if (/^(string|number|boolean|any)$/.test(base)) return;
    typeSet.add(base);
  };
  addType(func.requestBodyType);
  addType(func.responseBodyType);

  const imports = [`import { ${importList} } from '@tanstack/react-query';`,
    typeSet.size ? `import type { ${Array.from(typeSet).join(', ')} } from '../types';` : ''
  ].filter(Boolean).join('\n');

  return `
${imports}

export function ${hookName}(${needsParams ? paramsInterface : ''}) {
  return ${
    func.method === 'GET'
      ? `useQuery<${func.responseBodyType || 'any'}>({ queryKey: ${queryKeyArray}, queryFn: ${queryFn} })`
      : `useMutation<${func.responseBodyType || 'any'}>({ mutationFn: ${queryFn} })`
  };
}
`.trim();
}

/**
 * Builds the URL template string with embedded path parameters.
 */
function buildUrlTemplate(pathStr: string, urlParams: { name: string }[]): string {
  let url = pathStr;
  for (const param of urlParams) {
    url = url.replace(`{${param.name}}`, `\${encodeURIComponent(params.${param.name})}`);
  }
  return url;
}

/**
 * Maps OpenAPI types to TypeScript types.
 */
function mapTypeToTS(schema: any): string {
  if (typeof schema === 'string') {
    switch (schema) {
      case 'string':
        return 'string';
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'number':
        return 'number';
      case 'array':
        return 'any[]';
      default:
        return 'any';
    }
  }

  if (schema?.$ref) {
    return extractRefName(schema.$ref);
  }

  if (schema?.type === 'array') {
    const itemType = mapTypeToTS(schema.items);
    return `${itemType}[]`;
  }

  switch (schema?.type) {
    case 'string':
      return 'string';
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    default:
      return 'any';
  }
}

function extractRefName(ref: string): string {
  return ref.substring(ref.lastIndexOf('/') + 1);
}
