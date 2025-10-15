import dynamic from "next/dynamic";
import React, { useMemo, useRef, useState } from "react";
import AxisSelector from "../components/AxisSelector";
import { createScatterPlot, createLayout } from "../utils/graphUtils";

// SSR無効化でPlotlyを読み込む
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const plotRef = useRef(null);

  const plotlyModuleRef = useRef(null);

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
  const hasUploadedData = data !== null;
  const rowCount = numericColumns.reduce((max, column) => {
    const values = data[column];
    if (!Array.isArray(values)) {
      return max;
    }
    return Math.max(max, values.length);
  }, 0);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 3 }),
    []
  );

  const columnSummaries = numericColumns.map((column) => {
    const rawValues = Array.isArray(data[column]) ? data[column] : [];
    const numericValues = rawValues.filter(
      (value) => typeof value === "number" && Number.isFinite(value)
    );
    if (numericValues.length === 0) {
      return {
        name: column,
        count: rawValues.length,
        missing: rawValues.length,
        min: null,
        max: null,
        mean: null,
        median: null,
      };
    }

    const sorted = [...numericValues].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean =
      numericValues.reduce((accumulator, value) => accumulator + value, 0) /
      numericValues.length;
    const middleIndex = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[middleIndex - 1] + sorted[middleIndex]) / 2
        : sorted[middleIndex];

    return {
      name: column,
      count: rawValues.length,
      missing: rawValues.length - numericValues.length,
      min,
      max,
      mean,
      median,
    };
  });

  const totalNumericValues = columnSummaries.reduce(
    (sum, summary) => sum + summary.count - summary.missing,
    0
  );

  const formatNumber = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "―";
    }

    return numberFormatter.format(value);
  };
  // Plotlyデータ変換
  const plotData = numericColumns.length > 0
    ? numericColumns.map((col) => ({
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
    const gd = plotRef.current?.el; // react-plotly のグラフDOM
    if (!gd) return;
    if (!plotlyModuleRef.current) {
      const plotlyModule = await import("plotly.js-dist-min");
      plotlyModuleRef.current = plotlyModule.default ?? plotlyModule;
    }

    await plotlyModuleRef.current.downloadImage(gd, {
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
      {/* ★ 公式サイトリンク（タイトル直下） */}
      <div className="mt-2">
        <a
          href="https://leg-nagasaki-kickoff.my.canva.site/rashin"      // ← 公式URLに差し替え
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          aria-label="公式サイトを新しいタブで開く"
        >
          詳細を学ぶ <span aria-hidden>↗</span>
        </a>
      </div> 

      <p
        className="hero-subtitle animate-fadeIn"
        style={{ animationDelay: "1s", animationFillMode: "forwards" }}
      >
        羅針盤は、誰でも超簡単に使える一流データアナリストです。
        <br />
        <span>
          もっと知りたいですか？
        </span>
      </p>



      {/* アップロードUI */}
      <div
        className="upload-card animate-fadeIn"
        style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}
      >
        <p className="upload-instruction">
          CSVファイルをアップロードで自動分析
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

      {/* データサマリー */}
      {hasUploadedData && (
        <section
          className="mt-8 w-full max-w-4xl space-y-6 rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur animate-fadeIn"
          style={{ animationDelay: "2s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              データサマリー
            </h2>
            <span className="text-sm text-slate-500">
              {numericColumns.length > 0
                ? `${rowCount.toLocaleString("ja-JP")}行 × ${numericColumns
                    .length
                    .toLocaleString("ja-JP")}列`
                : "数値列が見つかりません"}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  行数
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {numericColumns.length > 0
                    ? rowCount.toLocaleString("ja-JP")
                    : "―"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  列数
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {numericColumns.length.toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  有効データ数
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {numberFormatter.format(totalNumericValues)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                列情報
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {numericColumns.length > 0 ? (
                  numericColumns.map((column) => (
                    <span
                      key={column}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                    >
                      {column}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    数値列が見つかりませんでした。
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                数値統計
              </h3>
              {columnSummaries.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">列名</th>
                        <th className="px-3 py-2">件数</th>
                        <th className="px-3 py-2">欠損値</th>
                        <th className="px-3 py-2">最小値</th>
                        <th className="px-3 py-2">中央値</th>
                        <th className="px-3 py-2">平均値</th>
                        <th className="px-3 py-2">最大値</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/60">
                      {columnSummaries.map((summary) => (
                        <tr key={summary.name}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {summary.name}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {summary.count.toLocaleString("ja-JP")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {summary.missing.toLocaleString("ja-JP")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatNumber(summary.min)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatNumber(summary.median)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatNumber(summary.mean)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatNumber(summary.max)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  数値統計を計算できる列がありません。
                </p>
              )}
            </div>
          </div>
        </section>
      )}

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
