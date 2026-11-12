// A configured origin-relative path already contains the deployment prefix.
export function resolveRpcEndpoint(url, base = '/', origin = '') {
  const value = String(url || '').trim();
  if (!value.startsWith('/')) return value;
  const endpoint = /^\/(?:rpc-write|rpc-proxy|rpc)(?:$|[?#])/.test(value)
    ? `${base.replace(/\/$/, '')}${value}`
    : value;
  return origin + endpoint;
}
