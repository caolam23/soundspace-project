import React from 'react';
import {
    FaCheckCircle,
    FaRobot,
    FaLayerGroup,
    FaCog,
    FaInfoCircle
} from "react-icons/fa";

const RoomToast = ({ type, title, message }) => {
    // 🎨 Icon Mapping
    const getIcon = () => {
        switch (type) {
            case 'manual': return <FaCheckCircle size={20} color="#1DB954" />; // Spotify Green
            case 'auto': return <FaRobot size={20} color="#3B82F6" />; // Blue
            case 'batch': return <FaLayerGroup size={20} color="#8B5CF6" />; // Purple
            case 'settings': return <FaCog size={20} color="#F59E0B" />; // Amber
            default: return <FaInfoCircle size={20} color="#fff" />;
        }
    };

    // 🎨 Text Color Mapping
    const getTitleColor = () => {
        switch (type) {
            case 'manual': return "#1DB954";
            case 'auto': return "#60A5FA";
            case 'batch': return "#A78BFA";
            case 'settings': return "#FCD34D";
            default: return "#fff";
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getIcon()}
                <span style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: getTitleColor(),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {title}
                </span>
            </div>
            <div style={{
                fontSize: '13px',
                color: '#e0e0e0',
                lineHeight: '1.4',
                paddingLeft: '28px' // Align with text start
            }}>
                {message}
            </div>
        </div>
    );
};

export default RoomToast;
