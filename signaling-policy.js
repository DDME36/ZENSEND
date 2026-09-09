"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.record = exports.OFFER_TTL_MS = void 0;
exports.validMode = validMode;
exports.validPacket = validPacket;
exports.isRecipient = isRecipient;
exports.mayStartRelay = mayStartRelay;
exports.isOfferExpired = isOfferExpired;
exports.canCancelTicket = canCancelTicket;
exports.hasLiveInboundTicket = hasLiveInboundTicket;
exports.OFFER_TTL_MS = 30_000;
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
exports.record = record;
const text = (value, max, empty = false) => typeof value === 'string' && (empty || value.length > 0) && value.length <= max;
function validMode(data) {
    return ['public', 'wifi', 'private'].includes(data.mode) &&
        (data.roomCode === undefined || (typeof data.roomCode === 'string' && /^\d{5}$/.test(data.roomCode))) &&
        (data.password === undefined || text(data.password, 128, true));
}
function validPacket(event, data) {
    if (!(0, exports.record)(data))
        return false;
    if (event === 'join') {
        const p = data.peer;
        return validMode({ ...data, mode: data.mode ?? 'public' }) && (0, exports.record)(p) &&
            text(p.id, 128) && (p.tabId === undefined || text(p.tabId, 128)) &&
            text(p.name, 100) && text(p.device, 100) && (0, exports.record)(p.critter) &&
            text(p.critter.emoji, 32) && (p.critter.name === undefined || text(p.critter.name, 100)) && text(p.critter.color, 100) &&
            (p.critter.photoUrl === undefined || p.critter.photoUrl === null || text(p.critter.photoUrl, 200_000));
    }
    if (event === 'set-mode')
        return validMode(data);
    if (event === 'update-name')
        return text(data.name, 100);
    if (event === 'update-emoji') {
        const validEmoji = data.emoji === undefined || text(data.emoji, 32);
        const validPhoto = data.photoUrl === undefined || data.photoUrl === null || text(data.photoUrl, 200_000);
        return validEmoji && validPhoto && (data.emoji !== undefined || data.photoUrl !== undefined);
    }
    if (!text(data.to, 128))
        return false;
    if (event === 'block-peer' || event === 'unblock-peer')
        return true;
    if (event === 'text-offer')
        return text(data.text, 1_000_000);
    if (event === 'rtc-offer' || event === 'rtc-answer') {
        const description = data[event === 'rtc-offer' ? 'offer' : 'answer'];
        return (0, exports.record)(description) && description.type === (event === 'rtc-offer' ? 'offer' : 'answer') && text(description.sdp, 128_000);
    }
    if (event === 'rtc-ice')
        return data.candidate === null || (0, exports.record)(data.candidate);
    if (!text(data.fileId, 128))
        return false;
    if (event === 'file-offer')
        return (0, exports.record)(data.file) && text(data.file.name, 255) &&
            Number.isSafeInteger(data.file.size) && data.file.size >= 0 && text(data.file.type, 255, true);
    if (event === 'relay-start')
        return text(data.name, 255) && Number.isSafeInteger(data.size) &&
            data.size >= 0 && text(data.mimeType, 255);
    if (event === 'relay-chunk')
        return (ArrayBuffer.isView(data.chunk) || data.chunk instanceof ArrayBuffer) &&
            data.chunk.byteLength > 0 && data.chunk.byteLength <= 128 * 1024;
    if (event === 'file-cancel')
        return data.reason === undefined || text(data.reason, 64);
    return ['file-accept', 'file-reject', 'file-preparing', 'file-complete', 'relay-ready', 'relay-end', 'relay-complete-ack'].includes(event);
}
function isRecipient(ticket, sender, target) {
    return !!ticket && ticket.to === sender && ticket.from === target;
}
function mayStartRelay(ticket, sender, target, data) {
    return !!ticket && ticket.accepted && ticket.from === sender && ticket.to === target &&
        ticket.name === data.name && ticket.size === data.size &&
        (ticket.type || 'application/octet-stream') === data.mimeType;
}
function isOfferExpired(ticket, now = Date.now()) {
    return !ticket.accepted && now - ticket.createdAt >= exports.OFFER_TTL_MS;
}
function canCancelTicket(ticket, sender, target) {
    return !!ticket && ((ticket.from === sender && ticket.to === target) ||
        (ticket.to === sender && ticket.from === target));
}
function hasLiveInboundTicket(tickets, recipient, now = Date.now(), excludeFileId) {
    for (const [fileId, ticket] of tickets) {
        if (fileId !== excludeFileId && ticket.to === recipient && !isOfferExpired(ticket, now))
            return true;
    }
    return false;
}
