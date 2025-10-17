import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Line } from "react-chartjs-2";

const socket = io("http://localhost:3000");

export default function AdminLiveStats() {
  const [stats, setStats] = useState({ totalRooms: 0, rooms: [] });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    socket.on("updateLiveStats", (data) => {
      setStats(data);
      setChartData((prev) => [
        ...prev.slice(-20),
        { time: new Date().toLocaleTimeString(), count: data.totalRooms },
      ]);
    });

    return () => socket.off("updateLiveStats");
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">📊 Thống kê phòng Live Realtime</h2>
      <p>Tổng số phòng đang hoạt động: {stats.totalRooms}</p>

      <Line
        data={{
          labels: chartData.map((c) => c.time),
          datasets: [
            {
              label: "Số phòng live",
              data: chartData.map((c) => c.count),
            },
          ],
        }}
      />

      {stats.rooms.map((room) => (
        <div key={room.id} className="mt-4 border p-2 rounded">
          <h3 className="font-semibold">Phòng: {room.id}</h3>
          <p>Số người: {room.userCount}</p>
          <ul>
            {room.users.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
