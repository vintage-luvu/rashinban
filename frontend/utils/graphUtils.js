export const createScatterPlot = (data, xAxis, yAxis) => {
  if (!data || !xAxis || !yAxis) return [];

  return [{
    x: data[xAxis],
    y: data[yAxis],
    type: 'scatter',
    mode: 'markers',
    name: `${xAxis} vs ${yAxis}`,
    marker: {
      size: 8,
      color: '#4f46e5',
      opacity: 0.7
    }
  }];
};

export const createLayout = (xAxis, yAxis) => {
  return {
    autosize: true,
    title: `${xAxis} vs ${yAxis}の散布図`,
    paper_bgcolor: "rgba(248, 250, 252, 0.85)",
    plot_bgcolor: "rgba(248, 250, 252, 0.85)",
    font: {
      family: "'Noto Sans JP', 'Inter', system-ui",
    },
    margin: { l: 50, r: 30, t: 80, b: 50 },
    xaxis: {
      title: xAxis,
      gridcolor: '#e5e7eb'
    },
    yaxis: {
      title: yAxis,
      gridcolor: '#e5e7eb'
    }
  };
};
