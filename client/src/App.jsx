// src/App.jsx
//App
import React from "react";
import { useSocket } from "./contexts/SocketContext";

function App() {
  const socket = useSocket();

  return (
    <div className="App">
      <h1>Welcome to SoundSpace!</h1>
      <p>Check the console for socket connection status.</p>
      <p>Socket ID: {socket?.id || "Chưa kết nối"}</p>
    </div>
  );
}

export default App;
