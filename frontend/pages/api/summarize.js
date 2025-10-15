import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const buildSanitizedSummaries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      name: entry.name,
      count: typeof entry.count === "number" ? entry.count : 0,
      missing: typeof entry.missing === "number" ? entry.missing : 0,
      min:
        typeof entry.min === "number" && Number.isFinite(entry.min)
          ? entry.min
          : null,
      median:
        typeof entry.median === "number" && Number.isFinite(entry.median)
          ? entry.median
          : null,
      mean:
        typeof entry.mean === "number" && Number.isFinite(entry.mean)
          ? entry.mean
          : null,
      max:
        typeof entry.max === "number" && Number.isFinite(entry.max)
          ? entry.max
          : null,
    }));
};

const buildSanitizedMissingSummaries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      name: entry.name,
      total: typeof entry.total === "number" ? entry.total : 0,
      missing: typeof entry.missing === "number" ? entry.missing : 0,
      rate:
        typeof entry.rate === "number" && Number.isFinite(entry.rate)
          ? entry.rate
          : 0,
    }));
};

const buildSanitizedPreviewRows = (rows) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row) => typeof row === "object" && row !== null)
    .map((row) => ({
      index: row.index,
      values: Object.entries(row).reduce((accumulator, [key, value]) => {
        if (key === "index") {
          return accumulator;
        }

        accumulator[key] =
          typeof value === "string" || typeof value === "number"
            ? value
            : value === null || value === undefined
            ? null
            : String(value);
        return accumulator;
      }, {}),
    }));
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: "OpenAI APIキーが設定されていません。" });
    return;
  }

  const {
    columns,
    rowCount,
    columnSummaries,
    missingSummaries,
    previewRows,
    totalValidValues,
  } = req.body ?? {};

  const sanitizedColumns = Array.isArray(columns)
    ? columns.filter((column) => typeof column === "string")
    : [];

  const payload = {
    columns: sanitizedColumns,
    rowCount: typeof rowCount === "number" ? rowCount : 0,
    totalValidValues:
      typeof totalValidValues === "number" ? totalValidValues : 0,
    numericSummaries: buildSanitizedSummaries(columnSummaries),
    missingSummaries: buildSanitizedMissingSummaries(missingSummaries),
    previewRows: buildSanitizedPreviewRows(previewRows),
  };

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are an expert data analyst who writes concise Japanese summaries of datasets. Highlight notable statistics, data quality issues, and suggested next steps.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `次のJSONはアップロードされたCSVデータセットの集計情報です。日本語で3〜4行程度の箇条書きにまとめ、特徴的な値・欠損傾向・次に行うと良い分析を簡潔に述べてください。\n\n${JSON.stringify(
                payload,
                null,
                2
              )}`,
            },
          ],
        },
      ],
    });

    const summary = (response.output_text ?? "").trim();

    if (!summary) {
      res.status(200).json({ summary: "" });
      return;
    }

    res.status(200).json({ summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI要約の生成に失敗しました。" });
  }
}
