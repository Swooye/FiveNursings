import { Refine, Authenticated } from "@refinedev/core";
import {
  useNotificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
  RefineThemes,
  AuthPage,
} from "@refinedev/antd";
import { ConfigProvider, App as AntdApp } from "antd";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
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
import { MallItemList } from "./pages/mall_items/list";
import { MallItemCreate } from "./pages/mall_items/create";
import { MallItemEdit } from "./pages/mall_items/edit";
import { ProtocolList } from "./pages/protocols/list";
import { AdminList } from "./pages/admins/list";

import "@refinedev/antd/dist/reset.css";

// 动态识别环境：开发环境用代理，生产环境用 Firebase URL
const API_URL = import.meta.env.DEV ? "/api" : "https://api-u46fik5vcq-uc.a.run.app";

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
    } catch (e) { console.error("Login error", e); }
    return { success: false, error: { name: "LoginError", message: "邮箱或密码错误" } };
  },
  logout: async () => {
    localStorage.removeItem("auth");
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    return localStorage.getItem("auth") ? { authenticated: true } : { authenticated: false, redirectTo: "/login" };
  },
  getPermissions: async () => null,
  getIdentity: async () => {
    const user = localStorage.getItem("auth");
    return user ? JSON.parse(user) : null;
  },
  onError: async (error) => { console.error(error); return { error }; },
};

// 自定义标题组件
const CustomTitle = ({ collapsed }) => (
  <div style={{ 
    height: "64px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: collapsed ? "14px" : "18px",
    color: "#1890ff",
    overflow: "hidden",
    whiteSpace: "nowrap"
  }}>
    {collapsed ? "康养家" : "康养家管理后台"}
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider(API_URL)}
            notificationProvider={useNotificationProvider}
            routerProvider={routerBindings}
            authProvider={authProvider}
            Title={CustomTitle}
            resources={[
              {
                name: "users",
                list: "/users",
                create: "/users/create",
                edit: "/users/edit/:id",
                show: "/users/show/:id",
                meta: { label: "客户管理" },
              },
              {
                name: "plans",
                list: "/plans",
                meta: { label: "护理计划" },
              },
              {
                name: "mall_items",
                list: "/mall_items",
                create: "/mall_items/create",
                edit: "/mall_items/edit/:id",
                meta: { label: "商城商品" },
              },
              {
                name: "protocols",
                list: "/protocols",
                edit: "/protocols/edit/:id",
                meta: { label: "协议管理" },
              },
              {
                name: "admins",
                list: "/admins",
                meta: { label: "管理员管理" },
              },
            ]}
          >
            <Routes>
              <Route
                element={
                  <Authenticated key="authenticated-inner" fallback={<CatchAllNavigate to="/login" />}>
                    <ThemedLayoutV2 Title={CustomTitle}>
                      <Outlet />
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                <Route index element={<NavigateToResource resource="users" />} />
                <Route path="/users">
                  <Route index element={<UserList />} />
                  <Route path="create" element={<UserCreate />} />
                  <Route path="edit/:id" element={<UserEdit />} />
                  <Route path="show/:id" element={<UserShow />} />
                </Route>
                <Route path="/plans">
                  <Route index element={<PlanList />} />
                </Route>
                <Route path="/mall_items">
                  <Route index element={<MallItemList />} />
                  <Route path="create" element={<MallItemCreate />} />
                  <Route path="edit/:id" element={<MallItemEdit />} />
                </Route>
                <Route path="/protocols">
                  <Route index element={<ProtocolList />} />
                </Route>
                <Route path="/admins">
                  <Route index element={<AdminList />} />
                </Route>
              </Route>
              <Route
                element={<Authenticated key="authenticated-auth" fallback={<Outlet />}><NavigateToResource /></Authenticated>}
              >
                <Route path="/login" element={<AuthPage type="login" title="康养家管理后台" formProps={{ initialValues: { email: "admin@fivenursings.com", password: "123789" } }} />} />
              </Route>
              <Route path="*" element={<ErrorComponent />} />
            </Routes>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
