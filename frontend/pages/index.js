import dynamic from "next/dynamic";
import React from "react";

// SSR無効化でPlotlyを読み込む
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const data = [
    { x: [1, 2, 3], y: [2, 6, 3], type: "scatter", mode: "lines+markers", marker: { color: "red" } },
  ];

  const layout = { width: 600, height: 400, title: "A Fancy Plot" };

  return (
    <div>
      <h1>サンプルグラフ</h1>
      <Plot data={data} layout={layout} />
    </div>
  );
}
