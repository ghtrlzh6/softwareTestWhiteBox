# 成员 A 交付物 2：Prompt 集合（Baseline + Few-shot + CoT）

## 1. 统一输出协议
所有 Prompt 都要求输出严格 JSON，结构如下：

```json
{
  "function": "<function_name>",
  "language": "TypeScript",
  "target_file": "<path>",
  "test_cases": [
    {
      "id": "TC01",
      "input": {
        "setup": "<mock setup>",
        "args": "<arguments>"
      },
      "expected_output": "<expected behavior>",
      "expected_exception": "<optional>",
      "covered_statements": [1, 2, 3],
      "covered_branches": ["B1_true", "B2_false"],
      "notes": "<why this case is needed>"
    }
  ],
  "unreachable": [
    {
      "statement": 999,
      "reason": "<why unreachable>"
    }
  ]
}
```

## 2. Prompt A：Baseline（首轮生成）

```text
You are a professional white-box testing assistant.
Task: Generate statement-coverage-oriented test cases for the given TypeScript function.

Requirements:
1) Enumerate executable statements.
2) Generate test inputs to execute each statement at least once.
3) Include normal, boundary, and exception scenarios.
4) If some statements are unreachable, mark them in unreachable with reasons.
5) Output STRICT JSON only. No markdown.

Input:
- target_file: <FILE_PATH>
- function_name: <FUNCTION_NAME>
- source_code: <SOURCE_CODE>
- test_framework: vitest

Output schema: use the exact JSON schema provided.
```

适用场景：
1. 快速拿到第一版可执行测试草案。
2. 识别模型常见错误模式（漏异常、漏边界、JSON 不稳定）。

## 3. Prompt B：Few-shot 增强版（稳定结构与质量）

```text
You are a professional white-box testing assistant.
Generate statement-coverage-oriented tests in strict JSON.

Follow this style example:
Example Input:
- function_name: divSafe(a,b)
- source_code:
  if (b===0) throw new Error('zero');
  return a/b;

Example Output:
{
  "function": "divSafe",
  "language": "TypeScript",
  "target_file": "example.ts",
  "test_cases": [
    {
      "id": "TC01",
      "input": {"setup": "none", "args": [6, 3]},
      "expected_output": 2,
      "expected_exception": null,
      "covered_statements": [1,2],
      "covered_branches": ["B1_false"],
      "notes": "normal path"
    },
    {
      "id": "TC02",
      "input": {"setup": "none", "args": [6, 0]},
      "expected_output": null,
      "expected_exception": "Error: zero",
      "covered_statements": [1],
      "covered_branches": ["B1_true"],
      "notes": "exception path"
    }
  ],
  "unreachable": []
}

Now process the real target:
- target_file: <FILE_PATH>
- function_name: <FUNCTION_NAME>
- source_code: <SOURCE_CODE>
- test_framework: vitest

Hard constraints:
1) JSON only.
2) Every case must explain why it contributes coverage.
3) Include at least one async-related or Promise-related case if applicable.
4) Do not invent APIs not present in source code.
```

适用场景：
1. 降低格式错误与字段缺失。
2. 提高异常路径与 Promise 路径命中率。

## 4. Prompt C：CoT 约束版（强调推理过程但不泄露中间链路）

```text
You are a white-box test designer.
Internally reason about control flow thoroughly, but output only final JSON.

Goal:
- Maximize statement coverage and cover critical branch outcomes.
- Minimize invalid tests and API hallucination.

Procedure to follow internally:
1) Build control-flow checkpoints.
2) Map each checkpoint to one or more test cases.
3) Ensure each test case has clear expected behavior.
4) Validate JSON against schema before output.

Output rules:
- Strict JSON only.
- No explanation text outside JSON.
- covered_statements must be integer arrays.
- If uncertain about line numbers, keep them conservative and add notes.

Input:
- target_file: <FILE_PATH>
- function_name: <FUNCTION_NAME>
- source_code: <SOURCE_CODE>
- test_framework: vitest
```

适用场景：
1. 在复杂分支下提高覆盖完整性。
2. 控制错误传播，减少无效测试。

## 5. Prompt 迭代规则（写入实验记录）
1. 先跑 Baseline，记录：JSON 解析失败率、无效用例率、覆盖率。
2. 再跑 Few-shot，比较结构稳定性和异常路径命中情况。
3. 最后跑 CoT 约束版，比较覆盖提升与成本变化。
4. 每轮仅改一个变量（Prompt 内容或模型），避免混淆因果。

## 6. 常见失败与补丁语句
1. 问题：模型返回 Markdown 包裹 JSON。
- 补丁：Append "Return raw JSON only. Do not use code fences."
2. 问题：漏掉异常分支。
- 补丁：Append "At least one test must trigger each thrown TypeError/Error branch."
3. 问题：覆盖行号瞎填。
- 补丁：Append "If line mapping is uncertain, mark conservative line set and explain in notes."
