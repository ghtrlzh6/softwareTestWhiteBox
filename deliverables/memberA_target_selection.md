# 成员 A 交付物 1：被测代码库与函数选择（Got）

## 1. 目标与约束
- 目标：完成 LLM-based white-box dynamic testing，重点验证语句覆盖，并补充分支场景。
- 约束：可执行、可复现、可解释，且产出可直接进入报告与 PPT。

## 2. 代码库选择
- 被测代码库：Got（Node.js HTTP client）
- 选择理由：
1. 真实开源工程，分支逻辑丰富，覆盖分析价值高。
2. 关键函数可通过 mock 或替身请求函数进行控制，便于稳定复现。
3. 存在明确异常路径与边界路径，适合检验 LLM 在白盒测试中的有效性。

## 3. 候选函数对比

### 候选 A（最终主选）
- 位置：source/core/options.ts
- 函数：getRequestFunction 及其调用链到 #getFallbackRequestFunction、#callFallbackRequest、#resolveRequestWithFallback、#resolveFallbackRequestResult
- 适配性：高
- 关键价值：
1. 覆盖同步返回、异步返回、undefined 回退、异常抛出等多类控制流。
2. 兼顾协议分流（http/https/http2）与版本约束错误（EUNSUPPORTED）。
3. 输入构造成本较低，便于做 prompt 迭代对照实验。

### 候选 B（备选）
- 位置：source/core/index.ts
- 函数：_makeRequest
- 适配性：中高
- 风险：依赖上下文更重，测试桩构造复杂，调试时间成本高。

### 候选 C（备选）
- 位置：source/core/index.ts
- 函数：_onResponseBase
- 适配性：中
- 风险：代码体量大、路径多，短周期下不利于稳定达成高覆盖并完成分析闭环。

## 4. 最终决策
- 主函数：候选 A（getRequestFunction 调度链）
- 备选函数：候选 B（_makeRequest）

## 5. 决策依据矩阵（1-5 分）
| 维度 | 候选 A | 候选 B | 候选 C |
| --- | --- | --- | --- |
| 分支丰富度 | 4 | 5 | 5 |
| mock 难度（反向） | 4 | 2 | 2 |
| 执行稳定性 | 5 | 3 | 2 |
| 覆盖分析可解释性 | 5 | 4 | 3 |
| 迭代成本（反向） | 5 | 3 | 2 |
| 总分 | 23 | 17 | 14 |

## 6. 预期覆盖目标
1. 语句覆盖率目标：>= 95%（主函数及关联回退链）。
2. 关键分支覆盖：
- customRequest 不存在 -> fallback。
- customRequest 返回非 Promise 且非 undefined。
- customRequest 返回 undefined -> fallback。
- customRequest 返回 Promise 且 resolve 非 undefined。
- customRequest 返回 Promise 且 resolve undefined -> TypeError。
- fallback 为 undefined -> TypeError。
- https + http2 + 低版本 Node -> EUNSUPPORTED。

## 7. 风险与缓解
1. 风险：Node 版本分支在本地环境不可稳定触发。
- 缓解：用依赖注入或桩替换模拟版本信息，保留可重复脚本。
2. 风险：私有方法链难以直接单测。
- 缓解：从公开入口驱动行为，结合 spy 校验回退路径被调用。
3. 风险：LLM 生成行号映射偏差。
- 缓解：覆盖采集工具回填真实执行行号，禁止人工臆填。
