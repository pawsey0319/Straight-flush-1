# 澄明选股：自然语言智能选股与策略解释器

这是题目「自然语言智能选股与策略解释器」的可操作 Web 产品。产品把“经营改善、估值合理、走势相对稳定”这样的自然语言意图拆成可确认的定义、可修改的结构化条件，并在结果中展示入选、排除、未知、证据来源和条件修改影响。当前版本同时提供演示快照模式和真实数据模式：真实模式通过 Vercel Serverless API 调用扶摇，浏览器不会接触供应商密钥。

## 在线体验

- Vercel 生产 URL：部署后填写实际项目地址；没有服务端环境变量时页面仍可使用演示模式。
- GitHub Pages 静态入口：`https://pawsey0319.github.io/Straight-flush-1/`
- 源码仓库：`https://github.com/pawsey0319/Straight-flush-1`

GitHub Pages 首次启用可能需要几分钟生效。如果在线地址尚未生效，可以直接下载仓库后打开根目录的 `index.html`，或运行下面的本地预览命令。

## 本地启动

前端仍可作为静态页面打开；API 需要 Vercel 或兼容 Node 18 的 Serverless 环境。进入仓库根目录后执行：

```bash
python3 -m http.server 4173
```

浏览器访问 `http://localhost:4173`。

安装服务端依赖并检查：

```bash
npm install
npm run check
npm test
```

## 演示主链路

1. 输入自然语言意图，点击「重新解析」；如果 AI 未配置，页面明确显示规则回退，不会伪装成 AI 结果。
2. 在「语义澄清」中确认增长型、绝对阈值、波动率定义。
3. 在「策略条件」中检查营业收入、归母净利润、PE、历史分位和波动率条件。
4. 点击「运行策略」，查看入选、排除和数据质量三个结果视图。
5. 点击任意股票，查看通过/失败/未知状态、实际值、阈值、来源和时点。
6. 修改归母净利润同比阈值或查看 What-if 区域，展示条件变更后的候选结果影响。
7. 点击右下角「基础知识」圆形按钮，在不占用主窗口的浮窗中提问定义。
8. 点击「记住这个口径」，保存结构化用户偏好；下次解析相同概念时会优先提示沿用。
9. 点击保存策略、创建监控或回测入口，演示策略后续生命周期。

推荐演示输入：`找经营改善、估值合理、走势相对稳定的 A 股。`

## 产品边界

- **AI 角色**：识别用户明确表达、解释模糊概念、给出定义候选和澄清问题；不执行查询和筛选。
- **确定性筛选引擎**：校验指标、单位、阈值和冲突；计算指标；返回 `pass / fail / unknown`；生成证据记录。
- **数据适配层**：统一金融数据字段、来源、时点、单位和数据质量状态。
- **解释层**：只使用证据账本中的数字和判定，不能改写事实。

演示模式使用固定的**演示数据快照**展示产品主链路，界面明确标注了这一点；实时模式通过 `/api/screen/run` 调用服务端扶摇适配器。没有把仿真数据描述为实时行情，也没有提交 API Key。扶摇当前快照不提供五年 PE 历史分位，因此该条件在实时模式中显示为 `unknown`；演示模式可以继续展示该条件的交互。

## Vercel 配置

将仓库导入 Vercel 后，在 Project Settings → Environment Variables 中配置 `.env.example` 中的变量：

- `FUYAO_API_KEY`：服务端专用的新 Key。聊天中暴露的旧 Key 不应继续使用，不能写进前端或 Git 历史。
- `FUYAO_UNIVERSE_PATH=/api/meta/tickers/list`
- `FUYAO_VALUATION_PATH=/api/a-share/valuations/snapshot`
- `FUYAO_FINANCIAL_PATH=/api/a-share/financials/indicators`
- `FUYAO_KLINE_PATH=/api/a-share/prices/historical`
- `AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY`：兼容 OpenAI 的模型网关配置。
- `DATABASE_URL`：Vercel 连接的 PostgreSQL URL；没有配置时记忆会退化为当前实例的预览存储。
- `ANON_SESSION_SECRET`：用于匿名会话部署配置的随机值。

真实扶摇请求只在服务端发送 `X-api-key`。接口业务错误需要同时检查 HTTP 状态和响应体 `code`；缺失字段、负 PE、窗口不足和不支持的历史分位都会保留为 `unknown`。

## 目录说明

```text
.
├── index.html                         # 可直接发布的 Web 产品
├── styles.css                         # 产品样式
├── app.js                             # 交互、演示数据和结果解释
├── api/                               # Vercel Serverless API
├── lib/                               # AI、扶摇、记忆、校验和证据模块
├── tests/                             # 确定性规则与数据计算测试
├── .env.example                       # 部署环境变量模板
├── vercel.json                        # Serverless 部署配置
├── docs/
│   ├── architecture.md                # 架构、职责边界和策略 IR
│   ├── feasibility-plan.md            # 24 小时可行性规划
│   ├── ai-validation-log.md           # AI 使用与人工修正记录
│   ├── test-report.md                 # 主链路、异常与合规测试说明
│   └── delivery-summary.md            # 聊天记录与交付要求总结
├── 02_自然语言智能选股与策略解释器.md  # 题目原文
└── 初版方案-自然语言智能选股与策略解释器.md # 方案依据
```

## 数据字段与证据

每个结果至少展示证券代码、条件实际值、阈值、单位、数据时点、数据源和质量状态。真实接入时建议使用以下证据结构：

```json
{
  "symbol": "600519.SH",
  "condition_id": "c_profit_growth",
  "raw_fields": [
    {"name": "net_profit_current", "value": 15900000000, "unit": "CNY", "as_of": "2026-06-30"},
    {"name": "net_profit_previous", "value": 13700000000, "unit": "CNY", "as_of": "2025-06-30"}
  ],
  "derived_value": 15.9,
  "derived_unit": "pct",
  "operator": ">=",
  "threshold": 10,
  "status": "pass",
  "provider": "fuyao",
  "retrieved_at": "2026-10-12T15:02:00+08:00",
  "data_quality": "ok"
}
```

## 已知边界

- 当前提交已完成 AI/API/扶摇适配器的部署接口和前端状态，但真实模式需要在 Vercel 中配置新 Key、AI 网关和 PostgreSQL；没有这些环境变量时不会伪造实时结果。
- 回测入口明确保留为“未伪造收益结果”的状态，避免在数据不足时给出误导性结论。
- 扶摇当前估值快照没有五年 PE 历史分位，实时模式将该条件标记为 `unknown`，不会用演示值替代。
- 产品不提供确定性涨跌预测、收益承诺或直接买卖建议。
- 数据缺失、接口失败、窗口不足或来源冲突显示为 `unknown`，不会自动通过或排除。

## 交付材料

- 可访问 Web 产品 URL：GitHub Pages 地址。
- 源码仓库：本仓库。
- AI 使用与验证记录：`docs/ai-validation-log.md`。
- 测试说明：`docs/test-report.md`。
- 可行性规划：`docs/feasibility-plan.md`。
- 聊天记录与交付要求总结：`docs/delivery-summary.md`。
