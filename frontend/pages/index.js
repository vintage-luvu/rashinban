import dynamic from "next/dynamic";
import React, { useState } from "react"; // ← useStateを追加


// SSR無効化でPlotlyを読み込む
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // CSVアップロード処理
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Render上のFastAPIに送信！
      const res = await fetch("https://rashin.onrender.com/upload-csv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("サーバーエラーが発生しました。");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("アップロード中に問題が発生しました。");
    } finally {
      setLoading(false);
    }
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
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>📊 CSVアップロードでグラフ化</h1>
      <p>数値データを含むCSVをアップロードしてみよう！</p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ margin: "1rem" }}
      />

      {loading && <p>読み込み中です...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {plotData.length > 0 && (
        <Plot
          data={plotData}
          layout={{
            width: 800,
            height: 600,
            title: "アップロードしたCSVのグラフ",
          }}
        />
      )}
    </div>
  );
});
}
