const PROGRESS_BYTE_INTERVAL = 256 * 1024;
const PROGRESS_TIME_INTERVAL_MS = 120;

export function matchesTransfer(activeFileId: string | null, eventFileId: string): boolean {
  return activeFileId === eventFileId;
}

export function shouldReportProgress(
  transferredBytes: number,
  totalBytes: number,
  lastReportedBytes: number,
  lastReportedAt: number,
  now: number
): boolean {
  if (transferredBytes <= 0) return false;
  if (lastReportedBytes === 0 || transferredBytes >= totalBytes) return true;
  return transferredBytes - lastReportedBytes >= PROGRESS_BYTE_INTERVAL
    || now - lastReportedAt >= PROGRESS_TIME_INTERVAL_MS;
}
