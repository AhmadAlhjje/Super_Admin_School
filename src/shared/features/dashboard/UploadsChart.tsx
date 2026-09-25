import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDayMonth, formatNumber } from '../../lib/format';

const PRIMARY = '#2563eb';
const GRID = '#e2e8f0';
const AXIS_TEXT = '#64748b';
const TEXT = '#0f172a';

/**
 * Videos added per day (single series → no legend; the card title names it).
 * Bars ≤ 24px with 4px rounded caps, hairline grid, per-bar tooltip, and an equivalent table
 * for screen readers. In RTL the time axis runs right-to-left.
 */
export function UploadsChart({ data }: { data: { date: string; count: number }[] }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const rows = data.map((row) => ({ ...row, label: formatDayMonth(row.date) }));

  return (
    <figure className="m-0">
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="label"
              reversed={rtl}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              orientation={rtl ? 'right' : 'left'}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'rgb(37 99 235 / 0.06)' }}
              formatter={(value) => [formatNumber(Number(value)), t('dashboard.uploadsChartLabel')]}
              labelStyle={{ color: TEXT, fontWeight: 600 }}
              // Values use text ink; the colored bar beside the tooltip carries identity.
              itemStyle={{ color: TEXT }}
              contentStyle={{
                borderRadius: 10,
                borderColor: GRID,
                fontFamily: 'inherit',
                direction: rtl ? 'rtl' : 'ltr',
              }}
            />
            <Bar dataKey="count" fill={PRIMARY} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t('dashboard.uploadsChart')}</caption>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <th scope="row">{formatDate(row.date)}</th>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
