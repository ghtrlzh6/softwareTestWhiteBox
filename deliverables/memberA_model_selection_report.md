# 成员 A 交付物 3：模型选型报告（白盒测试生成）

## 1. 选型目标
为 Got 目标函数自动生成高质量白盒测试用例，优先保证：
1. 语句覆盖完整度。
2. 输出 JSON 稳定可解析。
3. 异常与边界场景完整。
4. 迭代成本可控。

## 2. 评估设置
- 目标函数：source/core/options.ts 中 getRequestFunction 调度链。
- Prompt：使用同一模板逐模型对比（先 Baseline，再 Few-shot）。
- 重复次数：每模型至少 3 次独立生成。
- 判分维度：
1. Statement Coverage Completeness（0-5）
2. Branch Scenario Completeness（0-5）
3. JSON Reliability（0-5）
4. Hallucination Risk（0-5，分高代表风险低）
5. Repair Effort（0-5，分高代表修复工作少）

## 3. 推荐模型组合（可落地）

### 主模型
- GPT-5.3-Codex
- 推荐原因：
1. 结构化输出稳定，适合严格 JSON 约束。
2. 对代码控制流推理较强，适合白盒覆盖目标。
3. 迭代修改 Prompt 后收敛较快，适合课程时间窗口。

### 备选模型
- Claude Sonnet（同等级代码模型）
- 备选原因：
1. 在长上下文解释方面通常较稳。
2. 可作为交叉验证模型，辅助泛化性分析。

## 4. 对比表模板（把真实实验结果填进去）
| 模型 | 覆盖完整度 | 分支完整度 | JSON 稳定性 | 幻觉风险(低=高分) | 修复成本(低=高分) | 总分 |
| --- | --- | --- | --- | --- | --- | --- |
| GPT-5.3-Codex | 5 | 5 | 5 | 4 | 4 | 23 |
| Claude Sonnet | 4 | 4 | 4 | 4 | 4 | 20 |
| 其他候选 | 3 | 3 | 3 | 3 | 3 | 15 |

说明：当前数值为建议初始分，提交前请替换为你本地实测分。

## 5. 决策规则
1. 若主模型 JSON 解析失败率 > 10%，优先切换 Few-shot 模板再复测。
2. 若异常分支漏检率 > 20%，启用 CoT 约束版 Prompt。
3. 若两轮后仍不达标，则启用备选模型并做交叉融合（取并集再去重）。

## 6. 在报告中的可写结论（示例）
1. 模型能力不仅体现在自然语言解释，更体现在“结构化测试产物稳定性”。
2. 对白盒测试任务，严格输出协议 + 控制流约束比单纯提升模型规模更重要。
3. 采用双模型交叉验证可降低漏测风险，提高泛化分析可信度。

## 7. 英文 PPT 版简述
- Primary model: GPT-5.3-Codex for stable JSON and stronger control-flow reasoning.
- Backup model: Claude Sonnet for cross-checking and robustness.
- Decision based on coverage completeness, branch completeness, and repair cost.
- Prompt strategy contributes significantly to final testing quality.
