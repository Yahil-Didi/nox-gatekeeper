import { randomToken, sha256 } from '../common/crypto';

/** A new agent key: "nox_" + 32 random bytes. */
export const newAgentKey = () => `nox_${randomToken()}`;

/** What we store for a key: a short prefix to tell keys apart, and the hash to look it up by. */
export const keyParts = (key: string) => ({ prefix: key.slice(0, 12), keyHash: sha256(key) });
