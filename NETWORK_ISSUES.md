# 网络连接问题解决方案

## 问题现象
- 错误：`ConnectTimeoutError: Connect Timeout Error`
- 无法连接到 `generativelanguage.googleapis.com`
- API Key 测试失败

## 原因分析
服务器无法连接到 Google 的 Gemini API 服务器，可能的原因：

1. **网络连接问题**：服务器无法访问外网
2. **防火墙阻止**：防火墙阻止了 HTTPS (443) 端口连接
3. **需要代理**：在中国大陆等地区，需要配置代理才能访问 Google 服务
4. **DNS 解析问题**：无法解析 Google 的域名

## 解决方案

### 方案 1: 配置 HTTP 代理（推荐）

如果您的服务器需要通过代理访问外网，可以配置环境变量：

#### Windows (PowerShell)
```powershell
$env:HTTP_PROXY="http://proxy.example.com:8080"
$env:HTTPS_PROXY="http://proxy.example.com:8080"
npm run start:ts
```

#### Linux/macOS
```bash
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="http://proxy.example.com:8080"
npm run start:ts
```

#### 使用 .env 文件
在项目根目录创建或编辑 `.env` 文件：
```env
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1
```

### 方案 2: 检查网络连接

在服务器上测试网络连接：

#### Windows (PowerShell)
```powershell
# 测试 DNS 解析
Resolve-DnsName generativelanguage.googleapis.com

# 测试 HTTPS 连接
Test-NetConnection generativelanguage.googleapis.com -Port 443
```

#### Linux/macOS
```bash
# 测试 DNS 解析
nslookup generativelanguage.googleapis.com

# 测试 HTTPS 连接
curl -v https://generativelanguage.googleapis.com
```

### 方案 3: 配置 Node.js 使用代理

如果环境变量不起作用，可以在代码中配置代理。需要安装 `https-proxy-agent`：

```bash
npm install https-proxy-agent
```

然后修改 `apps/server/src/routes/settings.ts`，在 fetch 调用中添加代理：

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

// 在 fetch 调用中
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
  agent: agent  // 添加代理
});
```

### 方案 4: 使用 VPN 或代理服务

如果服务器在中国大陆，建议：

1. **使用 VPN**：配置系统级 VPN
2. **使用代理服务**：配置 HTTP/HTTPS 代理
3. **使用云服务**：将服务器部署到可以访问 Google 服务的地区

### 方案 5: 临时解决方案 - 跳过 API Key 测试

如果暂时无法解决网络问题，可以：

1. 直接保存 API Key（不测试）
2. 在浏览器中直接测试 API Key（浏览器可能可以访问）
3. 使用其他可以访问 Google 服务的服务器进行测试

## 验证网络连接

在服务器上运行以下命令验证连接：

```bash
# 测试 Google API 连接
curl -v "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

如果这个命令也失败，说明确实是网络连接问题。

## 常见错误码

- `UND_ERR_CONNECT_TIMEOUT`: 连接超时（10秒内无法建立连接）
- `UND_ERR_CONNECT`: 连接失败
- `ENOTFOUND`: DNS 解析失败
- `ECONNREFUSED`: 连接被拒绝

## 下一步

1. 确认网络连接状态
2. 配置代理（如果需要）
3. 重启服务器
4. 再次测试 API Key

