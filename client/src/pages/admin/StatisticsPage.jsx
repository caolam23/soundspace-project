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
import {
  RefreshCw,
  CalendarDays,
  BarChart3,
  Music2,
  Users2,
  LineChart,
  Crown,
  Globe
} from "lucide-react";
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

// Time range options (modern icon style)
const TIME_RANGES = [
  { value: "1d", label: "1 ngày", icon: <CalendarDays size={16} /> },
  { value: "7d", label: "7 ngày", icon: <BarChart3 size={16} /> },
  { value: "1m", label: "1 tháng", icon: <LineChart size={16} /> },
  { value: "all", label: "Toàn thời gian", icon: <Globe size={16} /> },
];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [musicSources, setMusicSources] = useState({ upload: 0, youtube: 0 });
  const [topContributors, setTopContributors] = useState([]);
  const [songsAdded, setSongsAdded] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [totalVisits, setTotalVisits] = useState({
    all: 0,
    "1d": 0,
    "7d": 0,
    "1m": 0,
  });
  const [error, setError] = useState(null);

  // Load statistics
  const loadStatisticsData = async (range = timeRange) => {
    try {
      setLoading(true);
      setError(null);

      const endpoints = [
        {
          key: "musicSources",
          url: `/admin/stats/music-sources?range=${range}`,
          setter: setMusicSources,
          default: { upload: 0, youtube: 0 },
        },
        {
          key: "topContributors",
          url: `/admin/stats/top-contributors?range=${range}`,
          setter: setTopContributors,
          default: [],
        },
        {
          key: "songsAdded",
          url: `/admin/stats/songs-added?range=${range}`,
          setter: setSongsAdded,
          default: [],
        },
        {
          key: "userGrowth",
          url: `/admin/stats/user-growth?range=${range}`,
          setter: setUserGrowth,
          default: [],
        },
      ];

      const results = await Promise.allSettled(
        endpoints.map((endpoint) => api.get(endpoint.url))
      );

      let hasError = false;
      results.forEach((result, index) => {
        const endpoint = endpoints[index];
        if (result.status === "fulfilled") {
          let data = result.value.data;
          if (endpoint.key === "topContributors") {
            data = Array.isArray(data) ? data.slice(0, 5) : [];
          } else if (endpoint.key === "musicSources") {
            data = {
              upload: data?.upload || 0,
              youtube: data?.youtube || 0,
              spotify: data?.spotify || 0,
              soundcloud: data?.soundcloud || 0,
            };
          }
          endpoint.setter(data);
        } else {
          endpoint.setter(endpoint.default);
          hasError = true;
        }
      });

      const visitRanges = ["all", "1d", "7d", "1m"];
      const visitResults = await Promise.all(
        visitRanges.map((r) => api.get(`/admin/stats/total-visits?range=${r}`))
      );
      const visitsObj = {};
      visitRanges.forEach((r, i) => {
        visitsObj[r] = visitResults[i].data.totalVisits || 0;
      });
      setTotalVisits(visitsObj);

      if (hasError) message.warning("Một số dữ liệu không thể tải được");
      else
        message.success(
          `Đã tải thống kê cho ${TIME_RANGES.find((r) => r.value === range)?.label}`
        );
    } catch (err) {
      console.error("Error loading statistics:", err);
      setError("Không thể tải dữ liệu thống kê");
      message.error("Lỗi tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
    loadStatisticsData(newRange);
  };

  const handleRefresh = () => {
    message.loading("Đang làm mới dữ liệu...", 1);
    loadStatisticsData();
  };

  useEffect(() => {
    loadStatisticsData();

    const handleMusicSourcesUpdate = (payload) => {
      const data = payload.data || payload;
      const range = payload.range || timeRange;
      if (range === timeRange) {
        setMusicSources({
          upload: data?.upload || 0,
          youtube: data?.youtube || 0,
          spotify: data?.spotify || 0,
          soundcloud: data?.soundcloud || 0,
        });
        message.success("🎵 Nguồn nhạc đã cập nhật!", 2);
      }
    };

    const handleTopContributorsUpdate = (payload) => {
      const data = payload.data || payload;
      const range = payload.range || timeRange;
      if (range === timeRange) {
        setTopContributors(Array.isArray(data) ? data.slice(0, 5) : []);
        message.success("🏆 Top người dùng đã cập nhật!", 2);
      }
    };

    const handleSongsAddedUpdate = (payload) => {
      const data = payload.data || payload;
      const range = payload.range || timeRange;
      if (range === timeRange) {
        setSongsAdded(Array.isArray(data) ? data : []);
        message.success("📈 Bài hát đã cập nhật!", 2);
      }
    };

    const handleUserGrowthUpdate = (payload) => {
      const data = payload.userGrowth || payload.data || payload;
      const range = payload.range || timeRange;
      if (range === timeRange) {
        setUserGrowth(Array.isArray(data) ? data : []);
        message.success("👥 Người dùng đã cập nhật!", 2);
      }
    };

    const handleTotalVisitsUpdate = (payload) => {
      const { totalVisits: count, range } = payload;
      setTotalVisits((prev) => ({ ...prev, [range]: count }));
      message.success(`📊 Lượt truy cập (${range}) đã cập nhật: ${count}`, 2);
    };

    socket.on("stats:music-sources-update", handleMusicSourcesUpdate);
    socket.on("stats:top-contributors-update", handleTopContributorsUpdate);
    socket.on("stats:songs-added-update", handleSongsAddedUpdate);
    socket.on("stats:user-growth-update", handleUserGrowthUpdate);
    socket.on("stats:total-visits-update", handleTotalVisitsUpdate);

    return () => {
      socket.off("stats:music-sources-update", handleMusicSourcesUpdate);
      socket.off("stats:top-contributors-update", handleTopContributorsUpdate);
      socket.off("stats:songs-added-update", handleSongsAddedUpdate);
      socket.off("stats:user-growth-update", handleUserGrowthUpdate);
      socket.off("stats:total-visits-update", handleTotalVisitsUpdate);
    };
  }, [timeRange]);

  if (loading)
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p className="loading-text">Đang tải dữ liệu thống kê...</p>
      </div>
    );

  if (error)
    return (
      <div className="statistics-container">
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          action={
            <Button size="small" icon={<RefreshCw size={16} />} onClick={handleRefresh}>
              Thử lại
            </Button>
          }
          closable
        />
      </div>
    );

  return (
    <div className="statistics-container">
      {/* Header */}
      <div className="statistics-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large" align="center">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 size={26} color="#fff" />
              </div>
              <div>
                <Title level={2} className="statistics-title" style={{ marginBottom: 0 }}>
                  Thống Kê Real-time
                </Title>
                <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, fontSize: "14px" }}>
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
                  borderRadius: "8px",
                }}
                size="large"
                suffixIcon={<CalendarDays style={{ color: "#667eea" }} size={18} />}
              >
                {TIME_RANGES.map((range) => (
                  <Option key={range.value} value={range.value}>
                    <Space>
                      {range.icon}
                      <span style={{ fontWeight: 500 }}>{range.label}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
              <Button
                icon={<RefreshCw size={18} />}
                onClick={handleRefresh}
                size="large"
                style={{
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  fontWeight: 500,
                }}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Summary */}
      <StatsSummary
        musicSources={musicSources}
        topContributors={topContributors}
        songsAdded={songsAdded}
        userGrowth={userGrowth}
        timeRange={timeRange}
        totalVisits={totalVisits}
      />

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Music2 size={18} />
                <span>Tỷ Lệ Nguồn Nhạc</span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  ({TIME_RANGES.find((r) => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <MusicSourcesChart data={musicSources} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Crown size={18} />
                <span>Top 5 Người Dùng Đóng Góp</span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  ({TIME_RANGES.find((r) => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <TopContributorsChart data={topContributors} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <LineChart size={18} />
                <span>Bài Hát Được Thêm Theo Thời Gian</span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  ({TIME_RANGES.find((r) => r.value === timeRange)?.label})
                </span>
              </Space>
            }
            className="stat-card"
            style={{ height: "400px" }}
          >
            <SongsAddedChart data={songsAdded} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Users2 size={18} />
                <span>Tăng Trưởng Người Dùng Theo Tháng</span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  ({TIME_RANGES.find((r) => r.value === timeRange)?.label})
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
