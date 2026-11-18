/** GET, HEAD and OPTIONS are reads. Every other method is a write. */
export type Access = 'read' | 'write';

/** One rule of a tenant's policy, in the format from the brief. */
export interface Rule {
  id: string;
  action: 'allow' | 'deny';
  /** "github.com", "*.github.com" (one level below) or "**.ngrok.io" (any depth below). */
  hosts: string[];
  /** Missing means any program. */
  programs?: string[];
  /** Missing means reads and writes. */
  access?: Access;
  reason: string;
}

export interface Policy {
  rules: Rule[];
}

/** What the agent wants to do. */
export interface ActionRequest {
  program: string;
  method: string;
  url: string;
}

/** The parts of a request the rules look at. */
export interface Target {
  scheme: string;
  host: string;
  /** "pastebin.com", or "github.com:8443" when the port isn't the default. */
  hostLabel: string;
  /** True when the URL uses the default port (443 for https, 80 for http). */
  defaultPort: boolean;
  /** "git", not "/usr/bin/Git.exe". */
  program: string;
  access: Access;
}

export interface Decision {
  outcome: 'allowed' | 'denied';
  /** The rule that decided, or null for the default deny. */
  ruleId: string | null;
  message: string;
  target: Target;
}
