# Gulpfile for macOS/Linux

这是适用于 macOS 和 Linux 系统的 gulpfile.js，用于监控文件变化并自动同步到远程目录。

## 主要差异

与 Windows 版本的主要差异：

1. **同步命令**: 使用 `rsync` 替代 `robocopy`
2. **编码处理**: Unix 系统默认使用 UTF-8，无需特殊编码处理
3. **路径格式**: 使用 Unix 风格的路径分隔符
4. **信号处理**: 添加了 SIGQUIT 信号处理

## 安装依赖

确保已安装必要的 npm 包：

```bash
npm install gulp gulp-watch
```

确保系统已安装 rsync（大多数 macOS/Linux 系统默认已安装）：

```bash
# macOS (如果没有安装)
brew install rsync

# Ubuntu/Debian
sudo apt-get install rsync

# CentOS/RHEL
sudo yum install rsync
```

## 配置

1. **修改远程目录路径**:
   ```javascript
   const remoteDir = "/mnt/remote/wechat-bot-xiaobaozang" // 修改为你的远程目录路径
   ```

   常见的远程目录配置：
   - 本地目录: `/home/user/backup/project`
   - NFS 挂载: `/mnt/nfs/project`
   - SMB 挂载: `/mnt/smb/project`
   - SSH 远程: `user@hostname:/path/to/project`

2. **网络存储挂载示例**:

   **NFS 挂载**:
   ```bash
   sudo mkdir -p /mnt/nfs
   sudo mount -t nfs server-ip:/path/to/share /mnt/nfs
   ```

   **SMB/CIFS 挂载**:
   ```bash
   sudo mkdir -p /mnt/smb
   sudo mount -t cifs //server-ip/share /mnt/smb -o username=your-username
   ```

## 使用方法

1. **启动文件监控**:
   ```bash
   npx gulp -f gulpfile_linux.js
   # 或者
   npx gulp watch -f gulpfile_linux.js
   ```

2. **手动同步**:
   ```bash
   npx gulp sync -f gulpfile_linux.js
   ```

3. **测试连接**:
   ```bash
   npx gulp test -f gulpfile_linux.js
   ```

## 功能特性

- ✅ 实时监控文件变化
- ✅ 防抖动处理（2秒延迟）
- ✅ 排除指定目录（node_modules, .git 等）
- ✅ 支持多种文件类型监控
- ✅ 优雅的进程退出处理
- ✅ 详细的日志输出
- ✅ 连接测试功能

## rsync 参数说明

使用的 rsync 参数：
- `-a`: 归档模式，保持文件权限、时间戳等
- `-v`: 详细输出
- `--delete`: 删除目标目录中源目录没有的文件
- `--exclude=dir`: 排除指定目录

## 故障排除

1. **权限问题**:
   ```bash
   sudo chown -R $USER:$USER /mnt/remote/
   ```

2. **网络挂载问题**:
   - 检查挂载点是否存在且可访问
   - 确认网络连接正常
   - 检查防火墙设置

3. **rsync 不存在**:
   - macOS: `brew install rsync`
   - Ubuntu: `sudo apt-get install rsync`
   - CentOS: `sudo yum install rsync`

## 性能优化

如果需要更好的性能，可以考虑：

1. **使用压缩**:
   ```javascript
   const rsyncCmd = `rsync -avz --delete ${excludeArgs} ${localDir}/ ${remoteDir}/`
   ```

2. **限制带宽**:
   ```javascript
   const rsyncCmd = `rsync -av --delete --bwlimit=1000 ${excludeArgs} ${localDir}/ ${remoteDir}/`
   ```

3. **使用 SSH 压缩** (远程同步):
   ```javascript
   const rsyncCmd = `rsync -avz --delete -e "ssh -C" ${excludeArgs} ${localDir}/ user@remote:${remoteDir}/`
   ```
