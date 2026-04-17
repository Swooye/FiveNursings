const mongoose = require('mongoose');

// --- Simple In-Memory ID Mapping Cache (To prevent poll-induced DB overload) ---
const idMappingCache = new Map();

/**
 * 核心用户 ID 解析器
 * 支持 Firebase UID, MongoDB ObjectID, 姓名, 昵称的模糊识别
 */
async function resolveUserIds(userId) {
    if (!userId) return [];
    if (idMappingCache.has(userId)) return idMappingCache.get(userId);

    const { User } = require('../models');
    const idList = [userId];
    
    try {
        const user = await User.findOne({ 
            $or: [
                { firebaseUid: userId }, 
                { _id: mongoose.isValidObjectId(userId) ? userId : null },
                { name: userId },
                { nickname: userId }
            ] 
        }).select('_id firebaseUid').lean();
        
        if (user) {
            if (user.firebaseUid) idList.push(user.firebaseUid);
            if (user._id) idList.push(user._id.toString());
        }
        
        const uniqueIds = [...new Set(idList)];
        if (uniqueIds.length > 1) idMappingCache.set(userId, uniqueIds);
        return uniqueIds;
    } catch (e) {
        console.error("[ID Resolver] Failed to resolve:", e);
        return [userId];
    }
}

/**
 * 获取归一化后的主 ID (MongoDB _id)
 */
async function resolvePrimaryId(userId) {
    const { User } = require('../models');
    const user = await User.findOne({
        $or: [{ firebaseUid: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
    }).select('_id').lean();
    return user ? user._id.toString() : userId;
}

/**
 * 标准化 Generic Routes 的过滤参数
 */
async function normalizeUserIdFilter(query) {
    const filters = { ...query };
    if (filters.userId) {
        const idList = await resolveUserIds(filters.userId);
        filters.userId = { $in: idList };
    }
    return filters;
}

module.exports = {
    resolveUserIds,
    resolvePrimaryId,
    normalizeUserIdFilter
};
