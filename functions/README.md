# 云存档（Cloudflare Pages Functions + KV）

免费方案：站点本身已部署在 Cloudflare Pages（GitHub push 自动部署），接口文件放在仓库
`functions/api/` 目录，随站点一起自动部署，与站点同源，无需 wrangler、无需单独 Worker。

## 接口

| 路由 | 说明 |
|---|---|
| `POST /api/save` | body `{ uid, deviceKey, state }`，首次调用把 deviceKey 绑定到 uid |
| `GET /api/load?uid=<userId>&key=<deviceKey>` | 返回 `{ success, state }` |

鉴权模型：uid + deviceKey 绑定，防止陌生人瞎猜 uid 读写存档。这不是真正的账号系统，
但没有服务端计算开销、零成本。

## 需要在 Cloudflare 控制台做的一次性配置（不装任何工具）

因为 Pages 是从 GitHub 自动构建的，KV 绑定要在**控制台**里配（不是 wrangler.toml）：

1. **创建 KV**：控制台 → Storage & Databases → KV → Create namespace，名字 `SAVE_KV`
2. **绑定到 Pages 项目**：控制台 → Workers & Pages → 选中 `happy-town7` 项目 →
   **Settings** → **Bindings** → **Add** → **KV namespace**
   - **Variable name 必须填 `SAVE_KV`**（代码里 `env.SAVE_KV` 对应）
   - Namespace 选第 1 步创建的
3. 保存后**重新部署一次**（GitHub 随便推一个提交，或控制台里点 Retry deployment），
   绑定才会在新构建里生效

## 前端行为（无需任何手动配置）

- 站点跑在 Pages 域名上时自动启用云同步（接口同源 `/api`）
- 本地 `npm run dev`（localhost）自动跳过，不会往云端写
- 特殊情况（站点和接口不同域名）可在设置页手动填接口地址覆盖
- 上传节流 60 秒一次，每天写入量远低于 KV 免费额度（1000 次/天）
- 每次启动比较云端/本地时间戳，云端新则自动恢复

## 验证

部署后访问：

```
https://你的站点.pages.dev/api/load?uid=test&key=test
```

返回 `{"success":false,"error":"no save"}` 即接口和 KV 绑定都正常（没存档是预期）。

## 换设备

旧设备：设置 → 云同步 → 「设备迁移」→ 复制 48 位迁移码
新设备：进游戏后同样位置粘贴迁移码 → 接管 → 自动刷新并拉取云端存档。
