// client/src/components/Stage/StageGrid.jsx
// Responsive multi-user stage grid
import React from 'react';
import StageVideo from './StageVideo';
import styles from './StageGrid.module.css';

function getGridClass(count) {
  if (count === 1) return styles.grid1;
  if (count === 2) return styles.grid2;
  if (count <= 4) return styles.grid4;
  return styles.gridMany;
}

export default function StageGrid({ stageUsers, currentUserId, isHost, onKick }) {
  if (!stageUsers || stageUsers.length === 0) return null;

  const gridClass = getGridClass(stageUsers.length);

  return (
    <div className={styles.stageWrapper}>
      <div className={styles.liveBadge}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
        LIVE
      </div>

      <div className={`${styles.grid} ${gridClass}`}>
        {stageUsers.map((user) => (
          <StageVideo
            key={String(user.userId)}
            user={user}
            isLocal={String(user.userId) === String(currentUserId)}
            isHost={isHost}
            onKick={() => onKick && onKick(String(user.userId))}
          />
        ))}
      </div>
    </div>
  );
}
