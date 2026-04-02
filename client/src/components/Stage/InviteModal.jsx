// client/src/components/Stage/InviteModal.jsx
// Modal for host to invite room members onto stage
import React, { useEffect, useState } from 'react';
import { X, UserPlus, Mic } from 'react-feather';
import axios from 'axios';
import styles from './InviteModal.module.css';
import { toast } from 'react-toastify';

const API = 'http://localhost:8800';

export default function InviteModal({ isOpen, onClose, roomId, members, currentUserId, ownerId, stageUsers }) {
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState({});

  // Reset sent‐state when modal opens
  useEffect(() => {
    if (isOpen) setInviteSent({});
  }, [isOpen]);

  if (!isOpen) return null;

  const stageUserIds = new Set((stageUsers || []).map(u => String(u.userId)));

  // Filter: not the host, not already on stage
  const invitable = (members || []).filter(
    m => String(m._id) !== String(ownerId) && !stageUserIds.has(String(m._id))
  );

  const handleInvite = async (targetUserId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/rooms/${roomId}/stage/invite`,
        { targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteSent(prev => ({ ...prev, [targetUserId]: true }));
      toast.success('Đã gửi lời mời lên sân khấu!');
    } catch (err) {
      toast.error(err?.response?.data?.msg || 'Không thể gửi lời mời.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Mic size={18} className={styles.headerIcon} />
            <h3>Mời lên sân khấu</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.body}>
          {stageUsers && stageUsers.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Đang trên stage ({stageUsers.length})</h4>
              {stageUsers.map(u => (
                <div key={String(u.userId)} className={styles.memberRow}>
                  <img src={u.avatar || '/default-avatar.png'} alt={u.username} className={styles.avatar} />
                  <span className={styles.name}>{u.username}</span>
                  <span className={styles.onStageBadge}>On Stage</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.section}>
            <h4 className={styles.sectionLabel}>Thành viên trong phòng ({invitable.length})</h4>
            {invitable.length === 0 && (
              <p className={styles.emptyMsg}>Không có thành viên nào có thể mời.</p>
            )}
            {invitable.map(m => (
              <div key={m._id} className={styles.memberRow}>
                <img src={m.avatar || '/default-avatar.png'} alt={m.username} className={styles.avatar} />
                <span className={styles.name}>{m.username}</span>
                <button
                  className={styles.inviteBtn}
                  onClick={() => handleInvite(m._id)}
                  disabled={loading || inviteSent[m._id]}
                >
                  {inviteSent[m._id] ? (
                    <span>✓ Đã mời</span>
                  ) : (
                    <><UserPlus size={13} /> Mời</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
