const mongoose = require('mongoose');

/**
 * 核心用户 ID 解析器 (v1.5)
 * 支持 Firebase UID, MongoDB ObjectID, 姓名, 昵称的模糊识别
 * @param {string} userId 
 * @param {import('mongoose').Model} UserModel
 * @returns {Promise<string[]>} 解析后的 ID 列表 (去重)
 */
async function resolveUserIds(userId, UserModel) {
    if (!userId) return [];
    
    // 如果 UserModel 传入的是字符串或未定义，回退逻辑（防错）
    if (!UserModel) return [userId];

    const idList = [userId];
    
    // 模糊匹配查询
    const user = await UserModel.findOne({ 
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
    
    return [...new Set(idList)];
}

module.exports = { resolveUserIds };
