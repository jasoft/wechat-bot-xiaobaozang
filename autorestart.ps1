Add-Type -AssemblyName System.Windows.Forms
# 函数：等待窗口
function Wait-ForWindow {
    param (
        [string]$WindowTitle,
        [int]$TimeoutSeconds = 30
    )

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        # 获取所有窗口
        $windows = Get-Process | Where-Object {
            $_.MainWindowTitle -like "*$WindowTitle*"
        }

        if ($windows) {
            Write-Host "Window '$WindowTitle' found."
            return $windows[0]
        }

        Start-Sleep -Seconds 1
        $elapsed++
    }

    Write-Host "Window '$WindowTitle' not found within $TimeoutSeconds seconds."
    return $null
}

# 函数：激活窗口
function Set-Window {
    param (
        [string]$ProcessName
    )

    $sig = @'
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    Add-Type -MemberDefinition $sig -Name 'WinAPI' -Namespace 'User32'

    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($process) {
        [User32.WinAPI]::SetForegroundWindow($process.MainWindowHandle)
        Write-Host "Set window for process '$ProcessName'."
        return $true
    }
    else {
        Write-Host "Process '$ProcessName' not found."
        return $false
    }
}


# 定义变量
$ProcessName = "WeChat"  # 目标进程名称
$ProcessPath = "C:\Program Files\Tencent\WeChat\WeChat.exe"  # 进程启动路径
$JobsFilePath = ".\jobs.json"  # jobs.json 文件路径

# 定义记录日志的方法
function Write-Log {
    param (
        [string]$ProcessName,
        [datetime]$StartTime
    )
    
    # 创建记录对象
    $LogEntry = [PSCustomObject]@{
        ProcessName = $ProcessName
        StartTime   = $StartTime.ToString("yyyy-MM-ddTHH:mm:ss")
    }

    # 检查 jobs.json 文件是否存在
    if (-not (Test-Path $JobsFilePath)) {
        # 创建一个新文件并写入初始数组
        [System.IO.File]::WriteAllText($JobsFilePath, "[]")
    }

    # 读取现有 JSON 文件
    $Jobs = Get-Content $JobsFilePath | ConvertFrom-Json

    # 确保是一个数组
    if ($Jobs -isnot [System.Collections.IEnumerable]) {
        $Jobs = @()
    }

    # 添加新记录
    $Jobs += $LogEntry

    # 写回 JSON 文件
    $Jobs | ConvertTo-Json -Depth 10 | Set-Content $JobsFilePath
}

# 定期操作
while ($true) {
    # 查找目标进程
    $TargetProcess = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

    if ($TargetProcess) {
        # 终止目标进程
        Stop-Process -Name $ProcessName -Force
        Write-Host "Process $ProcessName terminated."
    }
    else {
        Write-Host "Process $ProcessName not found."
    }

    # 启动目标进程
    Start-Process -FilePath $ProcessPath
    Write-Host "Process $ProcessName restarted."
    
    # 点击进入
    # 等待微信窗口出现
    $window = Wait-ForWindow -WindowTitle "微信" -TimeoutSeconds 30
    if ($window) {
        # 激活微信窗口
        if (Set-Window -ProcessName "WeChat") {
            # 发送回车键
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            Write-Host "Sent ENTER key to '微信'."
        }
    }
    else {
        Write-Host "微信窗口未找到，脚本结束。"
        break
    }


    # 记录日志
    Write-Log -ProcessName $ProcessName -StartTime (Get-Date)

    # 等待一段时间再执行下一次操作（例如，每隔 5 分钟）
    Write-Host "Waiting for 24 hours..."
    Start-Sleep -Seconds 86400
}
