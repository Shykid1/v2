import { Injectable } from '@nestjs/common';

export interface UssdOption {
  id: string;
  label: string;
}

export interface UssdSession {
  step: string;
  options: UssdOption[];
  data: Record<string, string>;
  expiresAt: number;
}

const SESSION_TTL_MS = 120_000;

/**
 * In-memory USSD session state keyed by Arkesel sessionID. USSD is stateless per
 * keypress, so we hold the menu position + accumulated input here for the short life of
 * a session. Single-instance only; back with Redis/DB for multi-instance (same shape).
 */
@Injectable()
export class UssdSessionStore {
  private readonly sessions = new Map<string, UssdSession>();

  get(sessionId: string): UssdSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  set(sessionId: string, session: Omit<UssdSession, 'expiresAt'>): UssdSession {
    const stored: UssdSession = {
      ...session,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    this.sessions.set(sessionId, stored);
    this.prune();
    return stored;
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) this.sessions.delete(id);
    }
  }
}
