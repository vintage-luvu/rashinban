import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AxisSelector from "../components/AxisSelector";
import { createScatterPlot, createLayout } from "../utils/graphUtils";
import { applyPreprocessing } from "../utils/preprocessing";

const LOG_PARAMETER_LABELS = {
  column: "列",
  method: "手法",
  median: "中央値",
  missingCount: "欠損数",
  fillValue: "補完値",
  lowerBound: "下限",
  upperBound: "上限",
  q1: "第1四分位",
  q3: "第3四分位",
  mean: "平均",
  stdDev: "標準偏差",
  derivedColumn: "生成列",
  source: "元列",
  skipped: "スキップ",
};

// SSR無効化でPlotlyを読み込む
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Home() {
  const [data, setData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryError, setAiSummaryError] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [transformationLog, setTransformationLog] = useState([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const plotRef = useRef(null);

  const plotlyModuleRef = useRef(null);
  const summarySectionRef = useRef(null);
  const previousAiSummaryLoading = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsBypassMode(false);
    const storedToken = window.localStorage.getItem("authToken") ?? "";
    const storedUsername = window.localStorage.getItem("authUsername") ?? "";

    if (storedToken) {
      setAuthToken(storedToken);
      setIsAuthenticated(true);
    }

    if (storedUsername) {
      setLoggedInUser(storedUsername);
      setLoginUsername(storedUsername);
    }
  }, []);

  const backendBaseUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.trim()
      ? process.env.NEXT_PUBLIC_BACKEND_URL.trim()
      : "http://localhost:8000"
  ).replace(/\/+$/, "");

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch(`${backendBaseUrl}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthenticated(false);
      setIsBypassMode(false);
      setAuthToken("");
      setLoggedInUser("");
      setLoginPassword("");
      setData(null);
      setOriginalData(null);
      setSuccess("");
      setError("");
      setTransformationLog([]);
      setIsTransforming(false);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("authToken");
        window.localStorage.removeItem("authUsername");
      }
    }
  };

  const handleBypassLogin = () => {
    setIsAuthenticated(true);
    setIsBypassMode(true);
    setAuthToken("");
    setLoggedInUser("ゲストユーザー");
    setLoginError("");
    setLoginPassword("");
    setData(null);
    setOriginalData(null);
    setTransformationLog([]);
    setSuccess("");
    setError("");
    setIsTransforming(false);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("authUsername");
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    if (loginLoading) {
      return;
    }

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${backendBaseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        throw new Error("認証に失敗しました。");
      }

      const result = await response.json().catch(() => null);

      if (!result || typeof result.access_token !== "string") {
        throw new Error("認証に失敗しました。");
      }

      setAuthToken(result.access_token);
      setIsAuthenticated(true);
      setIsBypassMode(false);
      setLoggedInUser(loginUsername);
      setLoginPassword("");
      setLoginError("");

      if (typeof window !== "undefined") {
        window.localStorage.setItem("authToken", result.access_token);
        window.localStorage.setItem("authUsername", loginUsername);
      }
    } catch (err) {
      console.error(err);
      setLoginError(
        "ログインに失敗しました。ユーザー名とパスワードを確認してください。"
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // CSVアップロード処理
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isAuthenticated || (!authToken && !isBypassMode)) {
      setError("ファイルをアップロードするにはログインが必要です。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Render上のFastAPIに送信
      const headers = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      } else if (isBypassMode) {
        headers["X-Bypass-Mode"] = "true";
      }

      const res = await fetch(`${backendBaseUrl}/upload-csv`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (!res.ok) {
        if (res.status === 401) {
          if (!isBypassMode) {
            await handleLogout();
            throw new Error("認証エラーが発生しました。再度ログインしてください。");
          }

          throw new Error(
            "バイパスモードでリクエストが拒否されました。時間をおいて再度お試しください。"
          );
        }

        throw new Error("サーバーエラーが発生しました。");
      }

      const json = await res.json();
      setData(json);
      setOriginalData(json);
      setTransformationLog([]);
      setIsTransforming(false);
      setSuccess("いい調子！ファイルの読み込みに成功。");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && typeof err.message === "string"
          ? err.message
          : "アップロード中に問題が発生しました。";
      setError(message);
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  const handleOneClickTransform = () => {
    if (!data) {
      setError("前処理対象のデータがありません。");
      return;
    }

    if (isTransforming) {
      return;
    }

    setIsTransforming(true);
    setError("");

    try {
      const sourceDataset =
        originalData && Object.keys(originalData).length > 0
          ? originalData
          : data;
      const { processedData, log } = applyPreprocessing(sourceDataset);

      if (!processedData || Object.keys(processedData).length === 0) {
        throw new Error("前処理を適用できる列がありませんでした。");
      }

      setData(processedData);
      setTransformationLog(log);
      setSuccess("ワンクリック変換を適用しました。");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && typeof err.message === "string"
          ? err.message
          : "前処理の適用中に問題が発生しました。";
      setError(message);
    } finally {
      setIsTransforming(false);
    }
  };

  const handleAxisChange = (axis, value) => {
    if (axis === "x") {
      setXAxis(value);
    } else {
      setYAxis(value);
    }
  };

  useEffect(() => {
    setXAxis("");
    setYAxis("");
  }, [data]);
  
  // データ列を取得
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 3 }),
    []
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    []
  );

  const columns = useMemo(() => (data ? Object.keys(data) : []), [data]);
  const hasUploadedData = columns.length > 0;
  const transformButtonDisabled = isTransforming || !hasUploadedData;
  const transformButtonLabel = isTransforming ? "処理中..." : "ワンクリック変換";
  const transformButtonClass = transformButtonDisabled
    ? "rounded-lg px-4 py-2 text-sm font-medium text-white shadow bg-emerald-300 cursor-not-allowed"
    : "rounded-lg px-4 py-2 text-sm font-medium text-white shadow bg-emerald-500 transition hover:bg-emerald-600";

  const rowCount = useMemo(() => {
    return columns.reduce((max, column) => {
      const values = Array.isArray(data?.[column]) ? data[column] : [];
      return Math.max(max, values.length);
    }, 0);
  }, [columns, data]);

  const columnSummaries = useMemo(() => {
    return columns.map((column) => {
      const rawValues = Array.isArray(data?.[column]) ? data[column] : [];
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
  }, [columns, data]);

  const totalValidValues = useMemo(
    () =>
      columnSummaries.reduce(
        (sum, summary) => sum + summary.count - summary.missing,
        0
      ),
    [columnSummaries]
  );

  const missingSummaries = useMemo(
    () =>
      columns.map((column) => {
        const rawValues = Array.isArray(data?.[column]) ? data[column] : [];
        const total = rawValues.length;
        const missing = rawValues.filter(
          (value) =>
            value === null ||
            value === undefined ||
            value === "" ||
            (typeof value === "number" && Number.isNaN(value))
        ).length;

        return {
          name: column,
          total,
          missing,
          rate: total === 0 ? 0 : missing / total,
        };
      }),
    [columns, data]
  );

  const previewRows = useMemo(() => {
    return Array.from({ length: Math.min(rowCount, 10) }, (_, index) => {
      const row = { index: index + 1 };
      columns.forEach((column) => {
        const rawValues = Array.isArray(data?.[column]) ? data[column] : [];
        const value = rawValues[index];
        row[column] =
          value === null || value === undefined || value === ""
            ? "―"
            : value;
      });
      return row;
    });
  }, [rowCount, columns, data]);

  // Plotlyデータ変換
  const numericColumns = useMemo(() => {
    const canCoerceToNumber = (value) => {
      if (typeof value === "number") {
        return Number.isFinite(value);
      }

      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed);
      }

      return false;
    };

    return columns.filter((column) => {
      const rawValues = Array.isArray(data?.[column]) ? data[column] : [];
      return rawValues.some((value) => canCoerceToNumber(value));
    });
  }, [columns, data]);

  const plotData = useMemo(
    () => createScatterPlot(data, xAxis, yAxis),
    [data, xAxis, yAxis]
  );

  const plotLayout = useMemo(
    () => (xAxis && yAxis ? createLayout(xAxis, yAxis) : null),
    [xAxis, yAxis]
  );

  const canRenderPlot = plotLayout && plotData.length > 0;

  const datasetSummaryInput = useMemo(() => {
    if (!hasUploadedData) {
      return null;
    }

    return {
      columns,
      rowCount,
      columnSummaries,
      missingSummaries,
      previewRows,
      totalValidValues,
    };
  }, [
    hasUploadedData,
    columns,
    rowCount,
    columnSummaries,
    missingSummaries,
    previewRows,
    totalValidValues,
  ]);

  useEffect(() => {
    if (!datasetSummaryInput) {
      setAiSummary("");
      setAiSummaryError("");
      setAiSummaryLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchSummary = async () => {
      setAiSummary("");
      setAiSummaryError("");
      setAiSummaryLoading(true);

      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            columns: datasetSummaryInput.columns,
            rowCount: datasetSummaryInput.rowCount,
            columnSummaries: datasetSummaryInput.columnSummaries,
            missingSummaries: datasetSummaryInput.missingSummaries,
            previewRows: datasetSummaryInput.previewRows.slice(0, 5),
            totalValidValues: datasetSummaryInput.totalValidValues,
          }),
          signal: controller.signal,
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            result && typeof result.message === "string"
              ? result.message
              : "AI要約の生成に失敗しました。";
          throw new Error(message);
        }

        if (
          result &&
          typeof result.summary === "string" &&
          result.summary.trim().length > 0
        ) {
          setAiSummary(result.summary.trim());
        } else {
          setAiSummaryError("AI要約を取得できませんでした。");
        }
      } catch (err) {
        const isAbortError =
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          err.name === "AbortError";

        if (isAbortError) {
          return;
        }

        console.error(err);
        const fallbackMessage =
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
            ? err.message
            : "AI要約の生成に失敗しました。";
        setAiSummaryError(fallbackMessage);
      } finally {
        setAiSummaryLoading(false);
      }
    };

    fetchSummary();

    return () => {
      controller.abort();
    };
  }, [datasetSummaryInput]);

  useEffect(() => {
    if (
      hasUploadedData &&
      !aiSummaryLoading &&
      previousAiSummaryLoading.current &&
      summarySectionRef.current
    ) {
      summarySectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    previousAiSummaryLoading.current = aiSummaryLoading;
  }, [aiSummaryLoading, hasUploadedData]);

  const formatNumber = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "―";
    }

    return numberFormatter.format(value);
  };
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

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-orb login-orb--left" aria-hidden />
        <div className="login-orb login-orb--right" aria-hidden />
        <div className="login-container">
          <section className="login-hero">
            <span className="login-badge">ようこそ</span>
            <h1 className="login-title">羅針盤にログイン</h1>
            <p className="login-description">
              また会いました。
              ログインして、新たな発見を始めよう。
            </p>
          </section>
          <form className="login-card" onSubmit={handleLoginSubmit}>
            <div className="form-field">
              <label htmlFor="username" className="form-label">
                ユーザー名
              </label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  autoComplete="username"
                  className="login-input"
                  placeholder="ユーザー名を入力"
                  required
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="password" className="form-label">
                パスワード
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                  className="login-input"
                  placeholder="パスワードを入力"
                  required
                />
              </div>
            </div>
            {loginError && (
              <p className="form-error" role="alert">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className={`login-button ${loginLoading ? "is-loading" : ""}`}
            >
              {loginLoading ? "航路を確認中..." : "ログイン"}
            </button>
            <button
              type="button"
              className="login-button login-button--secondary"
              onClick={handleBypassLogin}
            >
              一時的にログインをスキップ
            </button>
            <p className="login-support">
              サポートが必要な場合は、システム管理者までお問い合わせください。
            </p>
            <p className="login-support text-xs">
              ※ このボタンは暫定対応です。正式なログイン手段が復旧したら削除します。
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isBypassMode && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          一時的なログインスキップモードで利用中です。すべての機能を利用できますが、取り扱いにはご注意ください。
        </div>
      )}
      <div className="flex w-full max-w-6xl items-center justify-end gap-4 self-end">
        <p className="text-sm text-gray-600">
          ログイン中:
          <span className="ml-1 font-medium text-gray-900">
            {loggedInUser || "ユーザー"}
          </span>
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-transparent bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
        >
          ログアウト
        </button>
      </div>
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
          href="https://leg-nagasaki-kickoff.my.canva.site/rashin"
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
        {success && <p className="success-message">{success}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>

      {/* データサマリー */}
      {hasUploadedData && (
        <section
          className="mt-8 w-full max-w-4xl space-y-6 rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur animate-fadeIn"
          style={{ animationDelay: "2s", animationFillMode: "forwards" }}
          ref={summarySectionRef}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              データサマリー
            </h2>
            <span className="text-sm text-slate-500">
              {columns.length > 0
                ? `${rowCount.toLocaleString("ja-JP")}行 × ${columns
                    .length
                    .toLocaleString("ja-JP")}列`
                : "列が見つかりません"}
            </span>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                AI要約
              </h3>
              {aiSummaryLoading ? (
                <p className="mt-2 text-sm text-indigo-700">
                  🧠 要約を生成しています...
                </p>
              ) : aiSummaryError ? (
                <p className="mt-2 text-sm text-rose-600">{aiSummaryError}</p>
              ) : aiSummary ? (
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {aiSummary}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  要約を表示する準備が整うとここに表示されます。
                </p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    前処理（ワンクリック）
                  </h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    欠損補完・外れ値カット・標準化・派生列生成を自動で実行します。
                  </p>
                </div>
                <button
                  onClick={handleOneClickTransform}
                  disabled={transformButtonDisabled}
                  className={transformButtonClass}
                >
                  {transformButtonLabel}
                </button>
              </div>
              <div className="mt-3 rounded-lg border border-emerald-100 bg-white/70 p-3">
                {transformationLog.length > 0 ? (
                  <ol className="space-y-2 text-sm text-emerald-800">
                    {transformationLog.map((entry, index) => (
                      <li
                        key={`${entry.step}-${index}`}
                        className="rounded-md bg-emerald-50/80 p-2"
                      >
                        <p className="font-semibold">
                          {index + 1}. {entry.step}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                          {entry.description}
                        </p>
                        {entry.parameters && (
                          <dl className="mt-1 grid gap-x-4 gap-y-1 text-[11px] text-emerald-600 sm:grid-cols-2">
                            {Object.entries(entry.parameters).map(([key, value]) => (
                              <div
                                key={`${entry.step}-${key}-${index}`}
                                className="flex items-baseline gap-1"
                              >
                                <dt className="font-semibold">
                                  {LOG_PARAMETER_LABELS[key] ?? key}
                                </dt>
                                <dd className="truncate">
                                  {typeof value === "number" && Number.isFinite(value)
                                    ? numberFormatter.format(value)
                                    : typeof value === "boolean"
                                    ? value
                                      ? "はい"
                                      : "いいえ"
                                    : value === null || value === undefined
                                    ? "―"
                                    : String(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-emerald-700">
                    {isTransforming
                      ? "前処理を実行しています..."
                      : "まだ前処理は実行されていません。ボタンを押して自動整形を行えます。"}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  行数
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {columns.length > 0
                    ? rowCount.toLocaleString("ja-JP")
                    : "―"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  列数
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {columns.length.toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  有効データ数
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {numberFormatter.format(totalValidValues)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* グラフ表示 */}
      {hasUploadedData && (
        <section
          className="mt-8 w-full max-w-4xl space-y-4 rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur animate-fadeIn"
          style={{ animationDelay: "2.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">グラフ表示</h2>
            <span className="text-sm text-slate-500">
              任意のX軸・Y軸を選択すると散布図を生成します
            </span>
          </div>

          {numericColumns.length >= 2 ? (
            <>
              <AxisSelector
                columns={numericColumns}
                xAxis={xAxis}
                yAxis={yAxis}
                onAxisChange={handleAxisChange}
              />

              {!xAxis || !yAxis ? (
                <p className="text-sm text-slate-500">
                  X軸とY軸を選択すると散布図がここに表示されます。
                </p>
              ) : canRenderPlot ? (
                <div
                  className="chart-wrapper animate-fadeIn"
                  style={{ animationDelay: "2.8s", animationFillMode: "forwards" }}
                >
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
                    layout={plotLayout}
                    config={{ responsive: true, displaylogo: false }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              ) : (
                <p className="text-sm text-rose-600">
                  選択した列に有効な数値データが見つかりませんでした。
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              散布図を作成するには数値データを含む列が2つ以上必要です。
            </p>
          )}
        </section>
      )}

      {/* 詳しく見る */}
      {hasUploadedData && (
        <section
          className="mt-8 w-full max-w-4xl space-y-6 rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur animate-fadeIn"
          style={{ animationDelay: "2.5s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">詳しく見る</h2>
            <span className="text-sm text-slate-500">
              列ごとの詳細情報やプレビューを確認できます
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                列情報
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {columns.length > 0 ? (
                  columns.map((column) => (
                    <span
                      key={column}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                    >
                      {column}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    列が見つかりませんでした。
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                欠損値
              </h3>
              {missingSummaries.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">列名</th>
                        <th className="px-3 py-2">欠損値</th>
                        <th className="px-3 py-2">割合</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/60">
                      {missingSummaries.map((summary) => (
                        <tr key={summary.name}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {summary.name}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {summary.missing.toLocaleString("ja-JP")} / {summary.total.toLocaleString("ja-JP")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {percentFormatter.format(summary.rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  欠損値を計算できる列がありません。
                </p>
              )}
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

            {previewRows.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  先頭10件プレビュー
                </h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        {columns.map((column) => (
                          <th key={column} className="px-3 py-2">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/60">
                      {previewRows.map((row) => (
                        <tr key={row.index}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {row.index}
                          </td>
                          {columns.map((column) => (
                            <td key={column} className="px-3 py-2 text-slate-700">
                              {row[column]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}


    </div>
  );
}
