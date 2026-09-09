'use client';

import { useEffect, useRef, useState } from 'react';
import { AVATAR_CATEGORIES } from '@/lib/devices';
import { Sparkles, Smile, PawPrint, Leaf, Cpu, Heart, Camera, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

interface AvatarModalProps {
  show: boolean;
  currentEmoji: string;
  currentPhotoUrl?: string | null;
  onSelect: (emoji: string) => void;
  onSelectPhoto?: (photoUrl: string | null) => void;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  popular: Sparkles,
  faces: Smile,
  animals: PawPrint,
  nature: Leaf,
  tech: Cpu,
  things: Heart,
};

function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('กรุณาเลือกไฟล์รูปภาพ'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const TARGET_SIZE = 128;
          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Center crop square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);

          let dataUrl = canvas.toDataURL('image/webp', 0.85);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
          resolve(dataUrl);
        } catch {
          reject(new Error('เกิดข้อผิดพลาดในการแปลงขนาดรูป'));
        }
      };
      img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });
}

export function AvatarModal({
  show,
  currentEmoji,
  currentPhotoUrl,
  onSelect,
  onSelectPhoto,
  onClose,
}: AvatarModalProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'photo'>('emoji');
  const [category, setCategory] = useState<string>('popular');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(currentEmoji);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null | undefined>(currentPhotoUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { play } = useSound();

  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategory = AVATAR_CATEGORIES.find(item => item.id === category) || AVATAR_CATEGORIES[0];

  useEffect(() => {
    if (!show) return;
    setPhotoError(null);
    setActiveTab(currentPhotoUrl ? 'photo' : 'emoji');
    setSelectedEmoji(currentEmoji);
    setSelectedPhotoUrl(currentPhotoUrl);
    const previousFocus = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('.avatar-main-tab.active, button')?.focus());
    return () => previousFocus?.focus();
  }, [show, currentEmoji, currentPhotoUrl]);

  // Escape key handler for window
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setIsProcessing(true);
    try {
      const dataUrl = await processImageFile(file);
      play('success');
      setSelectedPhotoUrl(dataUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัพโหลดรูป';
      setPhotoError(message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectEmojiOption = (emoji: string) => {
    play('tick');
    setSelectedEmoji(emoji);
    setSelectedPhotoUrl(null);
  };

  const handleDoubleClickEmoji = (emoji: string) => {
    play('success');
    onSelect(emoji);
    onSelectPhoto?.(null);
    onClose();
  };

  const handleRemovePhoto = () => {
    play('tick');
    setSelectedPhotoUrl(null);
  };

  const handleConfirm = () => {
    play('success');
    if (selectedPhotoUrl) {
      onSelectPhoto?.(selectedPhotoUrl);
    } else {
      onSelect(selectedEmoji);
      onSelectPhoto?.(null);
    }
    onClose();
  };

  return (
    <div className="modal show" onClick={() => { play('closeModal'); onClose(); }}>
      <div
        ref={dialogRef}
        className="modal-content emoji-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            play('closeModal');
            onClose();
          }
          if (e.key === 'Tab') {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const active = document.activeElement as HTMLElement;
            if (!active || !active.classList.contains('emoji-btn')) return;
            const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('.emoji-btn') || []);
            const idx = buttons.indexOf(active);
            if (idx === -1) return;
            e.preventDefault();
            const cols = 5;
            let next = idx;
            if (e.key === 'ArrowRight') next = (idx + 1) % buttons.length;
            if (e.key === 'ArrowLeft') next = (idx - 1 + buttons.length) % buttons.length;
            if (e.key === 'ArrowDown') next = (idx + cols) % buttons.length;
            if (e.key === 'ArrowUp') next = (idx - cols + buttons.length) % buttons.length;
            buttons[next]?.focus();
          }
          if (e.key === 'Home') {
            const buttons = dialogRef.current?.querySelectorAll<HTMLElement>('.emoji-btn');
            if (!buttons || buttons.length === 0) return;
            e.preventDefault();
            buttons[0].focus();
          }
        }}
      >
        <button
          className="modal-close"
          onClick={() => {
            play('closeModal');
            onClose();
          }}
          aria-label="ปิด"
        >×</button>

        <div className="modal-header modal-header-centered">
          <div className="modal-title-group-centered">
            <span className="emoji-picker-eyebrow">YOUR ZEN IDENTITY</span>
            <h2 id="avatar-picker-title" className="modal-title">เลือกตัวตนของคุณ</h2>
            <p className="emoji-picker-hint">เลือก Emoji ประจำตัวของคุณ หรืออัพโหลดรูปภาพจากอุปกรณ์</p>
          </div>
        </div>

        {/* Hidden native file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
        />

        {/* Main Tab Switcher: Emoji vs Photo Upload (Emoji First) */}
        <div className="avatar-main-tabs" role="tablist">
          <button
            type="button"
            className={`avatar-main-tab ${activeTab === 'emoji' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'emoji'}
            onClick={() => {
              play('tap');
              setActiveTab('emoji');
            }}
          >
            <Smile size={16} />
            <span>เลือก Emoji</span>
          </button>
          <button
            type="button"
            className={`avatar-main-tab ${activeTab === 'photo' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'photo'}
            onClick={() => {
              play('tap');
              setActiveTab('photo');
            }}
          >
            <Camera size={16} />
            <span>อัพโหลดรูปภาพ</span>
          </button>
        </div>

        {/* TAB 1: Emoji Selection (Default) */}
        {activeTab === 'emoji' && (
          <>
            <div className="emoji-category-tabs" role="tablist" aria-label="หมวดหมู่ตัวตน">
              {AVATAR_CATEGORIES.map(item => {
                const Icon = CATEGORY_ICONS[item.id] || Sparkles;
                return (
                  <button
                    key={item.id}
                    className={`emoji-category-tab ${category === item.id ? 'active' : ''}`}
                    role="tab"
                    aria-selected={category === item.id}
                    onClick={() => {
                      play('tap');
                      setCategory(item.id);
                    }}
                  >
                    <Icon size={14} className="category-tab-icon" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              className="emoji-grid emoji-showcase"
              role="tabpanel"
              aria-label={activeCategory.label}
            >
              {activeCategory.emojis.map((emoji, index) => (
                <button
                  key={`${activeCategory.id}-${emoji}-${index}`}
                  className={`emoji-option avatar-option ${!selectedPhotoUrl && emoji === selectedEmoji ? 'selected' : ''}`}
                  onClick={() => handleSelectEmojiOption(emoji)}
                  onDoubleClick={() => handleDoubleClickEmoji(emoji)}
                  aria-label={`เลือก ${emoji}`}
                  aria-pressed={!selectedPhotoUrl && emoji === selectedEmoji}
                >
                  <span className="emoji-option-character">{emoji}</span>
                  {!selectedPhotoUrl && emoji === selectedEmoji && <span className="emoji-selected-mark" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: Photo Upload */}
        {activeTab === 'photo' && (
          <div className="avatar-photo-tab-content">
            {selectedPhotoUrl ? (
              <div className="avatar-photo-current-card">
                <div className="avatar-photo-preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedPhotoUrl} alt="รูปโปรไฟล์ที่เลือก" className="avatar-photo-preview-large" />
                  <span className="avatar-photo-preview-badge">ที่เลือกไว้</span>
                </div>
                <div className="avatar-photo-actions">
                  <button
                    type="button"
                    className="btn-photo-action upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Camera size={15} />
                    <span>{isProcessing ? 'กำลังประมวลผล...' : 'เปลี่ยนรูปภาพใหม่'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-photo-action delete"
                    onClick={handleRemovePhoto}
                    title="ลบรูปและกลับไปใช้อีโมจิ"
                  >
                    <Trash2 size={15} />
                    <span>ลบรูป (ใช้อีโมจิ)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="avatar-photo-upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              >
                <div className="upload-dropzone-icon">
                  <Upload size={26} />
                </div>
                <div className="upload-dropzone-text">
                  <strong>อัพโหลดรูปภาพโปรไฟล์จากเครื่อง</strong>
                  <span>แตะเพื่อเลือกรูปภาพจากคลังรูป หรือกล้องถ่ายรูป</span>
                  <small>รองรับ PNG, JPG, WebP (ตัดขนาดวงกลมให้อัตโนมัติ)</small>
                </div>
                <button
                  type="button"
                  className="btn-upload-browse"
                  disabled={isProcessing}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <ImageIcon size={15} />
                  <span>{isProcessing ? 'กำลังประมวลผล...' : 'เลือกรูปภาพจากเครื่อง'}</span>
                </button>
              </div>
            )}

            {photoError && <div className="avatar-photo-error">{photoError}</div>}

            <p className="avatar-photo-hint">
              รูปภาพของคุณจะถูกบันทึกไว้ในอุปกรณ์ และแสดงให้เครื่องอื่นเห็นทันทีเมื่อเชื่อมต่อ
            </p>
          </div>
        )}

        {/* Preview Bar */}
        <div className="emoji-preview-bar">
          <span className="emoji-preview-orbit">
            {selectedPhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={selectedPhotoUrl} alt="รูปโปรไฟล์ที่เลือก" className="avatar-photo-orbit" />
            ) : (
              <span className="emoji-avatar emoji-idle">{selectedEmoji || '✨'}</span>
            )}
          </span>
          <div>
            <strong>{selectedPhotoUrl ? 'รูปภาพโปรไฟล์ที่เลือก' : 'ตัวตนที่เลือก (Emoji)'}</strong>
            <small>{selectedPhotoUrl ? 'คลิก "เรียบร้อย" เพื่อบันทึกรูปนี้' : 'คลิกเลือกแล้วกด "เรียบร้อย" เพื่อยืนยัน (หรือดับเบิ้ลคลิกเพื่อเปลี่ยนทันที)'}</small>
          </div>
          <button type="button" className="avatar-modal-done-btn" onClick={handleConfirm}>
            เรียบร้อย
          </button>
        </div>
      </div>
    </div>
  );
}

export const EmojiModal = AvatarModal;
