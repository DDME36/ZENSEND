export type DiscoveryMode = 'public' | 'wifi' | 'private';
export const OFFER_TTL_MS = 30_000;
type RecordValue = Record<string, unknown>;
export const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number, empty = false): value is string =>
  typeof value === 'string' && (empty || value.length > 0) && value.length <= max;

export function validMode(data: RecordValue): boolean {
  return ['public', 'wifi', 'private'].includes(data.mode as string) &&
    (data.roomCode === undefined || (typeof data.roomCode === 'string' && /^\d{5}$/.test(data.roomCode))) &&
    (data.password === undefined || text(data.password, 128, true));
}

export function validPacket(event: string, data: unknown): boolean {
  if (!record(data)) return false;
  if (event === 'join') {
    const p = data.peer;
    return validMode({ ...data, mode: data.mode ?? 'public' }) && record(p) &&
      text(p.id, 128) && (p.tabId === undefined || text(p.tabId, 128)) &&
      text(p.name, 100) && text(p.device, 100) && record(p.critter) &&
      text(p.critter.emoji, 32) && (p.critter.name === undefined || text(p.critter.name, 100)) && text(p.critter.color, 100) &&
      (p.critter.photoUrl === undefined || p.critter.photoUrl === null || text(p.critter.photoUrl, 200_000));
  }
  if (event === 'set-mode') return validMode(data);
  if (event === 'update-name') return text(data.name, 100);
  if (event === 'update-emoji') {
    const validEmoji = data.emoji === undefined || text(data.emoji, 32);
    const validPhoto = data.photoUrl === undefined || data.photoUrl === null || text(data.photoUrl, 200_000);
    return validEmoji && validPhoto && (data.emoji !== undefined || data.photoUrl !== undefined);
  }
  if (!text(data.to, 128)) return false;
  if (event === 'block-peer' || event === 'unblock-peer') return true;
  if (event === 'text-offer') return text(data.text, 1_000_000);
  if (event === 'rtc-offer' || event === 'rtc-answer') {
    const description = data[event === 'rtc-offer' ? 'offer' : 'answer'];
    return record(description) && description.type === (event === 'rtc-offer' ? 'offer' : 'answer') && text(description.sdp, 128_000);
  }
  if (event === 'rtc-ice') return data.candidate === null || record(data.candidate);
  if (!text(data.fileId, 128)) return false;
  if (event === 'file-offer') return record(data.file) && text(data.file.name, 255) &&
    Number.isSafeInteger(data.file.size) && (data.file.size as number) >= 0 && text(data.file.type, 255, true);
  if (event === 'relay-start') return text(data.name, 255) && Number.isSafeInteger(data.size) &&
    (data.size as number) >= 0 && text(data.mimeType, 255);
  if (event === 'relay-chunk') return (ArrayBuffer.isView(data.chunk) || data.chunk instanceof ArrayBuffer) &&
    data.chunk.byteLength > 0 && data.chunk.byteLength <= 128 * 1024;
  if (event === 'file-cancel') return data.reason === undefined || text(data.reason, 64);
  return ['file-accept', 'file-reject', 'file-preparing', 'file-complete', 'relay-ready', 'relay-end', 'relay-complete-ack'].includes(event);
}

export interface TransferTicket {
  from: string; to: string; name: string; size: number; type: string;
  accepted: boolean; createdAt: number; updatedAt: number;
}
export function isRecipient(ticket: TransferTicket | undefined, sender: string, target: string): ticket is TransferTicket {
  return !!ticket && ticket.to === sender && ticket.from === target;
}
export function mayStartRelay(ticket: TransferTicket | undefined, sender: string, target: string, data: RecordValue): boolean {
  return !!ticket && ticket.accepted && ticket.from === sender && ticket.to === target &&
    ticket.name === data.name && ticket.size === data.size &&
    (ticket.type || 'application/octet-stream') === data.mimeType;
}

export function isOfferExpired(ticket: TransferTicket, now = Date.now()): boolean {
  return !ticket.accepted && now - ticket.createdAt >= OFFER_TTL_MS;
}

export function canCancelTicket(ticket: TransferTicket | undefined, sender: string, target: string): ticket is TransferTicket {
  return !!ticket && (
    (ticket.from === sender && ticket.to === target) ||
    (ticket.to === sender && ticket.from === target)
  );
}

export function hasLiveInboundTicket(
  tickets: ReadonlyMap<string, TransferTicket>,
  recipient: string,
  now = Date.now(),
  excludeFileId?: string,
): boolean {
  for (const [fileId, ticket] of tickets) {
    if (fileId !== excludeFileId && ticket.to === recipient && !isOfferExpired(ticket, now)) return true;
  }
  return false;
}
