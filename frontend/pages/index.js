import dynamic from "next/dynamic";
import React, { useState } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload-csv`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("サーバーエラーが発生しました。");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("⚠️ アップロード中に問題が発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const plotData = data
    ? Object.keys(data).map((col) => ({
        x: data[col].map((_, i) => i + 1),
        y: data[col],
        type: "scatter",
        mode: "lines+markers",
        name: col,
        line: { width: 2 },
        marker: { size: 6 },
      }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col items-center py-10 px-4">
      <h1 className="text-5xl font-extrabold text-indigo-700 mb-6 text-center tracking-tight">
        羅針盤 📊
      </h1>
      <p className="text-gray-600 text-center mb-10 max-w-lg">
        データをドラッグ＆ドロップするだけで、瞬時にグラフを作成できます。
        <br />
        直感的に使える、AI時代のデータ分析ツールです。
      </p>

      {/* アップロードエリア */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-8 text-center hover:shadow-lg transition-all">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-indigo-300 rounded-xl py-10 hover:bg-indigo-50 transition"
        >
          <svg
            className="w-12 h-12 text-indigo-400 mb-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16V4m0 0l4 4m-4-4L3 8m14 12h4m0 0h-4m4 0V8a2 2 0 00-2-2h-6l-2-2H7a2 2 0 00-2 2v8"
            />
          </svg>
          <p className="text-indigo-600 font-medium">ここにCSVをドラッグ</p>
          <p className="text-gray-400 text-sm mt-1">またはクリックして選択</p>
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {fileName && (
          <p className="text-sm text-gray-600 mt-3">
            📁 選択中: <span className="font-semibold">{fileName}</span>
          </p>
        )}

        {loading && (
          <div className="text-blue-500 mt-4 animate-pulse">
            🚀 AIが分析中です...
          </div>
        )}
        {error && <p className="text-red-500 mt-3">{error}</p>}
      </div>

      {/* グラフエリア */}
      {plotData.length > 0 && (
        <div className="mt-12 bg-white p-6 rounded-2xl shadow-lg max-w-5xl w-full">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
            📈 自動生成されたグラフ
          </h2>
          <Plot
            data={plotData}
            layout={{
              width: 900,
              height: 500,
              title: "CSVデータ可視化",
              paper_bgcolor: "#fff",
              plot_bgcolor: "#fff",
              font: { color: "#333" },
            }}
          />
        </div>
      )}

      {/* フッター */}
      <footer className="mt-16 text-gray-400 text-sm">
        © 2025 Kopernik | Powered by FastAPI × Next.js × Plotly
      </footer>
    </div>
  );
}
