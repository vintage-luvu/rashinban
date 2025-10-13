import { useState } from "react";
import dynamic from "next/dynamic";
import 'tailwindcss/tailwind.css';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function Home() {
  const [aiResult, setAiResult] = useState("");
  const [data, setData] = useState([
    { name: "商品A", value: 30 },
    { name: "商品B", value: 50 },
    { name: "商品C", value: 20 },
  ]);

  const runAnalysis = () => {
    // 本来はAPIでAI分析を呼ぶ
    setAiResult("✅ 会社全体は健全。特に売上向上が期待できる部門は商品Bです。");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold text-center text-gradient mb-6">
        羅針盤データ分析
      </h1>

      <div className="text-center mb-4">
        <button
          className="bg-gradient-to-r from-pink-500 to-yellow-400 text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition"
          onClick={runAnalysis}
        >
          AI分析を実行
        </button>
      </div>

      {aiResult && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-2">🧠 AI分析結果</h2>
          <p>{aiResult}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">📊 データ可視化</h2>
        <Plot
          data={[
            {
              x: data.map(d => d.name),
              y: data.map(d => d.value),
              type: 'bar',
              marker: { color: 'orange' },
            }
          ]}
          layout={{ width: 600, height: 400, title: '売上比較' }}
        />
      </div>
    </div>
  );
}

