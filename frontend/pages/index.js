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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-4xl font-bold text-indigo-600 mb-6">📊 CSV可視化アプリ</h1>

      <div className="bg-white p-6 rounded-2xl shadow-md w-96 text-center">
        <p className="text-gray-600 mb-4">CSVファイルをアップロードしてグラフを表示します</p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-50 file:text-indigo-600
                     hover:file:bg-indigo-100"
        />

        {loading && <p className="text-blue-500 mt-4">📡 分析中...</p>}
      </div>

      {plotData.length > 0 && (
        <div className="mt-10">
          <Plot
            data={plotData}
            layout={{
              width: 800,
              height: 500,
              title: "CSVグラフ",
              paper_bgcolor: "#f9fafb",
            }}
          />
        </div>
      )}
    </div>
  );
}
