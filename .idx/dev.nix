      { pkgs, ... }: {
        channel = "unstable";
        packages = [
          pkgs.nodejs_20
        ];
        idx = {
          extensions = [
            "dsznajder.es7-react-js-snippets"
            "esbenp.prettier-vscode"
            "google.monospace-aida"
          ];
          workspace = {
            # 启动时自动安装两个目录的依赖
            onCreate = {
              npm-install-user = "npm install --prefix user";
              npm-install-admin = "npm install --prefix admin";
            };
          };
          previews = {
            enable = true;
            previews = {
              # 只保留用户端预览，移除所有其他预览以避免冲突
              web = {
                command = ["npm" "--prefix" "user" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
                manager = "web";
              };
            };
          };
        };
      }
