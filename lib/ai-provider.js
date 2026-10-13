const { getConfig } = require('./config');
const { traceId } = require('./http');

const DEFINITIONS = {
  growth: { title: '增长型', definition: '关注收入和利润规模是否相较过去增长。当前策略可用营业收入同比和归母净利润同比表示。', examples: ['营业收入同比 ≥ 10%', '归母净利润同比 ≥ 10%'] },
  profitability: { title: '盈利能力型', definition: '关注毛利率、净利率、ROE 等赚钱效率是否改善，需要明确指标和时间窗口。', examples: ['净利率同比改善', 'ROE 高于指定门槛'] },
  cashflow: { title: '现金流型', definition: '关注经营现金流是否持续为正或改善，利润增长不能直接替代现金流证据。', examples: ['经营现金流连续为正', '经营现金流同比改善'] },
  absolute: { title: '绝对阈值', definition: '直接为 PE、PB 等估值指标设置上限或下限，规则清晰但不考虑行业差异。', examples: ['PE（TTM）≤ 35x'] },
  volatility: { title: '波动率', definition: '用一段时间内收益变化衡量价格波动，需要明确交易日窗口、复权方式和年化方法。', examples: ['60 日年化波动率 ≤ 28%'] }
};

function parseRuleFallback(text, memories = []) {
  const concepts = [['经营改善', 'operating_improvement', 'growth', '96%'], ['估值合理', 'reasonable_valuation', 'absolute', '94%'], ['走势相对稳定', 'price_stability', 'volatility', '91%']];
  const semanticIntents = concepts.filter(([label]) => text.includes(label)).map(([label, conceptId, definitionId, confidence]) => ({ label, concept_id: conceptId, definition_id: definitionId, confidence, status: memories.some((memory) => memory.concept_id === conceptId) ? 'confirmed' : 'needs_confirmation' }));
  const clarificationQuestions = semanticIntents.filter((intent) => intent.status !== 'confirmed').map((intent) => `你希望把“${intent.label}”定义为哪一种口径？`);
  return { provider: 'rule_fallback', trace_id: traceId('rule'), semantic_intents: semanticIntents, explicit_conditions: [], memory_matches: memories.filter((memory) => semanticIntents.some((intent) => intent.concept_id === memory.concept_id)), clarification_questions: clarificationQuestions, execution_status: clarificationQuestions.length ? 'needs_confirmation' : 'ready' };
}

async function callAI(system, user) {
  const config = getConfig().ai;
  if (!config.baseUrl || !config.model || !config.apiKey) throw new Error('ai_not_configured');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || `AI HTTP ${response.status}`);
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error('ai_empty_response');
    return JSON.parse(content);
  } finally { clearTimeout(timer); }
}

async function parseIntent({ text, memoryContext = [], currentStrategy = {} }) {
  const fallback = parseRuleFallback(text, memoryContext);
  try {
    const result = await callAI('你是金融策略语义解析器。只输出 JSON。区分用户明确表达、模糊概念和历史记忆。不要补出用户未说过的指标、阈值或窗口。返回 semantic_intents、explicit_conditions、memory_matches、clarification_questions、execution_status。AI 不执行筛选。', JSON.stringify({ text, memoryContext, currentStrategy }));
    return { ...fallback, ...result, provider: 'ai', trace_id: traceId('ai') };
  } catch { return fallback; }
}

async function queryKnowledge({ question, conceptId, strategyContext }) {
  const fallbackKey = conceptId === 'reasonable_valuation' ? 'absolute' : 'growth';
  try {
    const result = await callAI('你是金融基础知识解释器。只输出 JSON。用通俗中文解释概念，不提供买卖建议，不改变策略条件。返回 title、definition、examples、uncertainty、should_apply。', JSON.stringify({ question, conceptId, strategyContext }));
    return { ...result, provider: 'ai', trace_id: traceId('knowledge') };
  } catch { return { ...DEFINITIONS[fallbackKey], provider: 'rule_fallback', confidence: '内置定义', uncertainty: '这是定义说明，不代表系统已选择该口径。', trace_id: traceId('knowledge') }; }
}

module.exports = { DEFINITIONS, callAI, parseIntent, parseRuleFallback, queryKnowledge };
