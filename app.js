const stockData = {
  selected: [
    { name: '贵州茅台', code: '600519.SH', revenue: '17.3%', profit: '15.9%', pe: '27.4x', volatility: '18.2%', date: '2026-10-12', quality: '可追溯', facts: [['营业收入同比', '17.3%', 'pass'], ['归母净利润同比', '15.9%', 'pass'], ['PE（TTM）', '27.4x ≤ 35x', 'pass'], ['PE 历史分位', '42% ≤ 60%', 'pass'], ['60 日年化波动率', '18.2% ≤ 28%', 'pass']], summary: '经营改善与估值条件均满足当前策略口径，波动率处于控制范围内。' },
    { name: '招商银行', code: '600036.SH', revenue: '8.8%', profit: '12.6%', pe: '6.8x', volatility: '19.7%', date: '2026-10-12', quality: '可追溯', facts: [['营业收入同比', '8.8% < 10%', 'fail'], ['归母净利润同比', '12.6%', 'pass'], ['PE（TTM）', '6.8x ≤ 35x', 'pass'], ['PE 历史分位', '31% ≤ 60%', 'pass'], ['60 日年化波动率', '19.7% ≤ 28%', 'pass']], summary: '估值与稳定性条件通过，营业收入同比低于当前经营改善门槛。' },
    { name: '海尔智家', code: '600690.SH', revenue: '12.1%', profit: '18.4%', pe: '13.5x', volatility: '21.3%', date: '2026-10-12', quality: '可追溯', facts: [['营业收入同比', '12.1%', 'pass'], ['归母净利润同比', '18.4%', 'pass'], ['PE（TTM）', '13.5x ≤ 35x', 'pass'], ['PE 历史分位', '38% ≤ 60%', 'pass'], ['60 日年化波动率', '21.3% ≤ 28%', 'pass']], summary: '收入与利润保持双增长，估值处于历史中低分位，价格波动在控制范围内。' },
    { name: '长江电力', code: '600900.SH', revenue: '10.8%', profit: '11.2%', pe: '18.1x', volatility: '14.6%', date: '2026-10-12', quality: '可追溯', facts: [['营业收入同比', '10.8%', 'pass'], ['归母净利润同比', '11.2%', 'pass'], ['PE（TTM）', '18.1x ≤ 35x', 'pass'], ['PE 历史分位', '47% ≤ 60%', 'pass'], ['60 日年化波动率', '14.6% ≤ 28%', 'pass']], summary: '增长条件刚好越过门槛，波动率是入选样本中较低的一组。' }
  ],
  excluded: [
    { name: '中国联通', code: '600050.SH', revenue: '6.2%', profit: '8.4%', pe: '21.8x', volatility: '25.4%', date: '2026-10-12', quality: '可追溯', fail: '归母净利润同比 8.4% < 10%', facts: [['营业收入同比', '6.2% < 10%', 'fail'], ['归母净利润同比', '8.4% < 10%', 'fail'], ['PE（TTM）', '21.8x ≤ 35x', 'pass'], ['PE 历史分位', '55% ≤ 60%', 'pass'], ['60 日年化波动率', '25.4% ≤ 28%', 'pass']], summary: '估值和波动率通过，但经营改善的两个增长条件均未满足。' },
    { name: '宁德时代', code: '300750.SZ', revenue: '21.6%', profit: '24.3%', pe: '48.1x', volatility: '31.2%', date: '2026-10-12', quality: '可追溯', fail: 'PE 48.1x > 35x；波动率 31.2% > 28%', facts: [['营业收入同比', '21.6%', 'pass'], ['归母净利润同比', '24.3%', 'pass'], ['PE（TTM）', '48.1x > 35x', 'fail'], ['PE 历史分位', '76% > 60%', 'fail'], ['60 日年化波动率', '31.2% > 28%', 'fail']], summary: '经营改善明显，但估值和价格波动超过当前策略的风险边界。' },
    { name: '中芯国际', code: '688981.SH', revenue: '9.8%', profit: '-12.5%', pe: '59.3x', volatility: '34.7%', date: '2026-10-12', quality: '可追溯', fail: '利润同比为负；估值与波动率超出门槛', facts: [['营业收入同比', '9.8% < 10%', 'fail'], ['归母净利润同比', '-12.5% < 10%', 'fail'], ['PE（TTM）', '59.3x > 35x', 'fail'], ['PE 历史分位', '88% > 60%', 'fail'], ['60 日年化波动率', '34.7% > 28%', 'fail']], summary: '当前样本中有多个条件不满足，系统展示失败原因而不是仅返回“不入选”。' }
  ],
  unknown: [
    { name: '片仔癀', code: '600436.SH', revenue: '—', profit: '14.2%', pe: '32.7x', volatility: '—', date: '窗口不足', quality: 'unknown', fail: '行情窗口不足，无法计算 60 日波动率', facts: [['营业收入同比', '字段缺失', 'unknown'], ['归母净利润同比', '14.2%', 'pass'], ['PE（TTM）', '32.7x ≤ 35x', 'pass'], ['PE 历史分位', '58% ≤ 60%', 'pass'], ['60 日年化波动率', '窗口不足', 'unknown']], summary: '财务和估值字段可用，但行情历史窗口不足，不能安全判断走势稳定性。' },
    { name: '东方雨虹', code: '002271.SZ', revenue: '13.4%', profit: '11.8%', pe: '—', volatility: '23.5%', date: '接口异常', quality: 'unknown', fail: '估值数据源超时，PE 无法判定', facts: [['营业收入同比', '13.4%', 'pass'], ['归母净利润同比', '11.8%', 'pass'], ['PE（TTM）', '接口超时', 'unknown'], ['PE 历史分位', '接口超时', 'unknown'], ['60 日年化波动率', '23.5% ≤ 28%', 'pass']], summary: '大部分条件通过，但估值数据源暂时不可用，结果保留为 unknown。' }
  ]
};

let currentTab = 'selected';
let currentStock = stockData.selected[0];
const tableBody = document.getElementById('stockTableBody');
const evidencePanel = document.getElementById('evidencePanel');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2500);
}

function metricClass(value) {
  if (value === '—' || value.includes('接口') || value.includes('窗口')) return 'warning';
  return value.includes('-') ? 'negative' : 'positive';
}

function renderEvidence(stock) {
  currentStock = stock;
  document.getElementById('evidenceTitle').innerHTML = `${stock.name} <span>${stock.code}</span>`;
  const isUnknown = stock.quality === 'unknown';
  const isSelected = currentTab === 'selected';
  document.getElementById('evidenceStatus').textContent = isUnknown ? '未知' : (isSelected ? '入选' : '排除');
  document.getElementById('evidenceStatus').style.color = isUnknown ? 'var(--amber)' : (isSelected ? 'var(--green)' : 'var(--coral)');
  document.querySelector('.evidence-status .status-dot').style.background = isUnknown ? '#d49a31' : (isSelected ? '#38a36f' : '#d87b5f');
  document.querySelector('.evidence-status span:last-child').textContent = isUnknown ? '证据不足，暂不判定' : `${stock.facts.filter((item) => item[2] === 'pass').length} / 5 条件通过`;
  document.getElementById('evidenceSummary').textContent = stock.summary;
  document.getElementById('evidenceSource').textContent = `扶摇演示快照 · ${stock.date === '2026-10-12' ? '2026-10-12' : stock.date} · CNY / pct / x`;
  document.getElementById('evidenceFacts').innerHTML = stock.facts.map(([label, value, status]) => `<div class="evidence-fact"><span>${label}</span><strong class="${status}">${value}</strong></div>`).join('');
}

function renderTable() {
  const rows = stockData[currentTab];
  tableBody.innerHTML = rows.map((stock, index) => {
    const selected = stock.code === currentStock.code ? 'active' : '';
    const qualityClass = stock.quality === 'unknown' ? 'warning' : '';
    return `<tr class="${selected}" data-index="${index}">
      <td><span class="stock-name">${stock.name}</span><span class="stock-code">${stock.code}</span></td>
      <td><span class="table-value ${metricClass(stock.revenue)}">${stock.revenue}</span></td>
      <td><span class="table-value ${metricClass(stock.pe)}">${stock.pe}</span></td>
      <td><span class="table-value ${metricClass(stock.volatility)}">${stock.volatility}</span></td>
      <td><span class="quality-chip ${qualityClass}">${stock.quality}</span><span class="stock-code">${stock.date}</span></td>
      <td><span class="row-chevron">›</span></td>
    </tr>`;
  }).join('');
  [...tableBody.querySelectorAll('tr')].forEach((row) => row.addEventListener('click', () => {
    renderEvidence(stockData[currentTab][Number(row.dataset.index)]);
    renderTable();
  }));
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  currentStock = stockData[tab][0];
  renderTable();
  renderEvidence(currentStock);
}

document.querySelectorAll('.tab-button').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
document.querySelectorAll('.definition-options').forEach((group) => group.addEventListener('click', (event) => {
  const chip = event.target.closest('.definition-chip');
  if (!chip) return;
  group.querySelectorAll('.definition-chip').forEach((item) => item.classList.remove('selected'));
  chip.classList.add('selected');
  showToast(`已切换为“${chip.textContent}”口径，执行条件同步更新`);
}));

document.getElementById('runButton').addEventListener('click', () => {
  document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('策略已重新运行，结果与证据账本已更新');
});
document.getElementById('parseButton').addEventListener('click', () => showToast('已识别：经营改善、估值合理、走势相对稳定；未自动补出阈值'));
document.getElementById('resetDemo').addEventListener('click', () => {
  document.getElementById('intentInput').value = '找经营改善、估值合理、走势相对稳定的 A 股。';
  document.querySelectorAll('.threshold-input').forEach((input) => { input.value = input.dataset.condition === 'pe' ? 35 : (input.dataset.condition === 'percentile' ? 60 : 10); });
  document.querySelector('[data-condition="volatility"]').value = 28;
  showToast('已恢复到演示策略 v1.3');
});
document.getElementById('clarifyButton').addEventListener('click', () => showToast('定义来源：用户原话 + 当前确认；AI 只提供候选解释，不写入未确认条件'));
document.querySelectorAll('.threshold-input').forEach((input) => input.addEventListener('change', () => {
  if (input.dataset.condition === 'profit') document.getElementById('whatIfValue').textContent = `${input.value}%`;
  showToast(`条件已修改为 ${input.value}${input.dataset.condition === 'pe' ? 'x' : '%'}，请重新运行查看差异`);
}));
document.getElementById('saveButton').addEventListener('click', () => showToast('已保存策略 v1.3，可在策略版本中回看与回滚'));
document.getElementById('monitorButton').addEventListener('click', () => showToast('监控任务草稿已创建：每日收盘后检查条件变化'));
document.getElementById('monitorButton2').addEventListener('click', () => showToast('监控任务草稿已创建，数据异常会单独提醒'));
document.getElementById('backtestButton').addEventListener('click', () => showToast('回测入口：当前演示只展示产品流程，未伪造历史收益'));
document.getElementById('versionButton').addEventListener('click', () => showToast('当前策略版本：v1.3 · 上一版本 v1.2 · 可比较条件 diff'));
document.getElementById('applyWhatIf').addEventListener('click', () => { document.querySelector('[data-condition="profit"]').value = 20; showToast('已应用 What-if：归母净利润同比门槛调整为 20%'); });
document.getElementById('viewRawEvidence').addEventListener('click', () => showToast('证据账本包含原始字段、计算公式、单位、来源和检索时点'));
document.getElementById('closeEvidence').addEventListener('click', () => evidencePanel.classList.toggle('collapsed'));

const modalBackdrop = document.getElementById('modalBackdrop');
function closeModal() { modalBackdrop.hidden = true; }
document.getElementById('complianceButton').addEventListener('click', () => { modalBackdrop.hidden = false; });
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalDone').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) closeModal(); });

renderEvidence(currentStock);
renderTable();
