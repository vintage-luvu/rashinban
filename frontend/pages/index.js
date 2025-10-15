import dynamic from "next/dynamic";
import React, { useRef, useState } from "react";
import AxisSelector from '../components/AxisSelector';
import { createScatterPlot, createLayout } from '../utils/graphUtils';
import Plotly from 'plotly.js-dist-min';

// SSR無効化でPlotlyを読み込む
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const plotRef = useRef<any>(null); 

  <div className="h-6 w-full bg-red-500" />

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

  const handleAxisChange = (axis, value) => {
    if (axis === 'x') {
        setXAxis(value);
    } else {
      setYAxis(value);
    }
  };
  

  // 数値列のみを取得
  const numericColumns = data ? Object.keys(data) : [];
  // Plotlyデータ変換
  const plotData = data
    ? Object.keys(data).map((col) => ({
        x: data[col].map((_, i) => i),
        y: data[col],
        type: "scatter",
        mode: "lines+markers",
        name: col,
        marker: {
          size: 6,
        },
        line: {
          width: 3,
        },
      }))
    : [];

    // ★ 画像保存（PNG）ボタン用ハンドラ
  const handleDownloadPng = async () => {
    const gd = (plotRef.current as any)?.el; // react-plotly のグラフDOM
    if (!gd) return;
    await Plotly.downloadImage(gd, {
      format: "png",
      height: 800,
      width: 1200,
      filename: "chart",
    });
  };

  return (
    <div className="app-container">
      {/* タイトル部分 */}
      <h1
        className="hero-title animate-fadeIn"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
        羅針盤 
      </h1>

      <p
        className="hero-subtitle"
        style={{ animationDelay: "1s", animationFillMode: "forwards" }}
      >
        データをドラッグ＆ドロップするだけで、瞬時にグラフを作成できます。
        <br />
        <span>
          直感的に使える、AI時代のデータ分析ツールです。
        </span>
      </p>

      {/* アップロードUI */}
      <div
        className="upload-card animate-fadeIn"
        style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}
      >
        <p className="upload-instruction">
          CSVファイルをアップロードしてください
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="file-input"
        />

        {loading && (
          <p className="loading-message">📡 分析中...</p>
        )}
        {error && <p className="error-message">{error}</p>}
      </div>

      {/* グラフ表示 */}
      {plotData.length > 0 && (
        <div
          className="chart-wrapper animate-fadeIn"
          style={{ animationDelay: "2.5s", animationFillMode: "forwards" }}
        >
          {/* ★ 画像保存ボタン */}
          <div className="mb-2 flex justify-end">
            <button
              onClick={handleDownloadPng}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              画像として保存（PNG）
            </button>
          </div>

          <Plot
            ref={plotRef}
            data={plotData}
            layout={{
              autosize: true,
              title: "📈 アップロードしたCSVの可視化結果",
              paper_bgcolor: "rgba(248, 250, 252, 0.85)",
              plot_bgcolor: "rgba(248, 250, 252, 0.85)",
              font: {
                family: "'Noto Sans JP', 'Inter', system-ui",
              },
              margin: { l: 50, r: 30, t: 80, b: 50 },
            }}
            config={{ responsive: true, displaylogo: false }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
    </div>
  );
}
