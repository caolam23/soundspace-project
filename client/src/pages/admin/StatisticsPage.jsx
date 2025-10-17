// src/pages/admin/StatisticsPage.jsx
import React, { useState, useEffect } from "react";
import { 
  Row, 
  Col, 
  Card, 
  Typography, 
  Spin, 
  Alert, 
  Button, 
  Select, 
  Space,
  message 
} from "antd";
import { ReloadOutlined, CalendarOutlined, BarChartOutlined } from "@ant-design/icons";
import "./StatisticsPage.css";
import socket from "../../services/socket";
import api from "../../services/api";
import MusicSourcesChart from "../../components/charts/MusicSourcesChart";
import TopContributorsChart from "../../components/charts/TopContributorsChart";
import SongsAddedChart from "../../components/charts/SongsAddedChart";
import UserGrowthChart from "../../components/charts/UserGrowthChart";
import StatsSummary from "../../components/StatsSummary";

const { Title } = Typography;
const { Option } = Select;

// Time range options
const TIME_RANGES = [
  { value: '1d', label: '1 ngày', icon: '📅' },
  { value: '7d', label: '7 ngày', icon: '📊' },
  { value: '1m', label: '1 tháng', icon: '📈' },
  { value: 'all', label: 'Toàn thời gian', icon: '🌐' }
];

export default function StatisticsPage() {
  // State management
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // Default 7 days
  
  console.log("🎯 StatisticsPage COMPONENT RENDERED - loading:", loading);
  const [musicSources, setMusicSources] = useState({ upload: 0, youtube: 0 });
  const [topContributors, setTopContributors] = useState([]);
  const [songsAdded, setSongsAdded] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [totalVisits, setTotalVisits] = useState({ all: 0, '1d': 0, '7d': 0, '1m': 0 });
  const [error, setError] = useState(null);

  // Load statistics data based on time range
  const loadStatisticsData = async (range = timeRange) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading statistics for range: ${range}`);
      
      // Define API endpoints with range parameter
      const endpoints = [
        { 
          key: 'musicSources', 
          url: `/admin/stats/music-sources?range=${range}`, 
          setter: setMusicSources,
          default: { upload: 0, youtube: 0 }
        },
        { 
          key: 'topContributors', 
          url: `/admin/stats/top-contributors?range=${range}`, 
          setter: setTopContributors,
          default: []
        },
        { 
          key: 'songsAdded', 
          url: `/admin/stats/songs-added?range=${range}`, 
          setter: setSongsAdded,
          default: []
        },
        { 
          key: 'userGrowth', 
          url: `/admin/stats/user-growth?range=${range}`, 
          setter: setUserGrowth,
          default: []
        }
      ];

      // Load all statistics with Promise.allSettled for error resilience
      const results = await Promise.allSettled(
        endpoints.map(endpoint => api.get(endpoint.url))
      );

      let hasError = false;
      results.forEach((result, index) => {
        const endpoint = endpoints[index];
        
        if (result.status === 'fulfilled') {
          let data = result.value.data;
          
          // Apply specific processing for each data type
          if (endpoint.key === 'topContributors') {
            data = Array.isArray(data) ? data.slice(0, 5) : []; // Top 5 only
          } else if (endpoint.key === 'musicSources') {
            // Ensure music sources has proper structure
            data = {
              upload: data?.upload || 0,
              youtube: data?.youtube || 0,
              spotify: data?.spotify || 0,
              soundcloud: data?.soundcloud || 0
            };
          }
          
          endpoint.setter(data);
          console.log(`✅ Loaded ${endpoint.key}:`, data);
        } else {
          console.error(`❌ Failed to load ${endpoint.key}:`, result.reason);
          endpoint.setter(endpoint.default);
          hasError = true;
        }
      });

      // Load total visits for all ranges
      const visitRanges = ['all', '1d', '7d', '1m'];
      const visitResults = await Promise.all(
        visitRanges.map(r => api.get(`/admin/stats/total-visits?range=${r}`))
      );
      const visitsObj = {};
      visitRanges.forEach((r, i) => {
        visitsObj[r] = visitResults[i].data.totalVisits || 0;
      });
      setTotalVisits(visitsObj);

      if (hasError) {
        message.warning('Một số dữ liệu không thể tải được');
      } else {
        message.success(`Đã tải thống kê cho ${TIME_RANGES.find(r => r.value === range)?.label}`);
      }

    } catch (error) {
      console.error("Error loading statistics data:", error);
      setError("Không thể tải dữ liệu thống kê");
      message.error("Lỗi tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (newRange) => {
    console.log(`Time range changed from ${timeRange} to ${newRange}`);
    setTimeRange(newRange);
    loadStatisticsData(newRange);
  };

  // Manual refresh
  const handleRefresh = () => {
    message.loading('Đang làm mới dữ liệu...', 1);
    loadStatisticsData();
  };

  // Setup component and socket listeners
  useEffect(() => {
    console.log("🚀 useEffect STARTED");
    
    try {
      // Load initial data
      loadStatisticsData();

      // ✅ DEBUG: Check socket connection status
      console.log("🔌 Socket connection status:", {
        connected: socket.connected,
        id: socket.id,
        timeRange: timeRange
      });
    } catch (err) {
      console.error("❌ Error in useEffect setup:", err);
    }

    // Socket event listeners for real-time updates
    const handleMusicSourcesUpdate = (payload) => {
      // Handle both old format (direct data) and new format (with range)
      let data, range;
      if (payload.data && payload.range) {
        // New format with range
        data = payload.data;
        range = payload.range;
      } else {
        // Old format - direct data
        data = payload;
        range = timeRange; // Use current timeRange
      }
      
      // Only update if range matches current selection
      if (range === timeRange) {
        console.log("🔄 Music sources real-time update:", { data, range, currentRange: timeRange });
        const newMusicSources = {
          ...data,
          upload: data?.upload || 0,
          youtube: data?.youtube || 0,
          spotify: data?.spotify || 0,
          soundcloud: data?.soundcloud || 0
        };
        console.log("🔄 New musicSources state:", newMusicSources);
        setMusicSources(newMusicSources);
        message.success('🎵 Thống kê nguồn nhạc đã cập nhật!', 2);
      } else {
        console.log("⏭️ Skipping music sources update - range mismatch:", { 
          eventRange: range, 
          currentRange: timeRange 
        });
      }
    };

    const handleTopContributorsUpdate = (payload) => {
      let data, range;
      if (payload.data && payload.range) {
        data = payload.data;
        range = payload.range;
      } else {
        data = payload;
        range = timeRange;
      }
      
      if (range === timeRange) {
        console.log("🔄 Top contributors real-time update:", { data, range, currentRange: timeRange });
        setTopContributors(Array.isArray(data) ? data.slice(0, 5) : []);
        message.success('🏆 Thống kê người đóng góp đã cập nhật!', 2);
      }
    };

    const handleSongsAddedUpdate = (payload) => {
      let data, range;
      if (payload.data && payload.range) {
        data = payload.data;
        range = payload.range;
      } else {
        data = payload;
        range = timeRange;
      }
      
      if (range === timeRange) {
        console.log("🔄 Songs added real-time update:", { data, range, currentRange: timeRange });
        setSongsAdded(Array.isArray(data) ? data : []);
        message.success('📈 Thống kê bài hát đã cập nhật!', 2);
      }
    };

    const handleUserGrowthUpdate = (payload) => {
      let data, range;
      if (payload.data && payload.range) {
        data = payload.data;
        range = payload.range;
      } else {
        data = payload;
        range = timeRange;
      }
      
      if (range === timeRange) {
        console.log("🔥 USER GROWTH REAL-TIME UPDATE RECEIVED:", {
          data, 
          range, 
          currentRange: timeRange,
          dataLength: Array.isArray(data) ? data.length : 0,
          timestamp: new Date().toLocaleTimeString()
        });
        setUserGrowth(Array.isArray(data) ? data : []);
        message.success('👥 Thống kê người dùng đã được cập nhật!', 2);
      } else {
        console.log("⏭️ Skipping user growth update - range mismatch:", { 
          eventRange: range, 
          currentRange: timeRange 
        });
      }
    };

    // Lắng nghe realtime total visits
    const handleTotalVisitsUpdate = (payload) => {
      const { totalVisits: count, range } = payload;
      setTotalVisits(prev => ({ ...prev, [range]: count }));
    };

    // Register socket listeners
    socket.on("stats:music-sources-update", handleMusicSourcesUpdate);
    socket.on("stats:top-contributors-update", handleTopContributorsUpdate);
    socket.on("stats:songs-added-update", handleSongsAddedUpdate);
    socket.on("stats:user-growth-update", handleUserGrowthUpdate);
    socket.on('stats:total-visits-update', handleTotalVisitsUpdate);

    console.log("✅ Socket listeners registered for timeRange:", timeRange);

    // Cleanup listeners on unmount
    return () => {
      socket.off("stats:music-sources-update", handleMusicSourcesUpdate);
      socket.off("stats:top-contributors-update", handleTopContributorsUpdate);
      socket.off("stats:songs-added-update", handleSongsAddedUpdate);
      socket.off("stats:user-growth-update", handleUserGrowthUpdate);
      socket.off('stats:total-visits-update', handleTotalVisitsUpdate);
      console.log("🧹 Socket listeners cleaned up");
    };
  }, [timeRange]); // CRITICAL FIX: Add timeRange dependency to re-register listeners when it changes

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p className="loading-text">Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="statistics-container">
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
              Thử lại
            </Button>
          }
          closable
        />
      </div>
    );
  }

  return (
    <div className="statistics-container">
      {/* Header with title and time range filter */}
      <div className="statistics-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large" align="center">
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                📊
              </div>
              <div>
                <Title level={2} className="statistics-title" style={{ marginBottom: 0 }}>
                  Thống Kê Real-time
                </Title>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
                  Theo dõi hiệu suất và hoạt động của hệ thống
                </p>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Select
                value={timeRange}
                onChange={handleTimeRangeChange}
                style={{ 
                  width: 180,
                  borderRadius: '8px'
                }}
                size="large"
                suffixIcon={<CalendarOutlined style={{ color: '#667eea' }} />}
              >
                {TIME_RANGES.map(range => (
                  <Option key={range.value} value={range.value}>
                    <Space>
                      <span style={{ fontSize: '16px' }}>{range.icon}</span>
                      <span style={{ fontWeight: 500 }}>{range.label}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                size="large"
                style={{
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontWeight: 500
                }}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
      
      {/* Statistics Summary */}
      <StatsSummary
        musicSources={musicSources}
        topContributors={topContributors}
        songsAdded={songsAdded}
        userGrowth={userGrowth}
        timeRange={timeRange}
        totalVisits={totalVisits}
      />
      
      {/* Charts Grid */}
      <Row gutter={[16, 16]}>
        {/* Chart 1: Music Sources Distribution */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <span>🎵</span>
                <span>Tỷ Lệ Nguồn Nhạc</span>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  ({TIME_RANGES.find(r => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <MusicSourcesChart data={musicSources} />
          </Card>
        </Col>

        {/* Chart 2: Top Contributors */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <span>🏆</span>
                <span>Top 5 Người Dùng Đóng Góp</span>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  ({TIME_RANGES.find(r => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <TopContributorsChart data={topContributors} />
          </Card>
        </Col>

        {/* Chart 3: Songs Added Over Time */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <span>📈</span>
                <span>Bài Hát Được Thêm Theo Thời Gian</span>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  ({TIME_RANGES.find(r => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <SongsAddedChart data={songsAdded} />
          </Card>
        </Col>

        {/* Chart 4: User Growth */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <span>👥</span>
                <span>Tăng Trưởng Người Dùng Theo Tháng</span>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  ({TIME_RANGES.find(r => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <UserGrowthChart data={userGrowth} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}