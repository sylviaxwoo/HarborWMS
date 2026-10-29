# HarborWMS

多仓、多货主仓储与物流协同演示平台（WMS），覆盖入库收货上架、出库预占拣货发货、轻量运输与循环箱、运费对账；支持中文 / English / Español。

依据产品需求文档 `docs/WMS_PRD.md` 的 P0 演示闭环实现：本地持久化、种子数据一键重置、角色切换演示、模拟 ERP/OMS 同步（非真实外部连接）。

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址：[http://127.0.0.1:43123](http://127.0.0.1:43123)

生产构建：

```bash
npm run build
npm run start
```

## 演示主线

1. **入库 → 上架**：入库管理打开 `INB-2026-0100`，实收 98（预期 100），确认上架；短收可关闭。重复点「重复同步」验证幂等。
2. **出库 → 发货**：出库单分配 / 拣货 / 复核 / 发货；库存不足订单可「跨仓拆单」。发货后生成运费事件。
3. **运输 + 循环箱**：发货详情创建运输任务 → 派车签收；发放循环箱后在资产页部分归还。
4. **运费对账**：费用页加载三行演示 CSV → 自动匹配（一致 / 差额 / 无证据）→ 差异处理 → 审批结算。

右上角可切换语言与演示角色；「重置演示数据」恢复种子状态。货主只读角色（Aurora ReadOnly）用于验证货主隔离。

## 技术栈

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Zustand + localStorage 集中持久化
- 领域函数：库存守恒、FIFO 预占、可解释分仓评分、运费计费与账单匹配

## 规划中（导航可见但标注）

报表自定义看板、完整盘点审批 UI、租金/仓储费完整计费引擎、真实权限与外部 API——见 PRD P1/P2。

## 推送到自己的 GitHub

当前云端会话使用 Cursor 托管的临时远程。把代码放到你自己的 GitHub：

1. 在 Cursor 代理界面点击 **Create repo**（若尚未创建），或在 GitHub 新建空仓库。
2. 本地克隆后把本仓库内容推上去，例如：

```bash
git remote add github https://github.com/<your-user>/<your-repo>.git
git push -u github main
```

也可用 GitHub CLI：`gh repo create` 后 push。回家后即可从该仓库继续开发或部署（Vercel / 任意 Node 主机）。
