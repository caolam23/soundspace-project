import React, { useState, useEffect } from 'react';

const TimeAgo = ({ timestamp }) => {
    const [timeString, setTimeString] = useState('');

    useEffect(() => {
        const updateTime = () => {
            if (!timestamp) {
                setTimeString('Vừa xong');
                return;
            }

            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                setTimeString('Vừa xong');
                return;
            }

            const seconds = Math.floor((new Date() - date) / 1000);

            if (seconds < 60) {
                setTimeString('Vừa xong');
            } else {
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) {
                    setTimeString(`${minutes}p trước`);
                } else {
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) {
                        setTimeString(`${hours}h trước`);
                    } else {
                        const days = Math.floor(hours / 24);
                        setTimeString(`${days} ngày trước`);
                    }
                }
            }
        };

        // Update immediately
        updateTime();

        // Update every 60 seconds
        const intervalId = setInterval(updateTime, 60000);

        return () => clearInterval(intervalId);
    }, [timestamp]);

    return <span>{timeString}</span>;
};

export default TimeAgo;
