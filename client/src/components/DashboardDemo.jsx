// src/components/DashboardDemo.jsx
import React, { useState, useEffect } from "react";
import { Row, Col, Card, Typography, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import MusicSourcesChart from "./charts/MusicSourcesChart";
import TopContributorsChart from "./charts/TopContributorsChart";
import SongsAddedChart from "./charts/SongsAddedChart";
import UserGrowthChart from "./charts/UserGrowthChart";
import StatsSummary from "./StatsSummary";

const { Title } = Typography;

// Mock data for demo
const mockData = {
  musicSources: { upload: 150, youtube: 320 },
  topContributors: [
    { username: "User1", songCount: 25 },
    { username: "User2", songCount: 18 },
    { username: "User3", songCount: 15 },
    { username: "User4", songCount: 12 },
    { username: "User5", songCount: 8 }
  ],
  songsAdded: [
    { date: "2025-10-10", count: 5 },
    { date: "2025-10-11", count: 8 },
    { date: "2025-10-12", count: 12 },
    { date: "2025-10-13", count: 6 },
    { date: "2025-10-14", count: 15 },
    { date: "2025-10-15", count: 10 },
    { date: "2025-10-16", count: 18 }
  ],
  userGrowth: [
    { month: "2025-01", userCount: 120 },
    { month: "2025-02", userCount: 145 },
    { month: "2025-03", userCount: 180 },
    { month: "2025-04", userCount: 220 },
    { month: "2025-05", userCount: 250 },
    { month: "2025-06", userCount: 290 },
    { month: "2025-07", userCount: 320 },
    { month: "2025-08", userCount: 380 },
    { month: "2025-09", userCount: 420 },
    { month: "2025-10", userCount: 470 }
  ]
};

export default function DashboardDemo() {
  const [data, setData] = useState(mockData);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => ({
        ...prevData,
        musicSources: {
          upload: prevData.musicSources.upload + Math.floor(Math.random() * 3),
          youtube: prevData.musicSources.youtube + Math.floor(Math.random() * 5)
        }
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    // Simulate data refresh
    setData({
      ...mockData,
      musicSources: {
        upload: mockData.musicSources.upload + Math.floor(Math.random() * 10),
        youtube: mockData.musicSources.youtube + Math.floor(Math.random() * 15)
      }
    });
  };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
          📊 Dashboard Demo - SoundSpace Analytics
        </Title>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={refresh}
        >
          Refresh Data
        </Button>
      </div>

      <StatsSummary
        musicSources={data.musicSources}
        topContributors={data.topContributors}
        songsAdded={data.songsAdded}
        userGrowth={data.userGrowth}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title="🎵 Tỷ Lệ Nguồn Nhạc" 
            style={{ height: "400px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <MusicSourcesChart data={data.musicSources} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="🏆 Top 5 Người Dùng Đóng Góp" 
            style={{ height: "400px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <TopContributorsChart data={data.topContributors} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="📈 Bài Hát Được Thêm Theo Thời Gian" 
            style={{ height: "400px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <SongsAddedChart data={data.songsAdded} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="👥 Tăng Trưởng Người Dùng Theo Tháng" 
            style={{ height: "400px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <UserGrowthChart data={data.userGrowth} />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <Title level={4}>💡 Hướng dẫn sử dụng:</Title>
        <ul>
          <li>Tất cả biểu đồ sẽ cập nhật real-time khi có dữ liệu mới từ server</li>
          <li>Socket events được lắng nghe: stats:music-sources-update, stats:top-contributors-update, stats:songs-added-update, stats:user-growth-update</li>
          <li>API endpoints: /admin/stats/music-sources, /admin/stats/top-contributors, /admin/stats/songs-added, /admin/stats/user-growth</li>
          <li>Biểu đồ tự động làm mới dữ liệu mỗi 5 giây (demo mode)</li>
        </ul>
      </div>
    </div>
  );
}