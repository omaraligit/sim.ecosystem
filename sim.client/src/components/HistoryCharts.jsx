import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  elements: { point: { radius: 0 }, line: { borderWidth: 1.5, tension: 0.3 } },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 10 } } },
  },
  scales: {
    x: { ticks: { font: { size: 9 }, maxTicksLimit: 6 } },
    y: { ticks: { font: { size: 9 } } },
  },
}

const needsOptions = {
  ...baseOptions,
  scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, min: 0, max: 100 } },
}

const ageOptions = {
  ...baseOptions,
  scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, min: 0 } },
}

const combinedOptions = {
  ...baseOptions,
  scales: {
    x: baseOptions.scales.x,
    y: { ...baseOptions.scales.y, min: 0, position: 'left' },
    population: {
      ...baseOptions.scales.y,
      min: 0,
      position: 'right',
      grid: { drawOnChartArea: false },
    },
  },
}

const line = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: color })

export default function HistoryCharts({ history }) {
  const labels = history.map((h) => h.tick)

  const needsData = {
    labels,
    datasets: [
      line('Hunger', history.map((h) => h.avgHunger), '#f97316'),
      line('Thirst', history.map((h) => h.avgThirst), '#3b82f6'),
      line('Happiness', history.map((h) => h.avgHappiness), '#22c55e'),
    ],
  }

  const populationData = {
    labels,
    datasets: [line('Population', history.map((h) => h.populationCount), '#a855f7')],
  }

  const ageData = {
    labels,
    datasets: [line('Avg age', history.map((h) => h.avgAge), '#eab308')],
  }

  const combinedData = {
    labels,
    datasets: [
      ...needsData.datasets,
      ...ageData.datasets,
      { ...populationData.datasets[0], yAxisID: 'population', borderDash: [4, 3] },
    ],
  }

  return (
    <div className="flex flex-col gap-3 w-80">
      <div className="card bg-base-200 p-2">
        <div className="text-xs font-semibold mb-1">Overview</div>
        <div className="h-52">
          <Line data={combinedData} options={combinedOptions} />
        </div>
      </div>
      <div className="card bg-base-200 p-2">
        <div className="text-xs font-semibold mb-1">Average needs</div>
        <div className="h-44">
          <Line data={needsData} options={needsOptions} />
        </div>
      </div>
      <div className="card bg-base-200 p-2">
        <div className="text-xs font-semibold mb-1">Population</div>
        <div className="h-36">
          <Line data={populationData} options={baseOptions} />
        </div>
      </div>
      <div className="card bg-base-200 p-2">
        <div className="text-xs font-semibold mb-1">Average age</div>
        <div className="h-36">
          <Line data={ageData} options={ageOptions} />
        </div>
      </div>
    </div>
  )
}
