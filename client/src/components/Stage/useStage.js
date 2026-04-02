// client/src/components/Stage/useStage.js
// =============================================
// Custom hook for Stage Management
// Manages local mic/cam state + socket events
// =============================================
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8800';

export default function useStage({ roomId, userId, socket, isHost }) {
  const [stageUsers, setStageUsers] = useState([]); // array of co-host info objects
  const [isLive, setIsLive] = useState(false);
  const [localMicOn, setLocalMicOn] = useState(true);
  const [localCamOn, setLocalCamOn] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(null); // invite received from host
  const hasJoinedStage = useRef(false);

  const isOnStage = stageUsers.some(u => String(u.userId) === String(userId));

  // ---- Fetch initial stage state ----
  useEffect(() => {
    if (!roomId) return;
    const token = localStorage.getItem('token');
    axios
      .get(`${API}/api/rooms/${roomId}/stage`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setStageUsers(data.coHosts || []);
        setIsLive(data.isLive || false);
      })
      .catch(() => {});
  }, [roomId]);

  // ---- Socket listeners ----
  useEffect(() => {
    if (!socket) return;

    const onStateUpdate = ({ coHosts, isLive: live }) => {
      setStageUsers(coHosts || []);
      setIsLive(live || false);
    };
    const onUserJoined = (user) => {
      setStageUsers(prev => {
        if (prev.some(u => String(u.userId) === String(user.userId))) return prev;
        return [...prev, user];
      });
      setIsLive(true);
    };
    const onUserLeft = ({ userId: leftId }) => {
      setStageUsers(prev => prev.filter(u => String(u.userId) !== String(leftId)));
    };
    const onMediaUpdate = ({ userId: uid, micEnabled, camEnabled }) => {
      setStageUsers(prev =>
        prev.map(u => String(u.userId) === String(uid) ? { ...u, micEnabled, camEnabled } : u)
      );
    };
    const onInvite = ({ invitedBy }) => {
      setPendingInvite({ invitedBy });
    };

    socket.on('stage:state-update', onStateUpdate);
    socket.on('stage:user-joined', onUserJoined);
    socket.on('stage:user-left', onUserLeft);
    socket.on('stage:media-update', onMediaUpdate);
    socket.on('stage:invite', onInvite);

    return () => {
      socket.off('stage:state-update', onStateUpdate);
      socket.off('stage:user-joined', onUserJoined);
      socket.off('stage:user-left', onUserLeft);
      socket.off('stage:media-update', onMediaUpdate);
      socket.off('stage:invite', onInvite);
    };
  }, [socket]);

  // ---- Actions ----
  const acceptInvite = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API}/api/rooms/${roomId}/stage/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      socket?.emit('stage:join', { roomId });
      hasJoinedStage.current = true;
      setPendingInvite(null);
    } catch (err) {
      console.error('[useStage] acceptInvite error:', err);
    }
  }, [roomId, socket]);

  const declineInvite = useCallback(() => {
    setPendingInvite(null);
  }, []);

  const leaveStage = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/api/rooms/${roomId}/stage/kick/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      socket?.emit('stage:leave', { roomId });
      hasJoinedStage.current = false;
    } catch (err) {
      console.error('[useStage] leaveStage error:', err);
    }
  }, [roomId, userId, socket]);

  const kickFromStage = useCallback(async (targetUserId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/api/rooms/${roomId}/stage/kick/${targetUserId}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('[useStage] kickFromStage error:', err);
    }
  }, [roomId]);

  const toggleMic = useCallback(() => {
    const next = !localMicOn;
    setLocalMicOn(next);
    socket?.emit('stage:toggle-media', { roomId, micEnabled: next, camEnabled: localCamOn });
  }, [localMicOn, localCamOn, roomId, socket]);

  const toggleCam = useCallback(() => {
    const next = !localCamOn;
    setLocalCamOn(next);
    socket?.emit('stage:toggle-media', { roomId, micEnabled: localMicOn, camEnabled: next });
  }, [localMicOn, localCamOn, roomId, socket]);

  return {
    stageUsers,
    isLive,
    isOnStage,
    localMicOn,
    localCamOn,
    inviteModalOpen,
    pendingInvite,
    setInviteModalOpen,
    acceptInvite,
    declineInvite,
    leaveStage,
    kickFromStage,
    toggleMic,
    toggleCam,
  };
}
