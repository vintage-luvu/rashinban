import dynamic from "next/dynamic";
import React, { useState } from "react";

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
      // Render上のFastAPIに送信
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload-csv`, {
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

  // Plotlyデータ変換
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col items-center justify-center py-10 px-4">
      {/* タイトル部分 */}
      <h1
        className="text-6xl sm:text-7xl font-extrabold text-center mb-6 
        bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-400 
        bg-clip-text text-transparent opacity-0 animate-fadeIn drop-shadow-lg"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
        羅針盤 📊
      </h1>

      <p
        className="text-gray-600 text-center mb-10 max-w-2xl text-lg leading-relaxed opacity-0 animate-fadeIn"
        style={{ animationDelay: "1s", animationFillMode: "forwards" }}
      >
        データをドラッグ＆ドロップするだけで、瞬時にグラフを作成できます。
        <br />
        <span className="font-semibold text-indigo-500">
          直感的に使える、AI時代のデータ分析ツールです。
        </span>
      </p>

      {/* アップロードUI */}
      <div className="bg-white p-8 rounded-3xl shadow-xl w-96 text-center transform transition hover:scale-105 opacity-0 animate-fadeIn"
        style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
        <p className="text-gray-600 mb-4 font-medium">
          CSVファイルをアップロードしてください
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-50 file:text-indigo-600
                     hover:file:bg-indigo-100 cursor-pointer"
        />

        {loading && <p className="text-blue-500 mt-4 animate-pulse">📡 分析中...</p>}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      {/* グラフ表示 */}
      {plotData.length > 0 && (
        <div className="mt-12 opacity-0 animate-fadeIn"
          style={{ animationDelay: "2.5s", animationFillMode: "forwards" }}>
          <Plot
            data={plotData}
            layout={{
              width: 800,
              height: 500,
              title: "📈 アップロードしたCSVの可視化結果",
              paper_bgcolor: "#f9fafb",
              plot_bgcolor: "#f9fafb",
            }}
          />
        </div>
      )}
    </div>
  );
}
