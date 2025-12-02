const geminiService = require('./geminiService');
const fs = require('fs').promises;
const path = require('path');

class ImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 保存 base64 图像到文件
   * @param {string} base64Data - base64 图像数据
   * @param {string} filename - 文件名
   * @returns {Promise<string>} 文件路径
   */
  async saveImage(base64Data, filename) {
    // 提取 base64 数据（移除 data:image/...;base64, 前缀）
    const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('无效的 base64 图像数据');
    }

    const [, mimeType, data] = base64Match;
    const extension = mimeType === 'jpeg' ? 'jpg' : mimeType;
    const filepath = path.join(this.uploadDir, `${filename}.${extension}`);
    const buffer = Buffer.from(data, 'base64');

    await fs.writeFile(filepath, buffer);
    return `/uploads/${filename}.${extension}`;
  }

  /**
   * 生成并保存图像
   */
  async generateAndSave(prompt, style, characterRefs, options) {
    const result = await geminiService.generateImage(prompt, style, characterRefs, options);
    
    // 生成唯一文件名
    const filename = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filepath = await this.saveImage(result.imageUrl, filename);
    
    return {
      ...result,
      filepath: filepath,
      filename: filename
    };
  }
}

module.exports = new ImageService();

