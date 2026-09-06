import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../utils/format.js';

/* One palette for every chart, drawn from the marketplace design tokens. */
export const CHART_COLORS = ['#A96F4C', '#5F7A5B', '#C28C6E', '#8F5739', '#D6AF99', '#3A4C38'];

const AXIS = { stroke: '#9A8F86', fontSize: 12, tickLine: false, axisLine: false };
const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid #F3EDE6',
    boxShadow: '0 18px 40px -20px rgba(31,27,24,0.35)',
    fontSize: 13,
  },
};

export function RevenueAreaChart({ data = [], dataKey = 'revenue', label = 'Revenue', height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A96F4C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#A96F4C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis tickFormatter={(value) => `$${value}`} {...AXIS} width={56} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={shortDate}
          formatter={(value) => [formatCurrency(value), label]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="#A96F4C"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersBarChart({ data = [], height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis allowDecimals={false} {...AXIS} width={40} />
        <Tooltip {...tooltipStyle} labelFormatter={shortDate} formatter={(value) => [value, 'Orders']} />
        <Bar dataKey="orders" fill="#5F7A5B" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => `$${value}`} {...AXIS} />
        <YAxis
          type="category"
          dataKey="name"
          width={190}
          {...AXIS}
          // Trim on a word boundary so a label never breaks mid-word.
          tickFormatter={(value) =>
            value.length > 28 ? `${value.slice(0, 27).replace(/\s\S*$/, '')}...` : value
          }
        />
        <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(value), 'Revenue']} />
        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry, index) => (
            <Cell key={entry.productId || index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="revenue" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value) => formatCurrency(value)} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
