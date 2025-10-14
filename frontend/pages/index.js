import dynamic from "next/dynamic";
import React, { useState } from "react"; // ← useStateを追加


// SSR無効化でPlotlyを読み込む
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    // FastAPIに送信
    const res = await fetch("https://rashin.onrender.com//upload-csv", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    setData(json);
  };

  // JSONからPlotly用の配列に変換
  const plotData = data
    ? Object.keys(data).map((col) => ({
        x: data[col].map((_, i) => i),
        y: data[col],
        type: "scatter",
        mode: "lines+markers",
        name: col,
      }))
    : [];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>CSVアップロードでグラフ化</h1>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {plotData.length > 0 && (
        <Plot
          data={plotData}
          layout={{ width: 800, height: 600, title: "CSVグラフ" }}
        />
      )}
    </div>
  );
}
