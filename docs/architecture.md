# 架构与职责边界

## 1. 主链路

```mermaid
flowchart LR
  U[自然语言意图] --> P[语义解析与澄清]
  P --> IR[Strategy IR]
  IR --> V[确定性校验与冲突识别]
  V --> D[数据适配层]
  D --> E[确定性筛选引擎]
  E --> L[证据账本]
  L --> X[模板化解释]
  X --> R[结果 / What-if / 保存 / 监控]
```

## 2. 三层边界

| 层 | 负责 | 不负责 |
|---|---|---|
| AI 语义层 | 识别用户原话、解释模糊概念、生成澄清问题、润色证据解释 | 不能自行补阈值、不能执行 SQL/Python、不能改写数字 |
| 确定性层 | Schema 校验、指标计算、冲突识别、筛选、`pass/fail/unknown` 状态 | 不接受未经校验的自然语言作为执行指令 |
| 数据层 | 返回字段、原值、单位、来源、时点、错误状态 | 数据失败时不能返回“正常”空值 |

## 3. 策略中间表示

```json
{
  "strategy_id": "demo_001",
  "version": 3,
  "execution_status": "ready",
  "semantic_intents": [
    {"concept_id": "operating_improvement", "definition_status": "confirmed", "origin": "user_confirmed"},
    {"concept_id": "reasonable_valuation", "definition_status": "confirmed", "origin": "user_confirmed"},
    {"concept_id": "price_stability", "definition_status": "confirmed", "origin": "user_confirmed"}
  ],
  "conditions": [
    {"metric": "revenue_yoy", "operator": ">=", "value": 10, "unit": "pct", "origin": "user_confirmed"},
    {"metric": "net_profit_yoy", "operator": ">=", "value": 10, "unit": "pct", "origin": "user_confirmed"},
    {"metric": "pe_ttm", "operator": "<=", "value": 35, "unit": "x", "origin": "user_confirmed"},
    {"metric": "pe_percentile_5y", "operator": "<=", "value": 60, "unit": "pct", "origin": "user_confirmed"},
    {"metric": "volatility_60d_annualized", "operator": "<=", "value": 28, "unit": "pct", "origin": "user_confirmed"}
  ],
  "missing_data_policy": "unknown"
}
```

## 4. 结果状态

- `pass`：字段完整，计算成功，满足条件。
- `fail`：字段完整，计算成功，不满足条件。
- `unknown`：字段缺失、过期、窗口不足、接口失败或数据冲突。
- `not_applicable`：条件不适用于当前证券或市场范围。

Demo 用 `app.js` 中的固定快照模拟适配器返回值，页面行为与后续真实 API 的字段契约保持一致。
