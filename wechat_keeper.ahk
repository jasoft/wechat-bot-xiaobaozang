#Requires AutoHotkey v2.0

; 终止微信进程并重新启动
RestartWeChat() {
    ; 终止微信进程
    RunWait "taskkill /F /IM WeChat.exe", , "Hide"
    ; 终止 mmcrashpad_handler64.exe 进程
    RunWait "taskkill /F /IM mmcrashpad_handler64.exe", , "Hide"
    Sleep 500  ; 等待进程终止
    ; 启动微信
    Run "C:\Program Files\Tencent\WeChat\WeChat.exe"

    ; 等待微信启动
    while !WinExist("微信") {
        Sleep 1000
    }
    WinActivate("微信")
    Sleep 1000
    Send "{Enter}"
    Sleep 10000  ; 等待10秒，确保微信完全启动
}

IsWechatErrorOrMissing() {

    ; 检查微信窗口是否显示“微信已停止工作”或“微信已退出”
    if WinExist("错误报告") OR ( NOT ProcessExist("WeChat.exe")) {
        return true
    }

    return false
}
; 更新 jobs.json 文件
UpdateJsonFile() {
    ; 获取当前时间（格式：YYYY-MM-DD HH:MM:SS）
    currentTime := Format("{:T}", A_Now)

    ; 目标 JSON 文件路径（当前脚本目录下的 `data.json`）
    jsonFile := A_ScriptDir "\jobs.json"

    ; 构建新的 JSON 内容
    newContent := "{`"msg`": `"wechat restarted on " currentTime "`"}"

    ; 将内容写入文件
    File := FileOpen(jsonFile, "w")
    if !File {
        return
    }
    File.Write(newContent)  ; 格式化 JSON 数据写入
    File.Close()

}

; 激活微信窗口
ActivateWeChat() {
    ; 假设微信窗口的标题包含 "微信"
    if WinExist("微信") {
        WinActivate
        WinWaitActive
    } else {
        ExitApp
    }
}
; 祝福语数组
blessings := [
    "愿你心中始终充满着阳光，无论遇到任何困难和挑战，都能勇敢面对和破解，成就更好更强的自己，生活愉快！",
    "愿你的每一天都有原野的明媚、大海的宽广和星空的浩渺，愿你的人生充满无限可能。",
    "祝你每一天都充满喜乐、每一步都充满自信、每一次都充满收获。我的朋友，愿你幸福快乐，一路相伴！",
    "亲爱的朋友，愿你的人生如诗如画，岁月静好，幸福长存。祝你前程似锦，未来可期！",
    "友情如酒，愈久愈香；祝福如歌，愈唱愈响。愿你在人生的道路上，永远有歌声相伴，有美酒相庆。祝福你，我的朋友，一生平安顺遂！",
    "愿你在未来的日子里，继续坚定自己的信念，勇敢面对挑战，发光发热，成就自己的梦想！",
    "时光匆匆，友情长在。愿我们的友情像深深的根，历经风雨却依然坚定。祝你一路顺风，无论何时都能感受到美好！",
    "无论何时何地，你都可以依靠我，我将永远在你身边，与你一同度过人生的风雨。",
    "愿你心灵始终充满阳光，无论何时何地，都拥有自信和坚韧。生活充满爱意，幸福无限！走向更远的未来！",
    "我的朋友，愿你的每一天都充满着阳光和快乐。祝你心想事成，身体健康，万事如意！",
    "想念你，愿你是幸福的；祝福你，愿你是快乐的；惦记你，愿你是温暖的；保佑你，愿你是健康的。朋友，距离虽远但情谊不减，祝你一生平安！",
    "亲爱的朋友，愿你生活如诗如画，开心快乐无边，事业蒸蒸日上，财源广进绵绵。祝福你，万事如意，身体健康！",
    "时光的流逝，让我们更加珍惜拥有的每一份爱与情谊。祝福你平安快乐，感恩有你一路同行！",
    "身边的朋友是人生中最宝贵的财富，感谢你一直以来的陪伴和支持，祝你健康幸福、快乐前行！"
]

; 生成随机祝福语
GenerateRandomBlessing() {
    global blessings
    randIndex := Random(1, blessings.Length)
    return blessings[randIndex]
}

; 发送消息给文件传输助手
SendMessageToFileHelper() {
    ; 假设文件传输助手的名称是 "文件传输助手"
    Send "^f"  ; 发送 Ctrl+F 快捷键
    Sleep 500
    Send "文件传输助手"
    Sleep 500
    Send "{Enter}"
    Sleep 500  ; 等待500毫秒，确保输入框激活
    randomText := GenerateRandomBlessing()
    Send randomText
    Send "{Enter}"
}

; 发送 webhook 到企业微信机器人
SendWebhookToWeWorkBot(message) {
    try {
        ; 企业微信机器人的 webhook 地址
        webhook_url := "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=8d2f4a6e-07ab-465d-a29c-1c9691502631"

        ; 构建 JSON 请求体
        json_body := '{"msgtype": "text", "text": {"content": "' message '"}}'

        ; 创建 WinHttpRequest 对象
        http := ComObject("WinHttp.WinHttpRequest.5.1")
        http.Open("POST", webhook_url, true)
        http.SetRequestHeader("Content-Type", "application/json")
        http.Send(json_body)
        http.WaitForResponse()

        ; 可选: 检查响应
        if (http.Status != 200) {
            FileAppend "Failed to send webhook: " http.Status " " http.StatusText "`n", A_ScriptDir "\webhook_errors.log"
        }
    } catch as err {
        FileAppend "Error sending webhook: " err.Message "`n", A_ScriptDir "\webhook_errors.log"
    }
}

lastRestartTime := A_TickCount
lastMessageTime := A_TickCount
loop {
    if IsWechatErrorOrMissing() {  ; 23 to 25 hours in milliseconds
        RestartWeChat()
        UpdateJsonFile()

        ; 发送微信重启通知到企业微信机器人
        SendWebhookToWeWorkBot("小宝藏已于" . FormatTime(A_Now, "yyyy-MM-dd HH:mm:ss") . "重启")
        lastRestartTime := A_TickCount
    }
    if A_TickCount - lastMessageTime > Random(28800000, 43200000) {  ; 8 to 12 hours in milliseconds
        ActivateWeChat()
        Sleep 1000  ; 等待1秒，确保微信窗口激活
        SendMessageToFileHelper()
        lastMessageTime := A_TickCount
    }
    Sleep 6000  ; 1 minute in milliseconds
}
