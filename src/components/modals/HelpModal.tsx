'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';

import { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  History,
  LifeBuoy,
  Smartphone,
  MousePointerClick,
  CheckCircle2,
  ChevronDown,
  X,
  Lightbulb,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface HelpModalProps {
  show: boolean;
  onClose: () => void;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{question}</span>
        <span className={`faq-chevron ${open ? 'rotated' : ''}`}>
          <ChevronDown size={16} />
        </span>
      </button>
      {open && <div className="faq-answer">{answer}</div>}
    </div>
  );
}

export function HelpModal({ show, onClose }: HelpModalProps) {
  const focusRef = useDialogFocus(show);
  const [activeTab, setActiveTab] = useState<'basic' | 'text' | 'history' | 'troubleshoot'>('basic');

  // Escape key handler
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="modal show" onClick={onClose}>
      <div
        className="modal-content modal-help"
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-guide-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="help-decoration-top" />

        <div className="modal-header">
          <div className="modal-title-group">
            <span className="emoji-picker-eyebrow">ZEN GUIDE &amp; TUTORIAL</span>
            <h3 id="help-guide-title" className="modal-title">วิธีใช้งาน ZenSend</h3>
            <p className="modal-subtitle">ส่งไฟล์ไร้ขีดจำกัด สไตล์ P2P ไร้ตัวกลาง ปลอดภัย 100%</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">
            <X size={16} />
          </button>
        </div>

        <div className="help-tabs-container">
          <div className="help-tabs" role="tablist" aria-label="เมนูช่วยเหลือ">
            <button
              className={`help-tab ${activeTab === 'basic' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'basic'}
              onClick={() => setActiveTab('basic')}
            >
              <Send size={15} className="tab-icon" />
              <span>ส่งไฟล์</span>
            </button>
            <button
              className={`help-tab ${activeTab === 'text' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'text'}
              onClick={() => setActiveTab('text')}
            >
              <MessageSquare size={15} className="tab-icon" />
              <span>ข้อความ</span>
            </button>
            <button
              className={`help-tab ${activeTab === 'history' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              <History size={15} className="tab-icon" />
              <span>ประวัติ</span>
            </button>
            <button
              className={`help-tab ${activeTab === 'troubleshoot' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'troubleshoot'}
              onClick={() => setActiveTab('troubleshoot')}
            >
              <LifeBuoy size={15} className="tab-icon" />
              <span>แก้ปัญหา</span>
            </button>
          </div>
        </div>

        <div className="help-content-scroll" role="tabpanel" aria-label={activeTab}>
          <div key={activeTab} className="help-tab-pane">
          {activeTab === 'basic' && (
            <div className="help-visual-guide">
              <div className="visual-step">
                <div className="visual-icon step-icon-1">
                  <Smartphone size={22} />
                </div>
                <div className="visual-text">
                  <strong>1. เตรียมอุปกรณ์</strong>
                  <span>เปิดเว็บ ZenSend บนอีกเครื่อง ทั้งคู่จะค้นหากันอัตโนมัติ</span>
                </div>
              </div>

              <div className="visual-connector" />

              <div className="visual-step">
                <div className="visual-icon step-icon-2">
                  <MousePointerClick size={22} />
                </div>
                <div className="visual-text">
                  <strong>2. เลือกและส่ง</strong>
                  <span>แตะที่ชื่อเพื่อน เลือกไฟล์ หรือลากไฟล์มาวางบนไอคอนได้เลย</span>
                </div>
              </div>

              <div className="visual-connector" />

              <div className="visual-step">
                <div className="visual-icon step-icon-3">
                  <CheckCircle2 size={22} />
                </div>
                <div className="visual-text">
                  <strong>3. รับไฟล์ทันใจ</strong>
                  <span>ปลายทางกด &quot;รับ&quot; ไฟล์จะส่งตรงระหว่างอุปกรณ์ทันที</span>
                </div>
              </div>

              <div className="help-info-card">
                <div className="info-icon">
                  <Lightbulb size={18} />
                </div>
                <p>
                  ใช้ <strong>โหมด WiFi</strong> เมื่ออยู่ในวงเครือข่ายเดียวกัน เพื่อสปีดสูงสุดแบบไม่มีอั้น
                </p>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="help-visual-guide">
              <div className="visual-step">
                <div className="visual-icon step-icon-1">
                  <MessageSquare size={22} />
                </div>
                <div className="visual-text">
                  <strong>ส่งข้อความ &amp; ลิงก์ด่วน</strong>
                  <span>พิมพ์แชทสั้นๆ หรือวาง URL เพื่อส่งให้อีกเครื่องได้ทันที</span>
                </div>
              </div>
              <div className="help-info-card">
                <div className="info-icon">
                  <ExternalLink size={18} />
                </div>
                <p>ลิงก์หรือข้อความที่ได้รับ สามารถแตะคัดลอกหรือเปิดเข้าเว็บได้เลยทันที</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="help-visual-guide">
              <div className="visual-step">
                <div className="visual-icon step-icon-3">
                  <History size={22} />
                </div>
                <div className="visual-text">
                  <strong>บันทึกประวัติการส่ง</strong>
                  <span>กดไอคอนนาฬิกามุมขวาบนเพื่อตรวจสอบประวัติการส่งและรับไฟล์</span>
                </div>
              </div>
              <p className="help-note">* ข้อมูลประวัติจะถูกจัดเก็บภายในเครื่องของคุณเท่านั้น ปลอดภัยสูงสุด</p>
            </div>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="help-faq-list">
              <FAQItem
                question="หาอุปกรณ์เพื่อนไม่เจอ?"
                answer="ตรวจสอบว่าทั้งคู่เปิดโหมดเดียวกัน (เช่น โหมดสาธารณะเหมือนกัน) หรือลองรีเฟรชหน้าเว็บทั้งสองฝั่ง"
              />
              <FAQItem
                question="ความเร็วในการรับส่งช้า?"
                answer="หากต่อคนละเน็ตระบบจะส่งผ่าน Relay Server แนะนำให้ต่อ WiFi วงเดียวกันเพื่อให้ส่งผ่าน Local P2P ด้วยความเร็วสูงสุด"
              />
              <FAQItem
                question="เปิดใน LINE / Facebook แล้วกดส่งไม่ได้?"
                answer="เบราว์เซอร์ในแอปโซเชียลมักจะบล็อก WebRTC ให้กดเมนูจุดสามจุดแล้วเลือก 'เปิดใน Safari' หรือ 'เปิดใน Chrome'"
              />
              <FAQItem
                question="ส่งไฟล์ข้ามที่ทำงาน หรือผ่าน 4G/5G ได้ไหม?"
                answer="ได้แน่นอนครับ ให้สลับไปที่ 'โหมดส่วนตัว' แล้วแชร์รหัสห้อง 5 หลักให้อีกฝ่ายกรอกเข้าร่วม"
              />
            </div>
          )}
          </div>
        </div>

        <div className="help-footer">
          <button className="btn-help-close-liquid" onClick={onClose}>
            <Sparkles size={16} />
            <span>เข้าใจแล้ว เริ่มใช้งานเลย</span>
          </button>
        </div>
      </div>
    </div>
  );
}
