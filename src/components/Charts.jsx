import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Colores de BiKitchen
const COLORS = {
    orange: '#FF671D',
    orangeLight: 'rgba(255, 103, 29, 0.2)',
    gold: '#E9A84A',
    goldLight: 'rgba(233, 168, 74, 0.2)',
    teal: '#3D7A7A',
    tealLight: 'rgba(61, 122, 122, 0.2)',
    coral: '#E8734A',
    coralLight: 'rgba(232, 115, 74, 0.2)',
    green: '#7A8C3C',
    greenLight: 'rgba(122, 140, 60, 0.2)',
    gray: '#6B6560',
    grayLight: 'rgba(107, 101, 96, 0.2)'
};

/**
 * Gráfico de líneas para ventas
 */
export function SalesLineChart({ data, title = 'Ventas', height = 300 }) {
    const chartData = useMemo(() => ({
        labels: data?.labels || [],
        datasets: [
            {
                label: 'Ventas (₡)',
                data: data?.values || [],
                borderColor: COLORS.orange,
                backgroundColor: COLORS.orangeLight,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: COLORS.orange,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }
        ]
    }), [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: !!title,
                text: title,
                font: { size: 16, weight: 'bold' },
                color: '#2A2A2A',
                padding: { bottom: 20 }
            },
            tooltip: {
                backgroundColor: '#2A2A2A',
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context) => `₡${context.parsed.y.toLocaleString('es-CR')}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#6B6560' }
            },
            y: {
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                    color: '#6B6560',
                    callback: (value) => `₡${(value / 1000).toFixed(0)}k`
                }
            }
        }
    };

    return (
        <div style={{ height }}>
            <Line data={chartData} options={options} />
        </div>
    );
}

/**
 * Gráfico de barras para comparación
 */
export function ComparisonBarChart({ data, title = 'Comparación', height = 300 }) {
    const chartData = useMemo(() => ({
        labels: data?.labels || [],
        datasets: [
            {
                label: data?.label1 || 'Período actual',
                data: data?.values1 || [],
                backgroundColor: COLORS.orange,
                borderRadius: 8,
                barThickness: 20
            },
            {
                label: data?.label2 || 'Período anterior',
                data: data?.values2 || [],
                backgroundColor: COLORS.grayLight,
                borderRadius: 8,
                barThickness: 20
            }
        ]
    }), [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { size: 12 }
                }
            },
            title: {
                display: !!title,
                text: title,
                font: { size: 16, weight: 'bold' },
                color: '#2A2A2A',
                padding: { bottom: 20 }
            },
            tooltip: {
                backgroundColor: '#2A2A2A',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ₡${context.parsed.y.toLocaleString('es-CR')}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#6B6560' }
            },
            y: {
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                    color: '#6B6560',
                    callback: (value) => `₡${(value / 1000).toFixed(0)}k`
                }
            }
        }
    };

    return (
        <div style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

/**
 * Gráfico de dona para distribución
 */
export function DistributionDoughnut({ data, title = 'Distribución', height = 300, showLegend = true }) {
    const chartData = useMemo(() => ({
        labels: data?.labels || [],
        datasets: [
            {
                data: data?.values || [],
                backgroundColor: [
                    COLORS.orange,
                    COLORS.gold,
                    COLORS.teal,
                    COLORS.coral,
                    COLORS.green,
                    COLORS.gray
                ],
                borderWidth: 0,
                hoverOffset: 10
            }
        ]
    }), [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                display: showLegend,
                position: 'right',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15,
                    font: { size: 12 },
                    generateLabels: (chart) => {
                        const datasets = chart.data.datasets;
                        return chart.data.labels.map((label, i) => ({
                            text: `${label} (${datasets[0].data[i]}%)`,
                            fillStyle: datasets[0].backgroundColor[i],
                            hidden: false,
                            index: i
                        }));
                    }
                }
            },
            title: {
                display: !!title,
                text: title,
                font: { size: 16, weight: 'bold' },
                color: '#2A2A2A',
                padding: { bottom: 10 }
            },
            tooltip: {
                backgroundColor: '#2A2A2A',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context) => `${context.label}: ${context.parsed}%`
                }
            }
        }
    };

    return (
        <div style={{ height }}>
            <Doughnut data={chartData} options={options} />
        </div>
    );
}

/**
 * Gráfico de barras horizontal
 */
export function HorizontalBarChart({ data, title = 'Top Productos', height = 300 }) {
    const chartData = useMemo(() => ({
        labels: data?.labels || [],
        datasets: [
            {
                label: 'Cantidad',
                data: data?.values || [],
                backgroundColor: [
                    COLORS.orange,
                    COLORS.gold,
                    COLORS.teal,
                    COLORS.coral,
                    COLORS.green
                ],
                borderRadius: 6,
                barThickness: 24
            }
        ]
    }), [data]);

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: !!title,
                text: title,
                font: { size: 16, weight: 'bold' },
                color: '#2A2A2A',
                padding: { bottom: 20 }
            },
            tooltip: {
                backgroundColor: '#2A2A2A',
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { color: '#6B6560' }
            },
            y: {
                grid: { display: false },
                ticks: { color: '#6B6560', font: { size: 11 } }
            }
        }
    };

    return (
        <div style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

/**
 * Mini gráfico de línea para tarjetas de estadísticas
 */
export function SparklineChart({ data, color = COLORS.orange, height = 50 }) {
    const chartData = useMemo(() => ({
        labels: data?.map((_, i) => i) || [],
        datasets: [
            {
                data: data || [],
                borderColor: color,
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }
        ]
    }), [data, color]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        scales: {
            x: { display: false },
            y: { display: false }
        }
    };

    return (
        <div style={{ height }}>
            <Line data={chartData} options={options} />
        </div>
    );
}

/**
 * Tarjeta de estadística con mini gráfico
 */
export function StatCardWithChart({ 
    title, 
    value, 
    change, 
    changeType = 'increase', 
    sparklineData,
    icon: Icon,
    iconBg = 'bg-bikitchen-orange/10',
    iconColor = 'text-bikitchen-orange'
}) {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                    {Icon && <Icon className={iconColor} size={20} />}
                </div>
                {change && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        changeType === 'increase' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                    }`}>
                        {changeType === 'increase' ? '+' : ''}{change}%
                    </span>
                )}
            </div>
            
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-sm text-gray-500 mb-3">{title}</p>
            
            {sparklineData && (
                <SparklineChart 
                    data={sparklineData} 
                    color={changeType === 'increase' ? COLORS.green : COLORS.coral}
                />
            )}
        </div>
    );
}

export default {
    SalesLineChart,
    ComparisonBarChart,
    DistributionDoughnut,
    HorizontalBarChart,
    SparklineChart,
    StatCardWithChart
};
