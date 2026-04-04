/**
 * Music Control Socket Event Handlers
 * 
 * Handles all music playback events:
 * - music-control: Play, pause, skip, seek actions (owner only)
 * - sync-time: Sync playback time across room members
 * 
 * Only room owner can control music
 * Manages playback state and broadcasts changes to all room members
 */

const Room = require('../../models/room');

const registerMusicHandlers = (io, socket) => {
  /**
   * Music control: Play, Pause, Skip Next/Previous, Seek
   * Only room owner can issue these commands
   * Transitions room status: waiting -> live (on first play)
   */
  socket.on('music-control', async ({ roomId, action }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        console.warn(`[MUSIC_CONTROL] Room not found: ${roomId}`);
        return;
      }

      // Authorization: only room owner can control music
      if (socket.userId !== room.owner.toString()) {
        console.warn(
          `[MUSIC_CONTROL] Unauthorized user tried to control music in room ${roomId}`
        );
        return;
      }

      const oldStatus = room.status;
      let updatedState = {};

      switch (action.type) {
        case 'PLAY':
        case 'SKIP_NEXT':
        case 'SKIP_PREVIOUS': {
          const isPlayAction = action.type === 'PLAY';
          let trackIndexToPlay = room.currentTrackIndex;

          if (isPlayAction) {
            trackIndexToPlay =
              action.payload?.trackIndex ??
              (room.currentTrackIndex === -1 ? 0 : room.currentTrackIndex);
          } else if (action.type === 'SKIP_NEXT') {
            if (!room.playlist.length) return;
            trackIndexToPlay =
              (room.currentTrackIndex + 1) % room.playlist.length;
          } else {
            // SKIP_PREVIOUS
            if (!room.playlist.length) return;
            trackIndexToPlay =
              (room.currentTrackIndex - 1 + room.playlist.length) %
              room.playlist.length;
          }

          // Validate track index
          if (
            trackIndexToPlay < 0 ||
            trackIndexToPlay >= room.playlist.length
          ) {
            console.warn(
              `[MUSIC_CONTROL] Invalid track index: ${trackIndexToPlay}`
            );
            return;
          }

          updatedState = {
            isPlaying: true,
            currentTrackIndex: trackIndexToPlay,
            playbackStartTime: new Date(),
          };

          // Transition: waiting -> live on first play
          if (oldStatus === 'waiting') {
            updatedState.status = 'live';
            updatedState.startedAt = new Date();
            console.log(
              `🎵 [MUSIC_CONTROL] Room ${roomId} status changing: waiting → live`
            );
          }
          break;
        }

        case 'PAUSE': {
          updatedState = { isPlaying: false };
          break;
        }

        case 'SEEK_TO': {
          if (typeof action.payload?.time === 'number') {
            const seekTimeInSeconds = action.payload.time;
            updatedState = {
              playbackStartTime: new Date(
                Date.now() - seekTimeInSeconds * 1000
              ),
            };
          } else {
            return;
          }
          break;
        }

        default:
          return;
      }

      // Apply state changes
      Object.assign(room, updatedState);
      await room.save();

      // Broadcast status change if room status changed
      const newStatus = room.status;
      if (oldStatus !== newStatus) {
        const payload = {
          roomId: room._id.toString(),
          status: newStatus,
          startedAt: room.startedAt,
        };
        io.emit('room-status-changed', payload);
        console.log(
          `📢 [MUSIC_CONTROL] ✅ Broadcasted room-status-changed globally:`,
          JSON.stringify(payload)
        );
      }

      // Broadcast playback state to all room members
      const playbackState = {
        playlist: room.playlist,
        currentTrackIndex: room.currentTrackIndex,
        isPlaying: room.isPlaying,
        playbackStartTime: room.playbackStartTime,
      };
      io.to(roomId).emit('playback-state-changed', playbackState);
    } catch (error) {
      console.error(`[MUSIC_CONTROL] Error:`, error);
    }
  });

  /**
   * Sync playback time across room
   * Broadcasts current playback time to all other members in room
   */
  socket.on('sync-time', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('time-updated', { currentTime });
  });
};

module.exports = registerMusicHandlers;
