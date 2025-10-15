import dynamic from "next/dynamic";
import React, { useState } from "react";
import AxisSelector from '../components/AxisSelector';
import { createScatterPlot, createLayout } from '../utils/graphUtils';

// PlotlyはSSR不可
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null); // { [colName]: number[] | string[] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // 可視化設定
  const [chartType, setChartType] = useState('line'); // 'line' | 'scatter' | 'bar' | 'hist'
  const [xAxis, setXAxis] = useState(''); // 列名 or '__index__'
  const [yAxis, setYAxis] = useState('');

  const dropRef = useRef(null);

  // --- サンプルデータ（オフラインでも体験可） ---
  const loadSample = () => {
    // 小さな Titanic 風データ
    const sample = {
      Age: [22, 38, 26, 35, 35, 54, 2, 27, 14, 4],
      Fare: [7.25, 71.2833, 7.925, 53.1, 8.05, 51.8625, 21.075, 11.1333, 30.0708, 16.7],
      Pclass: [3, 1, 3, 1, 3, 1, 3, 3, 2, 3],
      Survived: [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
    };
    setData(sample);
    setFileName('sample_titanic.csv');
    setError('');
    // 軸の初期値
    setXAxis('Age');
    setYAxis('Fare');
  };

  // --- ファイルアップロード（Drag & Drop + クリック選択） ---
  const handleFileChange = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('サーバーエラーが発生しました。');
      const json = await res.json();

      // 想定: { colA: [...], colB: [...] }
      setData(json);
      setError('');

      // 初期軸（数値列を優先）
      const cols = Object.keys(json || {});
      const numeric = cols.filter((c) => isNumericArray(json[c]));
      setXAxis(numeric[0] || cols[0] || '__index__');
      setYAxis(numeric[1] || numeric[0] || '__index__');
    } catch (err) {
      console.error(err);
      setError('アップロード中に問題が発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e) => handleFileChange(e.target.files?.[0]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      handleFileChange(file);
      if (dropRef.current) dropRef.current.classList.remove('ring-2', 'ring-blue-500');
    },
    []
  );

  const onDragOver = (e) => {
    e.preventDefault();
    if (dropRef.current) dropRef.current.classList.add('ring-2', 'ring-blue-500');
  };
  const onDragLeave = () => {
    if (dropRef.current) dropRef.current.classList.remove('ring-2', 'ring-blue-500');
  };

  // --- 列情報 ---
  const columns = useMemo(() => (data ? Object.keys(data) : []), [data]);
  const numericColumns = useMemo(
    () => (data ? columns.filter((c) => isNumericArray(data[c])) : []),
    [columns, data]
  );

  // --- 簡易サマリ（選択列だけ） ---
  const stats = useMemo(() => {
    if (!data) return null;
    const make = (arr) => {
      const v = (arr || []).map((x) => toNum(x)).filter((x) => Number.isFinite(x));
      if (!v.length) return null;
      const sum = v.reduce((a, b) => a + b, 0);
      const mean = sum / v.length;
      const min = Math.min(...v);
      const max = Math.max(...v);
      return { count: v.length, mean, min, max };
    };
    return {
      x: xAxis && data[xAxis] ? make(data[xAxis]) : null,
      y: yAxis && data[yAxis] ? make(data[yAxis]) : null,
    };
  }, [data, xAxis, yAxis]);

  // --- Plotly データ ---
  const plotData = useMemo(() => {
    if (!data) return [];

    // 軸が両方選択されていれば 1 トレースで可視化
    if (xAxis && yAxis && data[xAxis] && data[yAxis]) {
      const xVals = normalizeSeries(data[xAxis]);
      const yVals = normalizeSeries(data[yAxis]);
      const base = {
        x: xVals,
        y: yVals,
        marker: { size: 8 },
        line: { width: 2 },
        name: `${yAxis} vs ${xAxis}`,
      };
      if (chartType === 'scatter') return [{ type: 'scatter', mode: 'markers', ...base }];
      if (chartType === 'bar') return [{ type: 'bar', ...base }];
      if (chartType === 'hist') return [{ type: 'histogram', x: xVals, name: xAxis }];
      return [{ type: 'scatter', mode: 'lines+markers', ...base }]; // line
    }

    // 軸未指定: すべての数値列を index に対して折れ線で可視化
    const numeric = numericColumns;
    return numeric.map((col) => ({
      x: data[col].map((_, i) => i),
      y: normalizeSeries(data[col]),
      type: 'scatter',
      mode: 'lines+markers',
      name: col,
      marker: { size: 6 },
      line: { width: 2 },
    }));
  }, [data, xAxis, yAxis, chartType, numericColumns]);

  const layout = useMemo(
    () => ({
      autosize: true,
      title: fileName ? `📈 可視化: ${fileName}` : '📈 可視化',
      paper_bgcolor: 'rgba(248,250,252,0.9)',
      plot_bgcolor: 'rgba(255,255,255,1)',
      margin: { l: 56, r: 24, t: 64, b: 56 },
      font: { family: "'Inter', 'Noto Sans JP', system-ui", size: 14 },
      xaxis: { title: xAxis || 'index' },
      yaxis: { title: yAxis || '(auto)' },
    }),
    [fileName, xAxis, yAxis]
  );

  const resetAll = () => {
    setData(null);
    setFileName('');
    setError('');
    setXAxis('');
    setYAxis('');
    setChartType('line');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">羅針盤 <span className="text-slate-400 text-sm">Simple Analytics</span></h1>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-100"
              onClick={loadSample}
            >
              サンプルを読み込む
            </button>
            <button
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-100"
              onClick={resetAll}
            >
              クリア
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ステップ1: アップロード */}
        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-6 text-center shadow-sm transition-all hover:bg-slate-50"
          >
            <p className="text-sm text-slate-600">CSV をドラッグ＆ドロップ、または</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700">
              ファイルを選択
              <input type="file" accept=".csv" className="hidden" onChange={onInputChange} />
            </label>
            {fileName && (
              <p className="mt-3 text-xs text-slate-500">選択中: {fileName}</p>
            )}
            {loading && (
              <p role="status" className="mt-3 animate-pulse text-sm text-slate-500">📡 アップロード＆解析中…</p>
            )}
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* 概要カード */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">概要</h2>
            <ul className="text-sm text-slate-600">
              <li>1. CSV をアップロード</li>
              <li>2. 軸とグラフ種類を選択</li>
              <li>3. すぐに可視化・ダウンロード</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {['line', 'scatter', 'bar', 'hist'].map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    chartType === t ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
                  }`}
                  aria-pressed={chartType === t}
                >
                  {labelForType(t)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ステップ2: 設定 */}
        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">軸の選択</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <LabeledSelect
                label="X 軸"
                value={xAxis}
                onChange={setXAxis}
                options={[{ label: 'index', value: '__index__' }, ...columns.map((c) => ({ label: c, value: c }))]}
              />
              <LabeledSelect
                label="Y 軸"
                value={yAxis}
                onChange={setYAxis}
                options={columns.map((c) => ({ label: c, value: c }))}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">※ ヒストグラムは X 軸のみ使用します。</p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">列プレビュー</h2>
            {!data && <p className="text-sm text-slate-500">アップロードすると列名が表示されます。</p>}
            {data && (
              <div className="flex flex-wrap gap-2">
                {columns.map((c) => (
                  <span
                    key={c}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                      numericColumns.includes(c) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 text-slate-600'
                    }`}
                    title={numericColumns.includes(c) ? '数値列' : '非数値列'}
                  >
                    {c}
                    {numericColumns.includes(c) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ステップ3: グラフ */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">グラフ</h2>
            <div className="flex items-center gap-2">
              {stats?.x && (
                <Badge> X: n={stats.x.count} / μ={fmt(stats.x.mean)} / min={fmt(stats.x.min)} / max={fmt(stats.x.max)} </Badge>
              )}
              {stats?.y && (
                <Badge> Y: n={stats.y.count} / μ={fmt(stats.y.mean)} / min={fmt(stats.y.min)} / max={fmt(stats.y.max)} </Badge>
              )}
            </div>
          </div>

          {data ? (
            <div className="h-[440px] w-full">
              <Plot
                data={plotData}
                layout={layout}
                config={{ responsive: true, displaylogo: false }}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-500">
        <p>ドラッグ＆ドロップ、軸選択、ワンクリックでグラフ化。だれでも使える分析ツール。</p>
      </footer>
    </div>
  );
}

// ========== 小さな UI ヘルパー ==========
function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        className="rounded-xl border bg-white px-3 py-2 outline-none transition hover:border-slate-300 focus:border-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">（未選択）</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-slate-700">{children}</span>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[260px] w-full flex-col items-center justify-center text-center text-slate-500">
      <div className="mb-2 text-3xl">🗂️</div>
      <p className="text-sm">CSV をアップロードするか、上部の「サンプルを読み込む」を押してください。</p>
    </div>
  );
}

// ========== 数値判定・整形 ==========
function toNum(x) {
  const n = typeof x === 'number' ? x : parseFloat(String(x).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
}
function isNumericArray(arr) {
  if (!Array.isArray(arr)) return false;
  let cnt = 0;
  for (let i = 0; i < arr.length; i++) {
    const n = toNum(arr[i]);
    if (Number.isFinite(n)) cnt++;
  }
  // 70%以上が数値なら数値列とみなす（欠損が多少あっても OK）
  return arr.length > 0 && cnt / arr.length >= 0.7;
}
function normalizeSeries(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((v, i) => {
    if (v == null || v === '') return NaN;
    const n = toNum(v);
    return Number.isFinite(n) ? n : i; // 数値じゃない場合は index を入れて崩れを防ぐ
  });
}
function fmt(n) {
  return typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(2)) : '-';
}

function labelForType(t) {
  switch (t) {
    case 'line':
      return '折れ線';
    case 'scatter':
      return '散布図';
    case 'bar':
      return '棒グラフ';
    case 'hist':
      return 'ヒストグラム';
    default:
      return t;
  }
}
