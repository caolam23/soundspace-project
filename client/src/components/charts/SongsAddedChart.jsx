// src/components/charts/SongsAddedChart.jsx
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

const SongsAddedChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
        />
        <YAxis />
        <Tooltip 
          formatter={(value) => [value, "Số bài hát"]}
          labelFormatter={(label) => `Ngày: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke="#8884d8" 
          strokeWidth={2}
          name="Bài hát mới"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SongsAddedChart;