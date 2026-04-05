const TheoreticalBase = require('./TheoreticalBase');

/**
 * 知识库服务 (Expert Brain Knowledge Base)
 * 当前阶段：基于核心理论原则提供背景知识。
 * 未来扩展：支持从 MongoDB 进行向量搜索 (RAG)，读取论文、案例和诊疗记录。
 */
class KnowledgeService {
    /**
     * 根据查询语义获取相关的理论片段
     * @param {string} query 
     * @returns {string}
     */
    static getRelevantTheory(query = "") {
        const q = query.toLowerCase();
        let fragments = [`核心理念：${TheoreticalBase.corePhilosophy}`];

        // 简单的关键词匹配作为初步语义搜索的替代
        if (q.includes("吃") || q.includes("营养") || q.includes("饮食") || q.includes("胃")) {
            fragments.push(`【饮食养】: ${TheoreticalBase.fiveNursings.diet.principles.join(' ')}`);
        }
        if (q.includes("动") || q.includes("走") || q.includes("锻炼") || q.includes("体力")) {
            fragments.push(`【运动养】: ${TheoreticalBase.fiveNursings.exercise.principles.join(' ')}`);
        }
        if (q.includes("睡") || q.includes("累") || q.includes("疲") || q.includes("膏方")) {
            fragments.push(`【睡眠/膏方养】: ${TheoreticalBase.fiveNursings.sleep.principles.join(' ')}`);
        }
        if (q.includes("心") || q.includes("郁") || q.includes("焦虑") || q.includes("怕")) {
            fragments.push(`【心理养】: ${TheoreticalBase.fiveNursings.mental.principles.join(' ')}`);
        }
        if (q.includes("手") || q.includes("麻") || q.includes("疼") || q.includes("功能")) {
            fragments.push(`【功能养】: ${TheoreticalBase.fiveNursings.function.principles.join(' ')}`);
        }

        // 如果没有匹配，返回通用背景
        if (fragments.length === 1) {
            fragments.push("综合建议：应结合五养维度的全面平衡进行调理。");
        }

        return fragments.join('\n');
    }

    /**
     * 获取免责声明
     */
    static getDisclaimer() {
        return TheoreticalBase.disclaimer;
    }
}

module.exports = KnowledgeService;
