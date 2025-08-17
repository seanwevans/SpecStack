// transformer/frontend_transformer.ts

import { FunctionSpec } from '../types/specir.js';

/**
 * Generates a React Query hook for a given API function.
 */
export function generateUseHook(func: FunctionSpec): string {
  const hookName = `use${capitalize(func.name)}`;
  const queryKey = func.name;
  const urlParams = func.params.filter(p => p.in === 'path');
  const queryParams = func.params.filter(p => p.in === 'query');

  const needsParams = urlParams.length > 0 || queryParams.length > 0 || func.requestBodyType;

  const paramsInterface = needsParams ? `params: {
    ${urlParams.map(p => `${p.name}: ${mapTypeToTS(p.type)}`).join(';\n    ')}
    ${queryParams.map(p => `${p.name}?: ${mapTypeToTS(p.type)}`).join(';\n    ')}
    ${func.requestBodyType ? `body: ${func.requestBodyType}` : ''}
  }` : '';

  const urlPath = buildUrlTemplate(func.path, urlParams);

    const queryFn = func.method === 'GET'
    ? `async () => {
    const queryParamsObj = ${queryParams.length > 0
      ? `Object.fromEntries(Object.entries({ ${queryParams
          .map(p => `${p.name}: params.${p.name}`)
          .join(', ')} }).filter(([_, v]) => v !== undefined))`
      : '{}'};
    const query = new URLSearchParams(queryParamsObj).toString();
    const response = await fetch(\`${urlPath}\${query ? '?' + query : ''}\`);
    return response.json();
  }`
    : `async () => {
    const response = await fetch(\`${urlPath}\`, {
      method: '${func.method}',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.body)
    });
    return response.json();
  }`;

  const importList = func.method === 'GET' ? 'useQuery' : 'useMutation';

  const imports = [`import { ${importList} } from '@tanstack/react-query';`,
    func.requestBodyType ? `import type { ${func.requestBodyType} } from '../types';` : ''
  ].filter(Boolean).join('\n');

  return `
${imports}

export function ${hookName}(${needsParams ? paramsInterface : ''}) {
  return ${
    func.method === 'GET'
      ? `useQuery({ queryKey: ['${queryKey}'], queryFn: ${queryFn} })`
      : `useMutation({ mutationFn: ${queryFn} })`
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
    url = url.replace(`{${param.name}}`, `\${params.${param.name}}`);
  }
  return url;
}

/**
 * Maps OpenAPI types to TypeScript types.
 */
function mapTypeToTS(type: string): string {
  switch (type) {
    case 'string':
      return 'string';
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'array':
      return 'any[]'; // Simplified
    default:
      return 'any';
  }
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
