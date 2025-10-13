import dynamic from "next/dynamic";
import React from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  return (
    <div>
      <h1>サンプルグラフ</h1>
      <Plot
        data={[
          { x: [1, 2, 3], y: [2, 6, 3], type: "scatter", mode: "lines+markers", marker: { color: "red" } },
        ]}
        layout={{ width: 600, height: 400, title: "A Fancy Plot" }}
      />
    </div>
  );
}
