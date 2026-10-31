# 余额集成交接 / Balance integration

[中文](#chinese) | [English](#english) | [前端需求 F05](OPUS_FRONTEND_HANDOFF.md#balance-presentation) | [工程约定](HANDOVER.md)

状态：**已定位现有设计限制；正式宿主接入待实施。** 本文未新增可调用 API，也未修复启动余额读取。

<a id="english"></a>
## English

The current companion scrapes balance rows from DSH's account settings DOM every two seconds. Without mounted account settings, it has no source; its UI hides the balance when `balancesKnown` is false. The scraper also substitutes zero for missing fields and has an unsafe page-wide amount fallback. These are separate acquisition, data-model and presentation issues.

Codex owns a future capability-checked host account adapter; Opus owns presentation of its states. A local DSH source checkout exposes an account Remote service, but compatibility with the installed application and plugin access has not been verified. Do not invent endpoints, copy credentials, simulate opening settings, or call the Platform directly. Preserve unknown values and currency-separated decimal wallet amounts. Clear old data on identity/access changes and discard late requests. The proposed contract below is a design, not an existing export.

<a id="chinese"></a>
## 1. 当前代码事实

- `src/index.ts` 只处理宿主插件生命周期，没有查询余额或向客户端发布余额。
- `src/client/index.ts` 的 `queryAccountBalances()` 只扫描页面 `[class*="balanceCard"]` / `[class*="balance"]` 行和金额，检查间隔为两秒；没有账户 API 调用。
- 账户设置未挂载时，没有可读行；余额不是“查询得到 0”，而是**没有读取来源**。
- 没有匹配行时还会从全页任意 `[class*="amount"]` 猜前两项，存在读到无关金额或插件自身金额的风险。
- 读到一项时，另一项强制补成 `¥0.00`。`PetStateMachine.setBalances()` 只保留两个字符串和单一 `balancesKnown`，不能表达部分未知、时效、失败、币种列表或账户更换。
- `PetOverlay.tsx` 只在 `balancesKnown` 时展示余额，且容器在悬停工具栏内。数据未读到或工具栏收起时，用户会认为功能消失。
- 关掉宿主账户页后，现有逻辑会继续保留上次读到的字符串，没有账户归属和过期标记。不能继续标为“实时”。

因此，打开一次 DSH 账户设置后才能看到余额，符合当前 DOM 读取机制。**不能只把余额栏改成始终显示 `0` 来“修复”。**

## 2. 已查阅的宿主源码线索

本机相邻 `deepseek-harness` 源码中存在以下路径，作为后续集成调查起点；本轮没有验证它们与用户已安装的 DSH 构建完全相同：

- `packages/client/ui-settings-account/src/client/index.ts`：注入 `remote`、`remote.account`、`remoteAccess` 等服务，使用 `ctx.remote.account.getBalance(client())`；返回值有 `ok/value` 封装。通过 `remoteAccess.whenAccess('account/watch', ...)` 管理账户状态订阅和访问撤销，账户签入后执行 refresh，账户设置再次进入时也 refresh。
- 同目录 `client-metadata.ts`：`AccountClientMetadata` 包含宿主客户端版本、locale、时区秒偏移；宿主版本来自其构建注入。插件不能把自身 `0.4.0` 冒充 DSH 版本，也不能假定自己的运行包里有 `process.env.DSH_CLIENT_VERSION`。
- 同目录 `AccountSection.tsx`：消费账户 snapshot 的 `details.balance`，`ready` 时区分充值 `value` 与 `bonusWallets`。为零的赠金行可能不显示，因此“没有赠金 DOM 行”不证明金额为零。
- `packages/api/account-controller/src/index.ts`：`AccountController.getBalance(client)` 委托 `deepseekAccount.getBalance(client)`；服务签名返回 `AccountDetails['balance'] | null`。这不是一个已验证可由插件随意调用的 HTTP 路径。
- `packages/credentials/deepseek-account/src/types.ts`：`AccountWallet` 使用 `CNY | USD` 与十进制金额字符串；`AccountDetails.balance` 区分 ready/failed，ready 同时给充值钱包和赠金钱包。

正式方案优先复用可授权的宿主服务或公开共享 snapshot。账户组件里的闭包 snapshot 并非自动暴露给插件，不能通过 React 私有 Fiber 抓取它。若当前插件装载顺序或权限不支持该服务，应明确降级；不要为查询余额让整个桌宠加载失败。

## 3. Codex 后续实现任务

### B01 验证接入能力

在实际 DSH 上确认版本、服务注册、可选注入/访问约束、账户身份变化信号和客户端元数据来源。先用最小只读验证，不触发登录、充值、赠金确认或账户设置操作。源码存在不等于运行时服务可用。

采用正式宿主接口时，不读取、存储或输出 token，不自行请求 DeepSeek Platform。日志只记状态和失败类别，不包含账号标识、原始钱包结果或认证信息。

### B02 建立单一账户余额适配层

下面是**拟议契约**，还没有加入 `src/`，Opus 不得直接 import：

```ts
type Currency = 'CNY' | 'USD'
type Wallet = { currency: Currency; amount: string } // 十进制字符串
type WalletRead =
  | { status: 'unknown' }
  | { status: 'ready'; wallets: readonly Wallet[] }
  | { status: 'failed' }

interface BalanceSnapshot {
  status: 'unavailable' | 'loading' | 'ready' | 'partial' | 'stale'
    | 'signed-out' | 'error'
  source: 'host' | 'dom' | 'none'
  toppedUp: WalletRead
  granted: WalletRead
  updatedAt: number | null // 最近成功读到的钱包时间，不是渲染时间
}

// 运行时接口建议：getSnapshot()、subscribe(listener)、refresh()、dispose()。
// 账户归属/请求代次保留在适配层内部，不向展示层暴露账号与凭据。
```

- 未读到、无权限、登录失效、接口失败与确实为零必须区分。ready 的空钱包列表须以宿主明确语义为依据，不能把 DOM 缺行当作空列表。
- 按币种分别保留充值和赠金；不用字符串拼接后转 number，更不能把 `¥1.00$2.00` 解析为单一余额。
- 低余额和“还能吃几碗”只对同一币种完整、有效的数据计算；`ricePrice` 当前没有币种属性，需明确可用币种再启用该估算，不能把 USD 当 CNY。
- 不持久化钱包或身份；临时失败可在同一身份下保留最近成功值，标 stale。退出、切账户或撤销访问立即清空。
- 独立控制加载/失败状态，不能让钱包读取打断模型状态或聊天观察。

### B03 刷新策略与生命周期

- 初始化时能力探测、已签入且可访问才读取；首次成功不依赖用户打开设置。
- 优先用宿主账户变化/回到前台/用户手动刷新触发；请求合并，避免两个入口同时打多次。建议成功后最短 60 秒间隔，失败指数退避，上限约 5 分钟；具体服从宿主限制，不使用现有两秒 DOM 扫描间隔请求网络。
- 流式回答结束可使余额失效并安排一次节流刷新；不能每个 token 都查账户。
- 账户切换时增加请求代次；旧请求即使稍后成功，也不能覆盖新账户。卸载后不发布状态，取消订阅和计时器；接口支持取消则取消。
- 多实例/热重载不重复订阅。服务不可用时仍能加载桌宠。

### B04 保守 DOM 降级

正式接口无法使用时，保留显式受限降级：只读宿主账户卡片，排除 `[data-whale-pet]`；删除全页金额猜测，按标签和独立子金额识别币种。部分缺失保持 unknown。提示用户“打开 DSH 账户设置以读取余额”。

DOM 降级不能可靠观测账户切换；没有可验证的身份/访问生命周期时，离开卡片后不能无限保留上次账户数据。宁可退回 unavailable，也不要把旧账户金额当实时值。不要在后台自动点击打开设置，也不要扫描私有 React 状态。

## 4. 接口与前端联调验收

- 冷启动且从未进入设置：正式宿主支持时能读到；不支持时显示 unavailable，绝非零余额。
- 充值为零、赠金为零：确实返回零时显示零；一项缺失时另一项不被抹掉，也不补零。
- CNY、USD、同时多币种、赠金空列表、金额小数和非法金额各有覆盖；不同币种不合并。
- 网络失败、访问撤销、未登录：状态准确，无虚假低余额提醒；重试有退避。
- A 账户慢请求未结束时切到 B，再让 A 请求返回：B 的展示不出现 A 的值；退出立即清空。
- 插件卸载或重新加载时，旧请求和订阅不产生 UI 更新，没有遗留轮询。
- 设置面板/宿主账户页关闭后，插件自身仍能通过正式接口更新，不靠页面是否挂载。
- UI 使用真实状态，示例金额仅在开发预览里；余额可见性与工具栏收起相互独立。

后端实现前先补适配层单测；完成后在实际 DSH 上验证首次读取及身份切换，再更新 README 兼容性描述。当前 39 项测试不包含这些新验收，不能宣称已解决。
