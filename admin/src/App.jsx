import { Refine, Authenticated, useMenu, useLogout } from "@refinedev/core";
import {
  useNotificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
  RefineThemes,
  AuthPage,
  useThemedLayoutContext,
} from "@refinedev/antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  ProfileOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  FileTextOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { ConfigProvider, App as AntdApp, Button, Divider, Menu, Layout } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter, Route, Routes, Outlet, Link, useLocation } from "react-router-dom";
import routerBindings, {
  NavigateToResource,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import dataProvider from "@refinedev/simple-rest";

import { UserList } from "./pages/users/list";
import { UserCreate } from "./pages/users/create";
import { UserEdit } from "./pages/users/edit";
import { UserShow } from "./pages/users/show";
import { PlanList } from "./pages/plans/list";
import { PlanShow } from "./pages/plans/show";
import { MallItemList } from "./pages/mall_items/list";
import { MallItemCreate } from "./pages/mall_items/create";
import { MallItemEdit } from "./pages/mall_items/edit";
import { ProtocolList } from "./pages/protocols/list";
import { ProtocolEdit } from "./pages/protocols/edit";
import { AdminList } from "./pages/admins/list";
import { AdminCreate } from "./pages/admins/create";
import { AdminEdit } from "./pages/admins/edit";
import { RoleList } from "./pages/roles/list";
import { RoleCreate } from "./pages/roles/create";
import { RoleEdit } from "./pages/roles/edit";
import { OrderList } from "./pages/orders/list";
import { OrderShow } from "./pages/orders/show";
import { OrderCreate } from "./pages/orders/create";
import { ProviderList } from "./pages/providers/list";
import { ProviderCreate } from "./pages/providers/create";
import { ProviderEdit } from "./pages/providers/edit";

import "@refinedev/antd/dist/reset.css";

// Vite Refresh Buster: 2026-04-17 17:16

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3002/api";

const authProvider = {
  login: async ({ email, password }) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("auth", JSON.stringify(data.user));
        return { success: true, redirectTo: "/" };
      }
    } catch (e) {
      console.error("Login error", e);
    }
    return {
      success: false,
      error: { name: "LoginError", message: "邮箱或密码错误" },
    };
  },
  logout: async () => {
    localStorage.removeItem("auth");
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    return localStorage.getItem("auth")
      ? { authenticated: true }
      : { authenticated: false, redirectTo: "/login" };
  },
  getPermissions: async () => null,
  getIdentity: async () => {
    const user = localStorage.getItem("auth");
    return user ? JSON.parse(user) : null;
  },
  forgotPassword: async ({ email }) => {
    // 逻辑占位，后续可对接实际邮件服务
    return { success: true };
  },
  onError: async (error) => {
    console.error(error);
    return { error };
  },
};

const i18nProvider = {
  translate: (key, options, defaultMessage) => {
    const translations = {
      "buttons.create": "新建",
      "buttons.edit": "编辑",
      "buttons.save": "保存",
      "buttons.delete": "删除",
      "buttons.confirm": "确认",
      "buttons.cancel": "取消",
      "buttons.show": "查看",
      "buttons.list": "列表",
      "buttons.refresh": "刷新",
      "buttons.logout": "退出登录",
      "actions.add": "添加",
      "actions.edit": "编辑",
      "actions.save": "保存",
      "actions.delete": "删除",
      "pages.breadcrumb.create": "新建",
      "pages.breadcrumb.edit": "编辑",
      "pages.breadcrumb.show": "详情",
      "pages.breadcrumb.list": "列表",
      "notifications.success": "成功",
      "notifications.error": "错误",
      "notifications.createSuccess": "创建成功",
      "notifications.editSuccess": "保存成功",
      "notifications.deleteSuccess": "删除成功",
      "pages.login.title": "康养家管理后台",
      "pages.login.fields.email": "邮箱",
      "pages.login.fields.password": "密码",
      "pages.login.buttons.rememberMe": "记住我",
      "pages.login.buttons.forgotPassword": "忘记密码？",
      "pages.login.signin": "登录",
      "pages.login.buttons.noAccount": "还没有账号？",
      "pages.login.signup": "注册",
      "users.titles.list": "客户列表管理",
      "users.titles.create": "录入新客户",
      "users.titles.edit": "编辑客户信息",
      "users.titles.show": "客户详情查看",
      "plans.titles.list": "康复计划导出",
      "plans.titles.show": "计划详情",
      "mall_items.titles.list": "商城商品管理",
      "mall_items.titles.create": "新增商品",
      "mall_items.titles.edit": "编辑商品",
      "orders.titles.list": "订单流水查看",
      "orders.titles.create": "补录订单",
      "providers.titles.list": "服务机构名录",
      "providers.titles.create": "合作机构入驻",
      "providers.titles.edit": "修改机构资料",
      "protocols.titles.list": "后台协议配置",
      "protocols.titles.edit": "修订协议",
      "roles.titles.list": "系统角色定义",
      "roles.titles.create": "新增角色",
      "roles.titles.edit": "权限配置",
      "admins.titles.list": "后台用户列表",
      "admins.titles.create": "开通管理员",
      "admins.titles.edit": "修改管理员",
      "dashboard.title": "控制台",
      "warn.confirm": "确认",
      "warn.cancel": "取消",
      "pages.error.404": "页面未找到",
      "pages.error.backHome": "返回主页",
    };
    return translations[key] || defaultMessage || key;
  },
  changeLocale: (lang) => Promise.resolve(),
  getLocale: () => "zh-CN",
};

const CustomTitle = ({ collapsed }) => (
  <div
    style={{
      height: "64px",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: "0",
      fontWeight: "bold",
      fontSize: collapsed ? "14px" : "18px",
      color: "#1890ff",
      overflow: "hidden",
      whiteSpace: "nowrap",
    }}
  >
    {collapsed ? "康养家" : "康养家管理后台"}
  </div>
);

const CustomSider = () => {
  const { siderCollapsed, setSiderCollapsed } = useThemedLayoutContext();
  const { menuItems } = useMenu();
  const { pathname } = useLocation();
  const { mutate: logout } = useLogout();

  // 用当前路径精准匹配选中的菜单项
  const selectedKey =
    menuItems.find(
      (item) =>
        item.route &&
        (pathname === item.route || pathname.startsWith(item.route + "/"))
    )?.key || "";

  const menuConfig = menuItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link to={item.route || "/"}>{item.label}</Link>,
  }));

  return (
    <Layout.Sider
      width={240}
      collapsed={siderCollapsed}
      collapsedWidth={80}
      style={{ 
        background: "#fff", 
        borderRight: "1px solid #f0f0f0", 
        height: "100vh", 
        position: "sticky", 
        top: 0,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* 顶部标题 */}
        <div
          style={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: siderCollapsed ? 13 : 17,
            color: "#1677ff",
            overflow: "hidden",
            whiteSpace: "nowrap",
            padding: "0 8px",
            borderBottom: "1px solid #f0f0f0"
          }}
        >
          {siderCollapsed ? "康养家" : "康养家管理后台"}
        </div>

        {/* 主菜单 - 撑满剩余空间 */}
        <div style={{ flex: 1, overflow: "hidden auto", padding: "8px 0" }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuConfig}
            style={{ border: "none" }}
            inlineIndent={24}
          />
        </div>

        {/* 底部：退出登录 + 折叠按钮 */}
        <div style={{ flexShrink: 0, paddingBottom: 4 }}>
          <Divider style={{ margin: 0 }} />
          <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <Menu
              mode="inline"
              selectable={false}
              style={{ border: "none", flex: 1 }}
              inlineIndent={24}
              items={[{
                key: "logout",
                icon: <LogoutOutlined />,
                label: siderCollapsed ? null : "退出登录",
                onClick: () => logout(),
              }]}
            />
            {!siderCollapsed && (
              <Button
                type="text"
                size="large"
                icon={<MenuFoldOutlined />}
                onClick={() => setSiderCollapsed(true)}
                style={{ color: "#8c8c8c", position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
              />
            )}
          </div>
          {siderCollapsed && (
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}>
              <Button
                type="text"
                size="large"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setSiderCollapsed(false)}
                style={{ color: "#8c8c8c" }}
              />
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        /* 1. 修复选中状态：改为左侧蓝条 + 方形背景 */
        .ant-menu-light .ant-menu-item {
          border-radius: 0 !important;
          margin-inline: 0 !important;
          margin-block: 4px !important;
          width: 100% !important;
        }
        .ant-menu-light .ant-menu-item-selected {
          background-color: #e6f4ff !important;
          color: #1677ff !important;
          border-left: 3px solid #1677ff !important;
          padding-left: 21px !important; /* 减去 3px border 深度以保持文字对齐 */
        }
        .ant-menu-light .ant-menu-item:active, 
        .ant-menu-light .ant-menu-submenu-title:active {
          background-color: #f5f5f5 !important;
        }
        
        /* 2. 移除 Menu 默认的高度限制，让文字更紧凑 */
        .ant-menu-item {
          height: 48px !important;
          line-height: 48px !important;
        }
        
        /* 3. 退出登录按钮特殊处理：去除多余间距 */
        .ant-layout-sider .ant-menu-inline {
          background: transparent !important;
        }
      `}</style>
    </Layout.Sider>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue} locale={zhCN}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider(API_URL)}
            notificationProvider={useNotificationProvider}
            routerProvider={routerBindings}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            Title={CustomTitle}
            resources={[
              {
                name: "users",
                list: "/users",
                create: "/users/create",
                edit: "/users/edit/:id",
                show: "/users/show/:id",
                meta: { label: "客户管理", icon: <UserOutlined /> },
              },
              {
                name: "plans",
                list: "/plans",
                show: "/plans/show/:id",
                meta: { label: "康复计划", icon: <ProfileOutlined /> },
              },
              {
                name: "mall_items",
                list: "/mall_items",
                create: "/mall_items/create",
                edit: "/mall_items/edit/:id",
                meta: { label: "商城商品", icon: <ShopOutlined /> },
              },
              {
                name: "orders",
                list: "/orders",
                show: "/orders/show/:id",
                create: "/orders/create",
                meta: { label: "订单管理", icon: <ShoppingCartOutlined /> },
              },
              {
                name: "providers",
                list: "/providers",
                create: "/providers/create",
                edit: "/providers/edit/:id",
                meta: { label: "机构管理", icon: <BankOutlined /> },
              },
              {
                name: "protocols",
                list: "/protocols",
                edit: "/protocols/edit/:id",
                meta: { label: "协议管理", icon: <FileTextOutlined /> },
              },
              {
                name: "roles",
                list: "/roles",
                create: "/roles/create",
                edit: "/roles/edit/:id",
                meta: { label: "角色管理", icon: <SecurityScanOutlined /> },
              },
              {
                name: "admins",
                list: "/admins",
                create: "/admins/create",
                edit: "/admins/edit/:id",
                meta: { label: "管理员管理", icon: <TeamOutlined /> },
              },
            ]}
          >
            <Routes>
              <Route
                element={
                  <Authenticated
                    key="authenticated-inner"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <ThemedLayoutV2 Title={CustomTitle} Sider={CustomSider}>
                      <Outlet />
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                <Route
                  index
                  element={<NavigateToResource resource="users" />}
                />

                <Route path="/users">
                  <Route index element={<UserList />} />
                  <Route path="create" element={<UserCreate />} />
                  <Route path="edit/:id" element={<UserEdit />} />
                  <Route path="show/:id" element={<UserShow />} />
                </Route>

                <Route path="/plans">
                  <Route index element={<PlanList />} />
                  <Route path="show/:id" element={<PlanShow />} />
                </Route>

                <Route path="/mall_items">
                  <Route index element={<MallItemList />} />
                  <Route path="create" element={<MallItemCreate />} />
                  <Route path="edit/:id" element={<MallItemEdit />} />
                </Route>

                <Route path="/orders">
                  <Route index element={<OrderList />} />
                  <Route path="show/:id" element={<OrderShow />} />
                  <Route path="create" element={<OrderCreate />} />
                </Route>

                <Route path="/protocols">
                  <Route index element={<ProtocolList />} />
                  <Route path="edit/:id" element={<ProtocolEdit />} />
                </Route>

                <Route path="/admins">
                  <Route index element={<AdminList />} />
                  <Route path="create" element={<AdminCreate />} />
                  <Route path="edit/:id" element={<AdminEdit />} />
                </Route>

                <Route path="/roles">
                  <Route index element={<RoleList />} />
                  <Route path="create" element={<RoleCreate />} />
                  <Route path="edit/:id" element={<RoleEdit />} />
                </Route>

                <Route path="/providers">
                  <Route index element={<ProviderList />} />
                  <Route path="create" element={<ProviderCreate />} />
                  <Route path="edit/:id" element={<ProviderEdit />} />
                </Route>

                <Route path="*" element={<ErrorComponent />} />
              </Route>

              <Route
                element={
                  <Authenticated
                    key="authenticated-auth"
                    fallback={<Outlet />}
                  >
                    <NavigateToResource />
                  </Authenticated>
                }
              >
                <Route
                  path="/login"
                  element={
                    <AuthPage
                      type="login"
                      title="康养家管理后台"
                      registerLink={false}
                      forgotPasswordLink={
                        <a href="/forgot-password" style={{ fontSize: "12px", float: "right" }}>
                          忘记密码？
                        </a>
                      }
                      formProps={{
                        initialValues: {
                          email: "admin@fivenursings.com",
                          password: "123789",
                        },
                      }}
                    />
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <AuthPage
                      type="forgotPassword"
                      title="康养家管理后台"
                    />
                  }
                />
              </Route>
            </Routes>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
