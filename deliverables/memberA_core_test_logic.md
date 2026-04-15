# 成员 A 交付物 4：核心测试逻辑设计（White-box Dynamic Testing）

## 1. 目标
构建一个面向 TypeScript 函数的 LLM 白盒测试生成与验证闭环，确保语句覆盖可测量、可复现、可迭代优化。

## 2. 端到端流程
1. 代码解析阶段
- 输入目标函数源码。
- 提取可执行语句与关键分支点（含异常抛出点）。

2. 用例生成阶段
- 调用 Prompt 生成结构化 JSON 测试用例。
- 强制包含正常、边界、异常三类场景。

3. 执行验证阶段
- 将测试用例转换为 Vitest 用例。
- 使用 mock/stub 控制外部依赖与环境分支（协议、版本、fallback）。

4. 覆盖采集阶段
- 运行覆盖工具采集 statement/branch 覆盖。
- 回填真实 covered_statements，修正模型估计偏差。

5. 迭代修复阶段
- 识别漏覆盖语句与失败用例。
- 追加定向 Prompt 指令，触发下一轮补测。

## 3. 关键设计点
1. 语句覆盖为主，分支覆盖为辅
- 评分重点对齐覆盖率与有效性，因此先保证可执行语句命中，再补关键分支。

2. 可解释映射
- 每个测试必须写清覆盖意图，避免“跑过但不知为何覆盖”。

3. 异常路径优先级
- 对 TypeError、Error 与 Promise reject 分支设置强制覆盖门槛。

4. 不可达语句规范
- 允许 unreachable，但必须附理由和证据（如逻辑互斥、前置抛错）。

## 4. 主函数测试点清单（Got getRequestFunction 调度链）
1. 无 customRequest：直接走 fallback。
2. customRequest 返回普通值：直接返回该值。
3. customRequest 返回 undefined：调用 fallback。
4. customRequest 返回 Promise 且 resolve 为普通值：直接返回 resolve 值。
5. customRequest 返回 Promise 且 resolve undefined：触发 TypeError。
6. fallback 函数不存在或返回 undefined：触发 TypeError。
7. https + http2 + 低版本 Node：抛 EUNSUPPORTED。
8. http 与 https 协议分流：选择不同原生请求函数。

## 5. 质量门禁（Definition of Done）
1. 语句覆盖率 >= 95%。
2. 关键异常分支命中率 = 100%。
3. JSON 输出可直接解析，无需人工清洗。
4. 无效测试用例率 <= 10%。
5. 至少完成 2 轮 Prompt 迭代并记录改进证据。

## 6. 记录模板（实验分析可直接复用）
- 轮次：R1 / R2 / R3
- Prompt 版本：Baseline / Few-shot / CoT
- 模型：主模型 / 备选模型
- 语句覆盖率：xx%
- 分支覆盖率：xx%
- 无效用例率：xx%
- 主要错误类型：字段缺失 / API 幻觉 / 行号偏差
- 修复动作：补充约束 / 增加示例 / 强化异常分支要求
- 改进结果：覆盖+xx%，无效率-xx%

## 7. 与传统方法对比（报告段落可用）
1. 优势
- 生成速度快，能快速扩展场景组合。
- 对复杂控制流可提出更多候选输入。
- 适合前期探索与回归补测。

2. 局限
- 覆盖映射可能不准确，需工具回填。
- 易出现幻觉 API 或错误断言。
- 对上下文不完整代码敏感。

3. 改进
- 严格 JSON 协议 + Few-shot 约束。
- 执行后自动回填覆盖数据。
- 双模型交叉验证降低漏测风险。
