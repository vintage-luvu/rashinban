export default function AxisSelector({ columns, xAxis, yAxis, onAxisChange }) {
  return (
    <div className="flex gap-4 mt-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          X軸
        </label>
        <select
          value={xAxis}
          onChange={(e) => onAxisChange('x', e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">選択してください</option>
          {columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Y軸
        </label>
        <select
          value={yAxis}
          onChange={(e) => onAxisChange('y', e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">選択してください</option>
          {columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
