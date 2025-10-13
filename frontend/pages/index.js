import { useEffect, useState } from "react";
import Plot from "react-plotly.js";

export default function Home() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // FastAPIからデータを取得
  useEffect(() => {
    fetch("https://your-backend-url.onrender.com/data") // FastAPIのエンドポイント
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>データを読み込み中…</p>;

  // データ例: [{x:1, y:2}, {x:2, y:3}, ...]
  const xValues = data.map((d) => d.x);
  const yValues = data.map((d) => d.y);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>FastAPIから取得したデータのグラフ</h1>
      <Plot
        data={[
          {
            x: xValues,
            y: yValues,
            type: "scatter",
            mode: "lines+markers",
            marker: { color: "blue" },
          },
        ]}
        layout={{ width: 800, height: 500, title: "Sample Plot" }}
      />
    </div>
  );
}
