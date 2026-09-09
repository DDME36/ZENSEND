'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';

import { formatFileSize } from '@/lib/utils';

interface MultiFileModalProps {
  show: boolean;
  fileCount: number;
  totalSize: number;
  onZip: () => void;
  onSeparate: () => void;
  onCancel: () => void;
}

export function MultiFileModal({ show, fileCount, totalSize, onZip, onSeparate, onCancel }: MultiFileModalProps) {
  const focusRef = useDialogFocus(show);
  if (!show) return null;

  return (
    <div className="modal show">
      <div ref={focusRef} role="dialog" aria-modal="true" aria-label="ส่งหลายไฟล์" onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }} className="modal-content modal-small">
        <div className="modal-icon">📦</div>
        <div className="modal-title">ส่งหลายไฟล์</div>
        <div className="modal-file">{fileCount} ไฟล์ ({formatFileSize(totalSize)})</div>
        <div className="modal-hint" style={{ fontSize: '12px', color: '#8b7b73', marginTop: '8px' }}>
          แนะนำ: รวมเป็น ZIP จะส่งง่ายกว่า
        </div>
        <div className="modal-actions-vertical">
          <button className="btn btn-accept" onClick={onZip}>
            📦 รวมเป็น ZIP (แนะนำ)
          </button>
          <button className="btn btn-pastel" onClick={onSeparate}>
            📄 ส่งทีละไฟล์ (ต้องกดรับทุกไฟล์)
          </button>
          <button className="btn btn-reject" onClick={onCancel}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
