
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const refinePersona = async (data: {
  title: string;
  responsibilities: string;
  knowledge: string;
  skills: string;
  literacy: string;
  experience: string;
  warning_traits?: string;
  core_tags?: string;
}) => {
  const prompt = `请作为资深 HR 专家，对以下岗位的招聘需求进行“智能润色”和专业化提升。
  岗位名称：${data.title}
  
  当前输入内容：
  - 核心职责：${data.responsibilities}
  - 专业知识：${data.knowledge}
  - 专业技能：${data.skills}
  - 职业素养：${data.literacy}
  - 经验要求：${data.experience}
  - 警惕特质：${data.warning_traits || '待补充'}
  - 核心能力标签：${data.core_tags || '待补充'}
  
  请在保留原意的基础上，将其转化为更专业、更具吸引力的招聘文案。
  必须仅返回一个 JSON 对象。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { 
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          responsibilities: { type: Type.STRING },
          knowledge: { type: Type.STRING },
          skills: { type: Type.STRING },
          literacy: { type: Type.STRING },
          experience: { type: Type.STRING },
          warning_traits: { type: Type.STRING },
          core_tags: { type: Type.STRING },
        },
        required: ["responsibilities", "knowledge", "skills", "literacy", "experience", "warning_traits", "core_tags"]
      }
    }
  });
  
  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI 响应解析失败", e);
    return null;
  }
};

export const parseResumeData = async (options: {
  fileName?: string;
  textContent?: string;
  fileData?: { data: string; mimeType: string };
}) => {
  const { textContent, fileData } = options;
  
  let parts: any[] = [];
  if (fileData) {
    parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  } else if (textContent) {
    parts.push({ text: `简历原文内容如下：\n${textContent}` });
  }

  const prompt = `你是一个专业的简历分析专家。请将提供的简历内容整理为以下标准结构，并提取基础画像信息。

**核心绝不动摇准则：**
1. **绝对原文搬运**：对于“3. 工作/实习经历”、“4. 项目经历”、“6. 自我评价”这三个核心部分，必须**完全照搬**简历中的原始文字描述。
   - **严禁**进行任何缩写、改写、润色、总结或删除。
   - **严禁**擅自使用 STAR 法则重写，除非原文本身就是那样写的。
   - 必须保留原文的所有细节、数据和描述，确保信息 100% 完整。
2. **结构化提取**：仅负责将现有信息分类到指定模块，并识别关键信息填入 basicInfo。

**报告排版结构（Markdown 格式）：**
1. 个人基础信息 (Personal Information)
   - 包含：姓名、联系电话、电子邮箱、所在城市、个人主页（GitHub等）。
   - 严禁提取：身份证号、详细住址、政治面貌。

2. 教育背景 (Education)
   - 倒序排列。包含学校、专业、学历、时间、GPA/奖学金。

3. 工作/实习经历 (Work Experience)
   - 格式头：公司名称 | 职位名称 | 在职时间
   - 内容：(在此处直接粘贴原文，保留原文的换行、项目符号和所有细节)

4. 项目经历 (Project Experience)
   - 格式头：项目名称 | 角色 | 时间
   - 内容：(在此处直接粘贴原文，保留原文的换行、项目符号和所有细节)

5. 技能与证书 (Skills & Certifications)
   - 专业技能、语言、职业资格。

6. 自我评价 (Summary/Self-Evaluation)
   - 内容：(在此处直接粘贴原文)

请返回 JSON，包含 basicInfo 对象（提取的字段）和 fullContent（按上述顺序排版的 Markdown 报告）。`;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { 
            basicInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                gender: { type: Type.STRING },
                age: { type: Type.STRING },
                school: { type: Type.STRING },
                major: { type: Type.STRING },
                education: { type: Type.STRING },
                graduationTime: { type: Type.STRING },
                workExperience: { type: Type.STRING },
                expectedSalary: { type: Type.STRING },
                expectedCity: { type: Type.STRING },
                jobIntent: { type: Type.STRING },
                maritalStatus: { type: Type.STRING },
                childAge: { type: Type.STRING },
                address: { type: Type.STRING },
                willingness: { type: Type.STRING },
                phone: { type: Type.STRING },
                wechat: { type: Type.STRING },
                email: { type: Type.STRING }
              },
              required: ["name", "gender", "age", "graduationTime", "workExperience", "expectedSalary", "expectedCity", "jobIntent", "maritalStatus", "childAge", "address", "willingness"]
            },
            fullContent: { type: Type.STRING }
          },
          required: ["basicInfo", "fullContent"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Resume parsing failed:", e);
    return { 
      basicInfo: { name: options.fileName || "未知", gender: "", age: "", school: "", major: "", education: "", graduationTime: "", workExperience: "", expectedSalary: "", expectedCity: "", jobIntent: "", maritalStatus: "", childAge: "", address: "", willingness: "", phone: "", wechat: "", email: "" },
      fullContent: textContent || "无法解析简历内容。"
    };
  }
};

export const processInterviewAudio = async (audioData: { data: string; mimeType: string }, jobTitle: string, round: number) => {
  const prompt = `你是一个资深面试官助手。这是一段应聘 ${jobTitle} 岗位第 ${round} 轮面试的录音。请整理对话摘要和评估结论。`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: audioData }, { text: prompt }] }
    });
    return response.text;
  } catch (e) {
    return "音频解析失败。";
  }
};

export const generateInterviewQuestions = async (
  jobTitle: string,
  persona: string,
  candidateName: string,
  round: number,
  history: string = '', 
  resumeText: string = '', 
  coreTags: string = '',
  manualLogicCorrection: string = ''
) => {
  let systemInstruction = "";

  // --- 角色定义 ---
  if (round === 1) {
    systemInstruction = `
    ### 角色设定：一轮面试官（资深HR）。核心任务：【基于岗位画像的初筛】。
    考察重点：画像匹配度核实、职业素养、风险排查（反驳型人格）、沟通基础。
    `;
  } else if (round === 2) {
    systemInstruction = `
    ### 角色设定：二轮面试官（业务负责人）。核心任务：【专业能力与业务思维考察】。
    考察重点：核心能力深挖、业务/技术思维、场景化落地、现场口述题目。
    `;
  } else if (round === 3) {
    systemInstruction = `
    ### 角色设定：终面面试官（公司老板）。核心任务：【实操验证与综合匹配度】。
    考察重点：实操能力验证（必须包含现场笔试/代码/话术题）、自我复盘、综合匹配。
    `;
  }

  // --- 人工干预 ---
  let userOverride = "";
  if (manualLogicCorrection) {
    userOverride = `
    ⚠️ **最高优先级指令：人工修正**
    面试官已审查并修改了生成逻辑。请**忽略**你之前的自动判断，**完全遵循**以下修正后的思路来生成题目：
    "${manualLogicCorrection}"
    `;
  }

  const prompt = `
  ${systemInstruction}

  ---
  **候选人信息**：${candidateName} (应聘岗位: ${jobTitle})
  **岗位人才画像**：${persona}
  **核心能力标签**：${coreTags}
  **简历内容**：${resumeText ? resumeText.substring(0, 3000) : '暂无'}
  **历史面试记录**：${history ? history : '无'}
  
  ${userOverride}
  
  ---
  **【严格输出格式要求】**
  请务必将返回内容分为两部分，中间使用 "<<<SPLIT_HERE>>>" 严格分隔。
  顺序必须是：先逻辑，后题目。
  
  **Part 1: 生成逻辑溯源 (Logic Analysis)**
  简要列出出题依据（如“基于简历XX项目...”、“基于画像XX要求...”）。
  
  <<<SPLIT_HERE>>>
  
  **Part 2: 面试题目 (Questions)**
  这里必须列出 5 个具体的面试题及其考察意图。**此部分绝不能为空！**
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  
  return response.text;
};

export const summarizeInterview = async (notes: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `请总结面试记录：${notes}`,
  });
  return response.text;
};

export const generatePersonnelAssessment = async (notes: string, round: number) => {
  const prompt = `你是一个资深面试官。请针对第 ${round} 轮面试的记录进行专业人才评估：\n${notes}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text;
};

export const generateComprehensiveFitAnalysis = async (
  jobTitle: string,
  persona: string,
  candidateName: string,
  resumeText: string,
  interviews: any[]
) => {
  // 1. 整理面试历史数据
  let interviewContext = "暂无面试记录";
  if (interviews && interviews.length > 0) {
    interviewContext = interviews.map(i => `
    [第 ${i.round} 轮面试]
    - 时间：${i.scheduledAt}
    - AI 录音复盘摘要：${i.aiSummary || '无'}
    - 面试官评价：${i.evaluation || '无'}
    - 面试题及表现推断：${(i.questions || []).join('; ')}
    `).join('\n----------------\n');
  }

  const prompt = `
  你是一位拥有20年经验的首席人才官（CHO）。请针对候选人 **${candidateName}** 应聘 **${jobTitle}** 岗位，进行一次全维度的深度人岗匹配分析。

  **输入数据：**
  1. **岗位画像标准**：
  ${persona}

  2. **候选人简历**：
  ${resumeText ? resumeText.substring(0, 4000) : '（简历内容缺失）'}

  3. **历史面试全流程数据（含录音分析与评价）**：
  ${interviewContext}

  ---
  **分析指令：**
  请忽略客套话，直接输出一份结构极其严谨、犀利且具有决策参考价值的报告。
  请使用 Markdown 格式。

  **报告结构要求：**

  ### 1. 核心匹配度仪表盘
  - **总分（0-100）**：请给出一个预估的匹配分数。
  - **关键结论**：一句话总结（如：“技术能力超预期，但稳定性存在高风险”）。

  ### 2. 胜任力雷达分析
  请从以下维度对比（简历+面试表现 vs 岗位画像）：
  - **专业技能 (Hard Skills)**：匹配点与缺失点。
  - **综合素质 (Soft Skills)**：沟通、逻辑、抗压等（重点参考面试录音表现）。
  - **经验契合度**：过往项目与当前岗位的重合度。

  ### 3. 风险预警 (Red Flags) ⚠️
  基于简历断档、频繁跳槽、或者面试中的矛盾发言、性格缺陷等进行排查。如果面试录音中有消极信号，请务必指出。

  ### 4. 录用决策建议
  - **建议**：强烈推荐 / 推荐 / 谨慎考虑 / 不推荐。
  - **后续考察建议**：如果录用，试用期重点考察什么？如果还需要面试，下一轮问什么？
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};
