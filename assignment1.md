# Assignment 1 信息提取（总体要求 + Ex3 白盒动态测试）
## 一、作业总体要求
### 1. 核心任务
使用AI方法（如大语言模型LLM）**设计、实现/增强**一种软件测试技术，从**静态测试、黑盒动态测试、白盒动态测试**中三选一，开发为可运行工具。
- 静态测试：代码静态分析
- 黑盒动态测试：等价类划分EP、边界值分析BVA、输入组合测试、状态迁移测试、决策表测试
- 白盒动态测试：语句覆盖、分支覆盖、条件覆盖、路径覆盖、d-u覆盖等

### 2. 工具输入与输出
- 输入（二选一）：①系统需求文档；②测试代码库/模块片段
- 输出：①静态分析→告警；②黑盒/白盒分析→测试用例

### 3. 提交材料
1. 输入：需求/项目代码库
2. 工具产物：使用的Prompt、模型、模型生成代码
3. 生成结果：静态分析告警/黑盒&白盒测试用例
4. 实验分析：准确率、覆盖率、泛化性等
5. 项目报告
    - 与传统非AI测试技术对比（优缺点）
    - AI局限性分析与改进方案
    - 总结
6. 英文PPT（15分钟展示+问答）

### 4. 提交与展示
- 截止时间：第8周4月20日周一17:00前
- 展示时间：第8–9周周二/周四10:00–11:35
- 格式：报告&PPT为PDF，测试脚本压缩包；封面含小组ID、姓名、学号

### 5. 评分标准
- 概念理解：10%
- 设计与实现连贯性：20%
- 覆盖率与有效性：40%
- 深度分析（泛化性、推理）：20%
- 展示：10%

---

## 二、Ex3：基于LLM的白盒动态测试 完整信息
### 1. 标题
LLM-based White-box Testing（基于LLM的白盒测试）

### 2. 输入（被测系统）
- 系统概述：Axios（基于Promise的网络请求库），适配OpenHarmony，保留原v1.3.4功能
- 核心功能：HTTP请求、Promise API、请求/响应拦截器、数据转换、JSON自动转换
- 源码地址：https://ohpm.openharmony.cn/#/cn/detail/@ohos%2Faxios
- 被测接口列表（表格文字）：
| 接口 | 参数 | 功能 |
| --- | --- | --- |
| — | — | 发送请求 |
| — | — | 发送请求 |
| — | url：请求地址 | — |
| axios.delete | url：请求地址 | 发送delete请求 |
| axios.put(url, data[, config]) | url：请求地址；config：请求配置 | — |

### 3. 工具产物（Prompt）
你是专业软件测试工程师与白盒测试助手，任务是分析指定语言的函数/模块，生成**全覆盖语句**的测试用例：
1. 识别代码中所有可执行语句
2. 为每条语句生成至少执行一次的测试输入
3. 以结构化JSON输出（适配自动化测试）

**结构化JSON格式**：
{
"function": "<函数名>",
"test_cases": [
{
"input": { "<参数名>": <值>, ... },
"expected_output": "<预期输出/行为>",
"covered_statements": [<行号>],
"notes": "<可选说明>"
}
]
}

**补充要求**：
- 必要时包含边界用例覆盖所有条件分支
- 逻辑错误导致不可达语句标记为unreachable
- 说明每条用例如何实现语句覆盖

### 4. 被测代码（文字提取）
```
/**
 * Clean up temporary directory files
 * @param options: request configuration
 * @param cacheDir: temporary directory
 */
const deleteFile = (cacheDir:string, options:request.UploadConfig):void=>{
  const axios_temp='axios_temp'
  let path_temp=`${cacheDir}/${axios_temp}/`;
  try {
    if(options){ 
      //Delete specified file
      options && options.files.forEach(item=>{
        item.uri && fs.unlink(item.uri.replace('internal://cache/${axios_temp}/',path_temp));
      })
    } else {
      // Delete files that exceed 12 hours
      let filenames=fs.listFileSync(path_temp);
      let now=Date.now();
      for (let i=0;i<filenames.length;i++){
        let path=path_temp+filenames[i];
        let stat=fs.statSync(path);
        if (now - stat.atime*1000 >= 12*60*60*1000){ 
          fs.unlink(path);
        }
      }
    }
  } catch (err){
    hilog.error(DOMAIN,TAG,'delete file failed with error message:${err.message},code:${err.code}');
  }
}
```

### 5. 生成输出（测试用例）
- TestCase1：删除指定文件
```
deleteFile("/tmp/cache",{
  files:[
    { uri:"internal://cache/axios_temp/file1.txt"},
    { uri:"internal://cache/axios_temp/file2.txt"}
  ]
});
```
- TestCase2：异常处理
```
fs.unlink.mockImplementation(()=>{
  throw{message: "permission denied, code: 13"}
});
deleteFile("/tmp/cache", { 
  files:[{uri:"internal://cache/axios_temp/file3.txt"}]
});
```

### 6. 实验分析
1. 误报分析
2. 优化Prompt提升准确率
3. 多项目验证提升泛化性
4. 开发者验证Bug报告

### 7. 项目报告
1. 与传统非AI白盒测试对比（优缺点）
2. AI局限性与改进方案
3. 总结

