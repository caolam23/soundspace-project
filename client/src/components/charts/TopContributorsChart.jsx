// src/components/charts/TopContributorsChart.jsx
import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const TopContributorsChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="username" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis />
        <Tooltip 
          formatter={(value) => [value, "Số bài hát"]}
          labelFormatter={(label) => `Người dùng: ${label}`}
        />
        <Bar dataKey="songCount" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopContributorsChart;