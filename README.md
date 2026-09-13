# 袋鼠小院管理后台 · kangaroo-courtyard-admin

面向管理员和运营人员的 Vue 3 Web 后台，与袋鼠小院 Java 后端配合完成系统管理。

## 项目简介

基于若依 RuoYi-Vue3，现有页面包括账号登录、个人资料、用户/角色/菜单/部门/岗位管理、字典与参数、公告，以及在线用户、日志、缓存和服务器监控。包含动态路由、权限控制、文件上传、富文本编辑和 ECharts 可视化等基础组件。

旅游报名、房源经营、支付等专有业务尚未接入此 Web 后台，不应将小程序员工端展示页等同于已完成的后台 API。登录页只允许记住账号，不再将密码写入 Cookie；含示例私钥的上游工具保留在本机并排除提交。

## 技术栈

- Vue 3.5.26、JavaScript、Vue Router 4.6.4、Pinia 3.0.4
- Vite 6.4.1、`@vitejs/plugin-vue`、Sass
- Element Plus 2.13.1、Element Plus Icons
- Axios 1.13.2、ECharts 5.6.0、Quill 编辑器
- SVG 图标、自动导入、压缩构建插件

当前源码以 JavaScript 为主，并非 TypeScript 项目。

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| kangaroo-courtyard-backend | 后端服务与权限基础 | [kangaroo-courtyard-backend](https://github.com/jiangyi3265/kangaroo-courtyard-backend) |
| kangaroo-courtyard-admin | Web 管理后台 | [kangaroo-courtyard-admin](https://github.com/jiangyi3265/kangaroo-courtyard-admin) |
| kangaroo-courtyard-app | 用户端与员工移动端原型 | [kangaroo-courtyard-app](https://github.com/jiangyi3265/kangaroo-courtyard-app) |

三个仓库共同承载袋鼠小院项目。当前后端和 Web 管理端提供若依基础管理能力；小程序端已实现业务页面与部分本地交互，微信登录、员工授权、旅居业务 API、支付和消息接口尚待集成，不能视为已完成生产联调。

## 快速启动

准备 Node.js 与 npm（满足 Vite 6 及依赖的 engine 要求），先按关联后端仓库 README 启动 Java 服务。

首次克隆后，在 PowerShell 中复制不含敏感信息的环境示例：

```powershell
Copy-Item config/env.development.example .env.development
Copy-Item config/env.production.example .env.production
Copy-Item config/env.staging.example .env.staging
```

```bash
npm ci
npm run dev
```

`vite.config.js` 中开发端口为 `80`，`/dev-api` 默认代理到 `http://localhost:8080`。如端口不可用，可执行实际 Vite 参数：

```bash
npm run dev -- --port 5173
```

构建与预览：

```bash
npm run build:prod
npm run build:stage
npm run preview
```

`build:prod` 使用生产环境配置，`build:stage` 使用 staging 配置。生产部署需在网关将 `/prod-api` 路径转发至后端并去除该前缀。所有 `VITE_*` 都会进入浏览器构建结果，只可填写标题和公开 API 路径，不能存放数据库密码、私钥或 Token。

管理员账号与密码应在后端初始化时自行设置；仓库不提供默认密码。依赖安装使用已提交的 `package-lock.json`。

## 项目结构

```text
src/api/          登录、系统和监控模块 API 封装
src/views/        登录、首页、系统管理与监控页面
src/router/       路由定义
src/store/        Pinia 状态与权限状态
src/layout/       后台布局与导航
src/components/   表单、上传、编辑器等公共组件
src/utils/        请求、权限、文件等工具
src/assets/       样式、图片和图标
vite/             Vite 插件配置
config/           公开环境配置示例
public/           公共静态文件
```

## 简历描述示例

参与袋鼠小院 Web 管理端工程建设，基于 Vue 3、Pinia、Element Plus 和 Axios 整理账号权限、系统管理及监控页面，并对接 Spring Boot 后端基础 API；完成环境配置隔离和登录凭据存储治理。请根据个人实际贡献调整，避免将若依已有模块全部归为个人开发。

## 开源来源

基于 [RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)，保留 MIT `LICENSE` 与上游版权声明。后续袋鼠小院业务功能在本仓库独立迭代。
