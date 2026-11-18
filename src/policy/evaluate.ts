import { ActionRequest, Decision, Policy, Rule, Target } from './policy.types';

export class InvalidUrlError extends Error {}

/**
 * Decides one request. Pure: no server, no database.
 * 1. A deny rule that matches wins, whatever the order.
 * 2. Otherwise an allow rule must match.
 * 3. Otherwise it's denied by default. If an allow rule matched the host but not the program or
 *    the access, the message says which one.
 */
export const evaluate = (policy: Policy, request: ActionRequest): Decision => {
  const target = toTarget(request);
  const host = target.hostLabel;
  const denies = policy.rules.filter((rule) => rule.action === 'deny');
  const allows = policy.rules.filter((rule) => rule.action === 'allow');

  const deny = denies.find((rule) => matches(rule, target));
  if (deny) {
    const message = `${host} is blocked by your organization: ${deny.reason}. Don't retry this action.`;
    return { outcome: 'denied', ruleId: deny.id, message, target };
  }
  const allow = allows.find((rule) => matches(rule, target));
  if (allow) {
    const message = `${host} is allowed by rule "${allow.id}": ${allow.reason}.`;
    return { outcome: 'allowed', ruleId: allow.id, message, target };
  }
  const nearMiss = allows.find((rule) => matchesHost(rule, target));
  const message = nearMiss
    ? `${host} is allowed ${whatIsAllowed(nearMiss, target)} (rule "${nearMiss.id}": ${nearMiss.reason}). Do it the allowed way, or ask your security team.`
    : `${host} is not on your organization's allow list. If the agent needs it, ask your security team to add a rule.`;
  return { outcome: 'denied', ruleId: null, message, target };
};

/** A rule matches when it covers the host, and the program and access if it lists them. */
const matches = (rule: Rule, target: Target) =>
  matchesHost(rule, target) &&
  (!rule.programs || rule.programs.some((p) => p.toLowerCase() === target.program)) &&
  (!rule.access || rule.access === target.access);

/**
 * Allow rules match only the default port (443, 80); deny rules match every port.
 * "github.com" = exact, "*.x.com" = one level below, "**.x.com" = any depth below.
 */
const matchesHost = (rule: Rule, target: Target) =>
  (rule.action === 'deny' || target.defaultPort) &&
  rule.hosts.some((pattern) => {
    const p = pattern.toLowerCase();
    if (p.startsWith('**.')) return target.host.endsWith(p.slice(2));
    if (p.startsWith('*.')) return target.host.split('.').slice(1).join('.') === p.slice(2);
    return target.host === p;
  });

/** For the near-miss message: "only from git or gh, not from curl". */
const whatIsAllowed = (rule: Rule, target: Target) =>
  rule.programs && !rule.programs.some((p) => p.toLowerCase() === target.program)
    ? `only from ${rule.programs.join(' or ')}, not from ${target.program}`
    : `only for ${rule.access}s, and this is a ${target.access}`;

/**
 * What the rules look at. Node's URL parser lowercases the host and turns IP tricks like
 * "http://2852039166/" into "169.254.169.254".
 */
const toTarget = ({ program, method, url }: ActionRequest): Target => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidUrlError('url must be a full URL, e.g. https://github.com/org/repo');
  }
  const scheme = parsed.protocol.replace(':', '');
  if (scheme !== 'http' && scheme !== 'https') {
    throw new InvalidUrlError(`only http and https URLs are supported, got "${scheme}"`);
  }
  const host = parsed.hostname.replace(/\.$/, '');
  return {
    scheme,
    host,
    hostLabel: parsed.port ? `${host}:${parsed.port}` : host,
    defaultPort: !parsed.port,
    program: (program.split(/[\\/]/).pop() ?? program).toLowerCase().replace(/\.exe$/, ''),
    access: ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ? 'read' : 'write',
  };
};
