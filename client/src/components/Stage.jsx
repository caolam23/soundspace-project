import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../contexts/AuthContext';
import styles from './Stage.module.css';

/**
 * ========================================
 * STAGE COMPONENT - Live Co-host Video Grid
 * ========================================
 * Displays co-hosts in responsive grid layout:
 * - 1 user: Full screen
 * - 2 users: Split screen (50-50)
 * - 3+ users: Responsive grid
 */

const Stage = ({ roomId, coHosts = [], isHost = false, members = [], onInviteClick = () => {}, socket }) => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [hasInvitation, setHasInvitation] = useState(false); // Track if guest has pending invitation
  const { user } = useContext(AuthContext);

  // Listen for invitation events
  useEffect(() => {
    const handleInvitationReceived = () => {
      if (!isHost && user) {
        setHasInvitation(true);
        console.log('[Stage] Guest has pending invitation');
      }
    };

    if (socket) {
      socket.on('stage:invitation', handleInvitationReceived);
    }

    return () => {
      if (socket) {
        socket.off('stage:invitation', handleInvitationReceived);
      }
    };
  }, [socket, isHost, user]);

  // Determine layout based on number of active co-hosts
  const activeCoHosts = coHosts.filter(ch => ch.status === 'active');
  const pendingCoHosts = coHosts.filter(ch => ch.status === 'pending');

  console.log('[Stage] Current coHosts:', coHosts);
  console.log('[Stage] Active coHosts:', activeCoHosts);
  console.log('[Stage] Pending coHosts:', pendingCoHosts);
  console.log('[Stage] Current user:', user?._id);

  // Check if current user has a pending invitation
  const myPendingInvitation = user && pendingCoHosts.find(
    ch => String(ch.userId) === String(user._id)
  );
  
  // Check if current user is already active
  const myActiveCoHost = user && activeCoHosts.find(
    ch => String(ch.userId) === String(user._id)
  );
  
  console.log('[Stage] myPendingInvitation:', myPendingInvitation);
  console.log('[Stage] myActiveCoHost:', myActiveCoHost);

  // Calculate grid layout based on number of active co-hosts
  // ✅ Automatic, no manual selection needed
  // ℹ️ Only called when activeCoHosts.length > 0 (see JSX ternary operator)
  // - 1 user: Full screen
  // - 2 users: Split screen 50-50
  // - 3-4 users: 2x2 grid
  // - 5+ users: Responsive grid (auto-fit)
  const getLayoutClass = () => {
    const count = activeCoHosts.length;
    if (count === 1) return styles.layout1;
    if (count === 2) return styles.layout2;
    if (count === 3 || count === 4) return styles.layout4;
    return styles.layoutGrid;
  };

  const handleMediaIcon = (coHost, mediaType) => {
    if (mediaType === 'mic') {
      return coHost.micEnabled ? '🎤' : '🔇';
    }
    return coHost.cameraEnabled ? '📹' : '📴';
  };

  return (
    <div className={styles.stageContainer}>
      {/* Header with Live Status */}
      <div className={styles.stageHeader}>
        <div className={styles.headerTitle}>
          <h3>
            <span className={styles.liveBadge}>🔴 LIVE</span>
            🎤 Live Stage
          </h3>
          <span className={styles.coHostCount}>
            {activeCoHosts.length} Co-host{activeCoHosts.length !== 1 ? 's' : ''}
            {pendingCoHosts.length > 0 && ` + ${pendingCoHosts.length} Pending`}
          </span>
        </div>

        {isHost && (
          <button
            className={styles.inviteBtn}
            onClick={() => setIsInviteOpen(!isInviteOpen)}
          >
            ➕ Invite
          </button>
        )}
      </div>

      {/* Guest Invitation Prompt */}
      {(myPendingInvitation || hasInvitation) && !isHost && (
        <div className={styles.invitationPrompt}>
          <div className={styles.invitationContent}>
            <p className={styles.invitationText}>
              🎤 Bạn được mời lên sân khấu! Chấp nhận để tham gia?
            </p>
            <div className={styles.invitationActions}>
              <button
                className={styles.acceptBtn}
                onClick={() => {
                  if (socket) {
                    socket.emit('stage:accept', {
                      roomId,
                      userId: user._id
                    });
                    toast.success('✅ Bạn đã chấp nhận lời mời!', {
                      position: 'top-right',
                      autoClose: 2000
                    });
                    setHasInvitation(false); // Hide prompt after accepting
                  }
                }}
              >
                ✅ Chấp nhận
              </button>
              <button
                className={styles.rejectBtn}
                onClick={() => {
                  if (socket) {
                    socket.emit('stage:leave', {
                      roomId,
                      userId: user._id
                    });
                    toast.info('❌ Bạn đã từ chối lời mời', {
                      position: 'top-right',
                      autoClose: 2000
                    });
                    setHasInvitation(false); // Hide prompt after rejecting
                  }
                }}
              >
                ❌ Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {activeCoHosts.length === 0 ? (
        <div className={styles.emptyGrid}>
          <div className={styles.emptyState}>
            <p>📺 Chưa có Co-host</p>
            {isHost ? (
              <p className={styles.hint}>Nhấn "Invite" để mời người lên sân khấu</p>
            ) : (
              <p className={styles.hint}>Chờ host mời bạn lên sân khấu...</p>
            )}
          </div>
        </div>
      ) : (
        <div className={`${styles.videoGrid} ${getLayoutClass()}`}>
          {activeCoHosts.map((coHost) => (
            <div
              key={coHost._id || coHost.userId}
              className={styles.videoCard}
            >
              {/* Video Placeholder */}
              <div className={styles.videoPlaceholder}>
                <img
                  src={coHost.avatar || 'https://via.placeholder.com/200'}
                  alt={coHost.username}
                  className={styles.avatar}
                />
                <div className={styles.videoOverlay}>
                  <p className={styles.username}>{coHost.username}</p>

                  {/* Media Status Icons */}
                  <div className={styles.mediaStatus}>
                    <span
                      className={`${styles.statusIcon} ${
                        coHost.micEnabled ? styles.enabled : styles.disabled
                      }`}
                      title={coHost.micEnabled ? 'Mic On' : 'Mic Off'}
                    >
                      {handleMediaIcon(coHost, 'mic')}
                    </span>
                    <span
                      className={`${styles.statusIcon} ${
                        coHost.cameraEnabled ? styles.enabled : styles.disabled
                      }`}
                      title={coHost.cameraEnabled ? 'Camera On' : 'Camera Off'}
                    >
                      {handleMediaIcon(coHost, 'camera')}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`${styles.badge} ${
                      coHost.status === 'active' ? styles.badgeActive : ''
                    }`}
                  >
                    ● {coHost.status === 'active' ? 'Live' : 'Offline'}
                  </div>
                </div>
              </div>

              {/* Host Control Panel */}
              {isHost && (
                <div className={styles.hostControls}>
                  <button
                    className={styles.controlBtn}
                    title="Mute/Unmute"
                    onClick={() => {
                      if (socket) {
                        socket.emit('stage:toggle-media', {
                          roomId,
                          userId: coHost.userId,
                          mediaType: 'mic'
                        });
                      }
                    }}
                  >
                    {coHost.micEnabled ? '🔊' : '🔇'}
                  </button>
                  <button
                    className={styles.controlBtn}
                    title="Camera On/Off"
                    onClick={() => {
                      if (socket) {
                        socket.emit('stage:toggle-media', {
                          roomId,
                          userId: coHost.userId,
                          mediaType: 'camera'
                        });
                      }
                    }}
                  >
                    {coHost.cameraEnabled ? '📹' : '📴'}
                  </button>
                  <button
                    className={`${styles.controlBtn} ${styles.removeBtn}`}
                    title="Remove co-host"
                    onClick={() => {
                      if (socket && window.confirm(`Remove ${coHost.username}?`)) {
                        socket.emit('stage:remove', {
                          roomId,
                          userId: coHost.userId
                        });
                      }
                    }}
                  >
                    🚫
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending Invites */}
      {pendingCoHosts.length > 0 && (
        <div className={styles.pendingSection}>
          <h4>⏳ Lời mời chờ xử lý</h4>
          <div className={styles.pendingList}>
            {pendingCoHosts.map((coHost) => (
              <div key={coHost._id || coHost.userId} className={styles.pendingItem}>
                <img src={coHost.avatar || 'https://via.placeholder.com/40'} alt="" />
                <span>{coHost.username}</span>
                <span className={styles.pendingBadge}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsInviteOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>➕ Mời người lên sân khấu</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsInviteOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.instruction}>
                Chọn người từ danh sách để mời lên sân khấu
              </p>
              {/* User list */}
              {members && members.length > 0 ? (
                <div className={styles.userList}>
                  {members.map((member) => {
                    // Check if member is already invited or on stage
                    const isAlreadyInvited = coHosts.some(
                      ch => String(ch.userId) === String(member._id)
                    );
                    
                    return (
                      <div 
                        key={member._id} 
                        className={`${styles.userItem} ${isAlreadyInvited ? styles.disabled : ''}`}
                      >
                        <img 
                          src={member.avatar || '/default-avatar.png'} 
                          alt={member.username}
                          className={styles.userAvatar}
                        />
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{member.username}</span>
                          {member._id === member.owner && (
                            <span className={styles.hostLabel}>HOST</span>
                          )}
                        </div>
                        <button
                          className={styles.inviteRowBtn}
                          onClick={() => {
                            if (!isAlreadyInvited && socket && user) {
                              // Emit socket event to invite member
                              socket.emit('stage:invite', {
                                roomId,
                                userId: member._id,
                                invitedUsername: member.username,
                                inviterUsername: user.username
                              });
                              toast.success(`✅ Đã mời ${member.username} lên sân khấu!`, {
                                position: 'top-right',
                                autoClose: 2000
                              });
                            }
                          }}
                          disabled={isAlreadyInvited}
                        >
                          {isAlreadyInvited ? '✓ Đã mời' : '➕ Mời'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.userListPlaceholder}>
                  <p>👥 Chưa có người dùng khác trong phòng</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setIsInviteOpen(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stage;
