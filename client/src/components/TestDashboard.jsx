// src/components/TestDashboard.jsx - Minimal test component
import React from "react";
import { Card, Row, Col } from "antd";
import MusicSourcesChart from "./charts/MusicSourcesChart";

const TestDashboard = () => {
  const testData = {
    upload: 100,
    youtube: 200
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Test Dashboard Components</h2>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Test Music Sources Chart">
            <MusicSourcesChart data={testData} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TestDashboard;