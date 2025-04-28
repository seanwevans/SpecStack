// transformer/frontend_transformer.ts

import { FunctionSpec } from '../types/specir.ts';

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
    ? `async (${needsParams ? '{ params }' : ''}) => {
    const query = new URLSearchParams(${queryParams.length > 0 ? 'params' : '{}'}).toString();
    const response = await fetch(\`${urlPath}\${query ? '?' + query : ''}\`);
    return response.json();
  }`
    : `async (${needsParams ? '{ params }' : ''}) => {
    const response = await fetch(\`${urlPath}\`, {
      method: '${func.method}',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.body)
    });
    return response.json();
  }`;

  return `
import { useQuery, useMutation } from '@tanstack/react-query';

export function ${hookName}(${needsParams ? paramsInterface : ''}) {
  return ${
    func.method === 'GET'
      ? `useQuery(['${queryKey}'], ${queryFn})`
      : `useMutation(${queryFn})`
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
