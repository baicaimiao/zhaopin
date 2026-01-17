
import { createClient } from '@supabase/supabase-js';
import { Job, Persona, Candidate } from '../types';

// 配置 MemFire Cloud (Supabase) 连接
const SUPABASE_URL = 'https://d5bkvn8g91huch72djcg.baseapi.memfiredb.com';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0NDEyOTc1NywiaWF0IjoxNzY3MzI5NzU3LCJpc3MiOiJzdXBhYmFzZSJ9.QAn4-KQa_yDYqcbfJMXcJsELEu8pacW0kGiV0p2dmIg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Mappers (处理前端驼峰命名 <-> 数据库下划线命名) ---

const mapPersonaFromDB = (p: any): Persona => ({
  id: p.id,
  title: p.title,
  description: p.description || '',
  responsibilities: p.responsibilities || '',
  knowledge: p.knowledge || '',
  skills_detail: p.skills_detail || '',
  literacy: p.literacy || '',
  experience: p.experience || '',
  warning_traits: p.warning_traits || '',
  core_tags: p.core_tags || '',
  requirements: p.requirements || [],
  skills: p.skills || [],
  aiSuggestions: p.ai_suggestions || ''
});

const mapJobFromDB = (j: any): Job => ({
  id: j.id,
  title: j.title,
  location: j.location,
  salary: j.salary,
  personaId: j.persona_id,
  createdAt: j.created_at,
  status: j.status
});

const mapCandidateFromDB = (c: any): Candidate => ({
  id: c.id,
  name: c.name,
  jobId: c.job_id,
  resumeUrl: c.resume_url,
  fullResumeText: c.full_resume_text,
  status: c.status,
  appliedAt: c.applied_at,
  basicInfo: c.basic_info, // JSONB 直接对应
  interviews: c.interviews || [], // JSONB 直接对应
  fitAnalysis: c.fit_analysis || '' // 新增映射
});

// --- CRUD Operations ---

export const db = {
  // 1. 获取所有初始化数据
  fetchAllData: async () => {
    const { data: jobsData, error: jobsError } = await supabase.from('jobs').select('*');
    const { data: personasData, error: personasError } = await supabase.from('personas').select('*');
    const { data: candidatesData, error: candidatesError } = await supabase.from('candidates').select('*');

    if (jobsError) console.error('Error fetching jobs:', jobsError);
    if (personasError) console.error('Error fetching personas:', personasError);
    if (candidatesError) console.error('Error fetching candidates:', candidatesError);

    return {
      jobs: (jobsData || []).map(mapJobFromDB),
      personas: (personasData || []).map(mapPersonaFromDB),
      candidates: (candidatesData || []).map(mapCandidateFromDB)
    };
  },

  // 2. 岗位 & 画像相关
  createJobAndPersona: async (job: Job, persona: Persona) => {
    // 插入画像
    const { error: pError } = await supabase.from('personas').insert({
      id: persona.id,
      title: persona.title,
      description: persona.description,
      responsibilities: persona.responsibilities,
      knowledge: persona.knowledge,
      skills_detail: persona.skills_detail,
      literacy: persona.literacy,
      experience: persona.experience,
      warning_traits: persona.warning_traits,
      core_tags: persona.core_tags,
      requirements: persona.requirements,
      skills: persona.skills,
      ai_suggestions: persona.aiSuggestions
    });
    if (pError) throw pError;

    // 插入岗位
    const { error: jError } = await supabase.from('jobs').insert({
      id: job.id,
      title: job.title,
      location: job.location,
      salary: job.salary,
      persona_id: job.personaId,
      created_at: job.createdAt,
      status: job.status
    });
    if (jError) throw jError;
  },

  updateJob: async (job: Job) => {
    const { error } = await supabase.from('jobs').update({
      title: job.title,
      location: job.location,
      salary: job.salary,
      status: job.status
    }).eq('id', job.id);
    if (error) throw error;
  },

  updatePersona: async (persona: Persona) => {
    const { error } = await supabase.from('personas').update({
      title: persona.title,
      description: persona.description,
      responsibilities: persona.responsibilities,
      knowledge: persona.knowledge,
      skills_detail: persona.skills_detail,
      literacy: persona.literacy,
      experience: persona.experience,
      warning_traits: persona.warning_traits,
      core_tags: persona.core_tags
    }).eq('id', persona.id);
    if (error) throw error;
  },

  deleteJob: async (jobId: string) => {
    // 由于有关联，理论上应该先删 candidates，再删 job，再删 persona
    // 这里简单处理：数据库若设置了级联删除最好，否则手动删
    // 1. 删除关联候选人
    await supabase.from('candidates').delete().eq('job_id', jobId);
    // 2. 查出 personaId
    const { data } = await supabase.from('jobs').select('persona_id').eq('id', jobId).single();
    // 3. 删除 job
    await supabase.from('jobs').delete().eq('id', jobId);
    // 4. 删除 persona
    if (data?.persona_id) {
        await supabase.from('personas').delete().eq('id', data.persona_id);
    }
  },

  // 3. 候选人相关
  createCandidate: async (candidate: Candidate) => {
    const { error } = await supabase.from('candidates').insert({
      id: candidate.id,
      name: candidate.name,
      job_id: candidate.jobId,
      resume_url: candidate.resumeUrl,
      full_resume_text: candidate.fullResumeText,
      status: candidate.status,
      applied_at: candidate.appliedAt,
      basic_info: candidate.basicInfo, // 自动序列化
      interviews: candidate.interviews,   // 自动序列化
      fit_analysis: candidate.fitAnalysis
    });
    if (error) throw error;
  },

  updateCandidate: async (candidate: Candidate) => {
    const { error } = await supabase.from('candidates').update({
      status: candidate.status,
      basic_info: candidate.basicInfo,
      interviews: candidate.interviews, // 关键：面试记录更新
      fit_analysis: candidate.fitAnalysis, // 更新综合分析
      // 其他字段通常创建后不变，但也加上防止万一
      name: candidate.name,
      full_resume_text: candidate.fullResumeText
    }).eq('id', candidate.id);
    if (error) throw error;
  },

  deleteCandidate: async (candidateId: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
    if (error) throw error;
  }
};
