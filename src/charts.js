import { RESOURCE_DEFS } from "./data.js";

const CHART_KEYS = ["credits", "alloys", "food", "science"];

function points(values, width, height, padding) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values.map((value, index) => ({
    x: padding + (values.length <= 1 ? 0 : index * (width - padding * 2) / (values.length - 1)),
    y: height - padding - ((value - min) / range) * (height - padding * 2),
    value
  }));
}

function chartLine(values, width, height, color) {
  const coords = points(values, width, height, 8);
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = `${line} L${last.x} ${height - 8} L${first.x} ${height - 8} Z`;
  const id = `gradient-${color.slice(1)}`;
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".26"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function renderResourceCharts(history) {
  const data = history.slice(-24);
  return CHART_KEYS.map((key) => {
    const resource = RESOURCE_DEFS.find((item) => item.id === key);
    const values = data.map((item) => Number(item.resources[key]) || 0);
    const current = values.at(-1) || 0;
    const initial = values[0] || 0;
    const delta = current - initial;
    const sign = delta > 0 ? "+" : "";
    return `<article class="chart-card"><div class="chart-heading"><span>${resource.label}</span><strong>${Math.round(current)}</strong></div><div class="chart-wrap">${values.length > 1 ? chartLine(values, 220, 56, resource.color) : "<div class=\"chart-empty\">Historia alkaa ensimmäisestä vuorosta</div>"}</div><div class="chart-foot"><span>24 kk</span><span class="${delta < 0 ? "delta-negative" : "delta-positive"}">${sign}${Math.round(delta)}</span></div></article>`;
  }).join("");
}

export function renderHistoryChart(history, key = "credits") {
  const resource = RESOURCE_DEFS.find((item) => item.id === key) || RESOURCE_DEFS[0];
  const data = history.slice(-60);
  const values = data.map((item) => Number(item.resources[key]) || 0);
  if (values.length < 2) return `<div class="chart-empty chart-empty-large">Kertomaa alkaa muodostua ensimmäisten kuukausien aikana.</div>`;
  const width = 760;
  const height = 210;
  const coords = points(values, width, height, 18);
  const d = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));
  const area = `${d} L${coords.at(-1).x} ${height - 18} L${coords[0].x} ${height - 18} Z`;
  return `<div class="history-chart"><div class="chart-axis"><span>${max}</span><span>${Math.round((max + min) / 2)}</span><span>${min}</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${resource.label} viimeisten ${values.length} kuukauden aikana"><defs><linearGradient id="historyFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${resource.color}" stop-opacity=".24"/><stop offset="1" stop-color="${resource.color}" stop-opacity=".01"/></linearGradient></defs><path d="${area}" fill="url(#historyFill)"/><path d="${d}" fill="none" stroke="${resource.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
}
