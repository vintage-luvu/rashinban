const coerceToNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const createScatterPlot = (data, xAxis, yAxis) => {
  if (!data || !xAxis || !yAxis) {
    return [];
  }

  const xValues = Array.isArray(data[xAxis]) ? data[xAxis] : [];
  const yValues = Array.isArray(data[yAxis]) ? data[yAxis] : [];

  const x = [];
  const y = [];

  const maxLength = Math.max(xValues.length, yValues.length);

  for (let index = 0; index < maxLength; index += 1) {
    const coercedX = coerceToNumber(xValues[index]);
    const coercedY = coerceToNumber(yValues[index]);

    if (coercedX !== null && coercedY !== null) {
      x.push(coercedX);
      y.push(coercedY);
    }
  }

  if (x.length === 0 || y.length === 0) {
    return [];
  }

  return [
    {
      x,
      y,
      type: "scatter",
      mode: "markers",
      name: `${xAxis} vs ${yAxis}`,
      marker: {
        size: 8,
        color: "#4f46e5",
        opacity: 0.7,
      },
    },
  ];
};

export const createLayout = (xAxis, yAxis) => {
  const hasAxis = Boolean(xAxis) && Boolean(yAxis);

  return {
    autosize: true,
    title: hasAxis ? `${xAxis} vs ${yAxis}の散布図` : "散布図",
    paper_bgcolor: "rgba(248, 250, 252, 0.85)",
    plot_bgcolor: "rgba(248, 250, 252, 0.85)",
    font: {
      family: "'Noto Sans JP', 'Inter', system-ui",
    },
    margin: { l: 50, r: 30, t: 80, b: 50 },
    xaxis: {
      title: hasAxis ? xAxis : "X軸",
      gridcolor: "#e5e7eb",
    },
    yaxis: {
      title: hasAxis ? yAxis : "Y軸",
      gridcolor: "#e5e7eb",
    },
  };
};
