// src/App.jsx
import React, { useEffect } from 'react';
import socket from './services/socket';

function App() {
  useEffect(() => {
    // Kết nối thủ công tới server
    socket.connect();

    function onConnect() {
      console.log(`Connected to server with id: ${socket.id}`);
    }

    function onDisconnect() {
      console.log("Disconnected from server");
    }

    // Lắng nghe các sự kiện
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Cleanup function: ngắt kết nối khi component bị unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <h1>Welcome to SoundSpace!</h1>
      <p>Check the console for socket connection status.</p>
    </div>
  );
}

export default App;