{ pkgs, ... }: {
  channel = "unstable";
  packages = [
    pkgs.nodejs_20
    pkgs.firebase-tools # 必须有这个，否则容器无法识别 Firebase 环境
  ];
  idx = {
    extensions = [
      "dsznajder.es7-react-js-snippets"
      "esbenp.prettier-vscode"
      "google.monospace-aida"
      "google.firebase-vscode" # Firebase 官方扩展
    ];
    workspace = {
      onCreate = {
        # 安装依赖并尝试自动登录
        npm-install-user = "npm install --prefix user";
        npm-install-admin = "npm install --prefix admin";
      };
      # 每次启动时强制执行一次认证检查
      onStart = {
        firebase-auth = "firebase login --no-localhost";
      };
    };
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "--prefix" "user" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
