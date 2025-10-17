// src/components/charts/UserGrowthChart.jsx
import React from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

const UserGrowthChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
        />
        <YAxis />
        <Tooltip 
          formatter={(value) => [value, "Số người dùng"]}
          labelFormatter={(label) => `Tháng: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="userCount" 
          stroke="#00C49F" 
          strokeWidth={2}
          name="Tổng người dùng"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default UserGrowthChart;