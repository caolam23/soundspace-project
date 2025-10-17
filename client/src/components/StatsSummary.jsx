// src/components/StatsSummary.jsx
import React from "react";
import { Row, Col, Statistic, Card } from "antd";
import { 
  UserOutlined, 
  CustomerServiceOutlined, 
  UploadOutlined, 
  YoutubeOutlined, 
  BarChartOutlined 
} from "@ant-design/icons";

const StatsSummary = ({ 
  musicSources, 
  topContributors, 
  songsAdded, 
  userGrowth,
  timeRange,
  totalVisits
}) => {
  // Map timeRange to Vietnamese labels
  const timeRangeLabels = {
    '1d': 'hôm nay',
    '7d': '7 ngày qua',
    '1m': '1 tháng qua',
    'all': 'tất cả thời gian'
  };
  const totalSongs = (musicSources.upload || 0) + (musicSources.youtube || 0) + 
                      (musicSources.spotify || 0) + (musicSources.soundcloud || 0);
  
  // Get latest user count from user growth data (real-time updated)
  const totalUsers = userGrowth.length > 0 ? 
    Math.max(...userGrowth.map(item => item.userCount || 0)) : 0;
  
  const recentSongs = songsAdded.length > 0 ? 
    songsAdded.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
  const activeContributors = topContributors.length;
  const currentPeriod = timeRangeLabels[timeRange] || 'khoảng thời gian này';

  return (
    <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
      {/* Tổng số lượt truy cập */}
      <Col xs={24} sm={12} md={6}>
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #5C7CFA 0%, #4C6EF5 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(92, 124, 250, 0.25)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '14px', fontWeight: 500 }}>
              {timeRange === 'all' ? 'Tổng lượt truy cập' : `Lượt truy cập ${currentPeriod}`}
            </span>}
            value={totalVisits?.[timeRange] || 0}
            prefix={<BarChartOutlined style={{ fontSize: '24px', color: '#fff' }} />}
            valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #868F96 0%, #596164 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(134, 143, 150, 0.25)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '14px', fontWeight: 500 }}>
              {timeRange === 'all' ? 'Tổng số bài hát' : `Bài hát ${currentPeriod}`}
            </span>}
            value={timeRange === 'all' ? totalSongs : recentSongs}
            prefix={
              <div style={{ display: 'inline-block', animation: 'spin 3s linear infinite' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="3" fill="#fff"/>
                  <circle cx="12" cy="12" r="6" stroke="#fff" strokeWidth="1" fill="none" opacity="0.5"/>
                </svg>
              </div>
            }
            valueStyle={{ color: "#fff", fontSize: '32px', fontWeight: 'bold' }}
          />
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '14px', fontWeight: 500 }}>
              Tổng người dùng mới
            </span>}
            value={totalUsers}
            prefix={<UserOutlined style={{ fontSize: '24px', color: '#fff' }} />}
            valueStyle={{ color: "#fff", fontSize: '32px', fontWeight: 'bold' }}
            suffix={<span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              {timeRange !== 'all' ? ` (${currentPeriod})` : ''}
            </span>}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(52, 211, 153, 0.25)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          bodyStyle={{ padding: '20px 24px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Statistic
                title={<span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Upload {currentPeriod}</span>}
                value={musicSources.upload || 0}
                prefix={<UploadOutlined style={{ fontSize: '22px', color: '#fff' }} />}
                valueStyle={{ color: "#fff", fontSize: '28px', fontWeight: 'bold' }}
              />
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.3)', margin: '0 12px' }} />
              <Statistic
                title={<span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>YouTube {currentPeriod}</span>}
                value={musicSources.youtube || 0}
                prefix={<YoutubeOutlined style={{ fontSize: '22px', color: '#fff' }} />}
                valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
              />
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default StatsSummary;