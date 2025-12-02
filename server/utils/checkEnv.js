// 环境变量检查工具
require('dotenv').config();

function checkEnvironment() {
  const required = ['GEMINI_API_KEY'];
  const missing = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error('❌ 缺少必需的环境变量:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\n请创建 .env 文件并设置这些变量。参考 .env.example');
    return false;
  }

  console.log('✅ 环境变量检查通过');
  return true;
}

module.exports = { checkEnvironment };

