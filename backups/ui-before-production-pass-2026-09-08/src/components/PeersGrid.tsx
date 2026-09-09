'use client';

import { Peer } from '@/lib/devices';
import { PeerCard, FileWithContext } from './PeerCard';

interface PeersGridProps {
  peers: (Peer & { temporarilyOffline?: boolean })[];
  newPeerIds: Set<string>;
  onSelectPeer: (peer: Peer) => void;
  onDropFiles: (peer: Peer, files: FileWithContext[]) => void;
  onBlockPeer?: (peer: Peer) => void;
}

export function PeersGrid({ peers, newPeerIds, onSelectPeer, onDropFiles, onBlockPeer }: PeersGridProps) {
  if (peers.length === 0) return null;

  return (
    <div className="peers-section show zen-stage-reveal zen-reveal-peers">
      <div className="peers-header-bar">
        <div className="peers-header-content">
          <div className="peers-header-text-col">
            <h1 className="peers-header-title">เลือกอุปกรณ์เพื่อส่ง</h1>
            <p className="peers-hint-text">
              แตะการ์ดเพื่อส่งไฟล์ หรือกดปุ่มข้อความเพื่อแชร์ข้อความ/ลิงก์
            </p>
          </div>
          <span className="peers-badge-count">
            <span className="peers-count-dot" aria-hidden="true" />
            พร้อมส่ง {peers.filter(peer => !peer.temporarilyOffline).length} เครื่อง
          </span>
        </div>
      </div>

      <div className="peers-scroll-region" tabIndex={0} role="region" aria-label="รายชื่ออุปกรณ์ เลื่อนเพื่อดูเพิ่มเติม">
      <div className="peers-grid">
        {peers.map((peer, idx) => (
          <PeerCard
            key={peer.id}
            peer={peer}
            isNew={newPeerIds.has(peer.id)}
            onSelect={onSelectPeer}
            onDrop={onDropFiles}
            onBlock={onBlockPeer}
            style={{ 
              animationDelay: `${Math.min(idx, 5) * 0.06}s`,
              animationFillMode: 'both'
            } as React.CSSProperties}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
