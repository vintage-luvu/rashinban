"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult("");
  };

  const handleAnalyze = async () => {
    if (!file) return alert("CSVファイルを選択してください");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("http://localhost:8000/api/analyze_csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data.analysis);
    } catch (err) {
      setResult("エラーが発生しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">羅針盤 - AI経営分析</h1>

      <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />

      <button
        onClick={handleAnalyze}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        AI分析を実行
      </button>

      {loading && (
        <div className="mt-4">
          <p>分析中...しばらくお待ちください</p>
          <progress className="w-full" />
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h2 className="font-bold mb-2">分析結果</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
