const isMissingValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "number") {
    return !Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
};

const toNumeric = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const formatNumber = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "―";
  }

  return Number(value.toFixed(4));
};

const median = (values) => {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

const quantile = (sortedValues, q) => {
  if (!sortedValues.length) {
    return null;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const remainder = position - base;

  if (sortedValues[base + 1] !== undefined) {
    return (
      sortedValues[base] +
      remainder * (sortedValues[base + 1] - sortedValues[base])
    );
  }

  return sortedValues[base];
};

const computeQuartiles = (values) => {
  if (!values.length) {
    return { q1: null, q3: null };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  return { q1, q3 };
};

const mean = (values) => {
  if (!values.length) {
    return null;
  }

  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return sum / values.length;
};

const standardDeviation = (values, average) => {
  if (!values.length) {
    return null;
  }

  const squaredDiff = values.map((value) => {
    const diff = value - average;
    return diff * diff;
  });

  const variance =
    squaredDiff.reduce((accumulator, value) => accumulator + value, 0) /
    values.length;

  return Math.sqrt(variance);
};

export const applyPreprocessing = (dataset) => {
  if (!dataset || typeof dataset !== "object") {
    throw new Error("前処理を実行するデータが見つかりませんでした。");
  }

  const columnNames = Object.keys(dataset);
  if (!columnNames.length) {
    return { processedData: {}, log: [] };
  }

  const rowCount = columnNames.reduce((max, column) => {
    const values = Array.isArray(dataset[column]) ? dataset[column] : [];
    return Math.max(max, values.length);
  }, 0);

  const processedData = {};
  const log = [];

  columnNames.forEach((column) => {
    const rawValues = Array.isArray(dataset[column]) ? dataset[column] : [];
    const alignedValues = Array.from({ length: rowCount }, (_, index) =>
      index < rawValues.length ? rawValues[index] : null
    );

    const missingMask = alignedValues.map((value) => isMissingValue(value));
    const numericCandidates = alignedValues.map((value) => toNumeric(value));
    const numericValues = numericCandidates.filter(
      (value) => typeof value === "number"
    );

    const missingCount = missingMask.filter(Boolean).length;

    if (!numericValues.length) {
      const filledValues = alignedValues.map((value) =>
        isMissingValue(value) ? "欠損" : value
      );
      processedData[column] = filledValues;

      const indicatorColumn = `${column}_was_missing`;
      processedData[indicatorColumn] = missingMask.map((flag) => (flag ? 1 : 0));

      log.push({
        step: "欠損値補完",
        description:
          missingCount > 0
            ? `${column}: 欠損${missingCount}件を"欠損"で埋めました。`
            : `${column}: 欠損は検出されませんでした。補完は実行されません。`,
        parameters: {
          column,
          method: "fill_constant",
          fillValue: "欠損",
          missingCount,
        },
      });

      log.push({
        step: "列生成",
        description: `${indicatorColumn}: 欠損フラグ列を生成しました。`,
        parameters: {
          derivedColumn: indicatorColumn,
          source: column,
          method: "missing_indicator",
          missingCount,
        },
      });

      return;
    }

    const columnMedian = median(numericValues);
    const filledNumeric = numericCandidates.map((value) =>
      value === null ? columnMedian : value
    );

    log.push({
      step: "欠損値補完",
      description:
        missingCount > 0
          ? `${column}: 中央値${formatNumber(
              columnMedian
            )}で欠損${missingCount}件を補完しました。`
          : `${column}: 欠損は検出されませんでした（中央値${formatNumber(
              columnMedian
            )}）。`,
      parameters: {
        column,
        method: "median",
        median: columnMedian,
        missingCount,
      },
    });

    const { q1, q3 } = computeQuartiles(filledNumeric);
    const iqr = q3 !== null && q1 !== null ? q3 - q1 : null;
    const lowerBound =
      q1 === null || q3 === null
        ? null
        : q1 - 1.5 * (iqr ?? 0);
    const upperBound =
      q1 === null || q3 === null
        ? null
        : q3 + 1.5 * (iqr ?? 0);

    const clippedNumeric = filledNumeric.map((value) => {
      if (lowerBound === null || upperBound === null) {
        return value;
      }
      return Math.min(Math.max(value, lowerBound), upperBound);
    });

    if (lowerBound !== null && upperBound !== null) {
      log.push({
        step: "外れ値カット",
        description: `${column}: 四分位範囲に基づき${formatNumber(
          lowerBound
        )}〜${formatNumber(upperBound)}にクリップしました。`,
        parameters: {
          column,
          method: "iqr_clip",
          lowerBound,
          upperBound,
          q1,
          q3,
        },
      });
    } else {
      log.push({
        step: "外れ値カット",
        description: `${column}: 四分位数を計算できなかったためクリップ処理をスキップしました。`,
        parameters: {
          column,
          method: "iqr_clip",
          skipped: true,
        },
      });
    }

    const average = mean(clippedNumeric);
    const stdDev =
      typeof average === "number"
        ? standardDeviation(clippedNumeric, average)
        : null;

    const standardized =
      typeof stdDev === "number" && stdDev !== 0
        ? clippedNumeric.map((value) => (value - average) / stdDev)
        : clippedNumeric.map(() => 0);

    if (typeof average === "number" && typeof stdDev === "number" && stdDev !== 0) {
      log.push({
        step: "標準化",
        description: `${column}_standardized: 平均${formatNumber(
          average
        )}・標準偏差${formatNumber(stdDev)}でZスコア化しました。`,
        parameters: {
          column: `${column}_standardized`,
          source: column,
          method: "zscore",
          mean: average,
          stdDev,
        },
      });
    } else if (typeof average === "number" && typeof stdDev === "number") {
      log.push({
        step: "標準化",
        description: `${column}_standardized: 標準偏差が0のため全て0に設定しました。`,
        parameters: {
          column: `${column}_standardized`,
          source: column,
          method: "zscore",
          mean: average,
          stdDev,
        },
      });
    } else {
      log.push({
        step: "標準化",
        description: `${column}_standardized: 統計量を計算できなかったため0を設定しました。`,
        parameters: {
          column: `${column}_standardized`,
          source: column,
          method: "zscore",
          mean: average,
          stdDev,
        },
      });
    }

    processedData[column] = clippedNumeric;
    processedData[`${column}_standardized`] = standardized;
    const indicatorColumn = `${column}_was_missing`;
    processedData[indicatorColumn] = missingMask.map((flag) => (flag ? 1 : 0));
    log.push({
      step: "列生成",
      description: `${indicatorColumn}: 欠損フラグ列を生成しました。`,
      parameters: {
        derivedColumn: indicatorColumn,
        source: column,
        method: "missing_indicator",
        missingCount,
      },
    });
  });

  return { processedData, log };
};
