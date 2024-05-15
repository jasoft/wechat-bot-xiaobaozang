// 定义机器人的名称，这里是为了防止群聊消息太多，所以只有艾特机器人才会回复，
// 这里不要把@去掉，在@后面加上你启动机器人账号的微信名称
export const botName = "@小宝藏"

// 群聊白名单，白名单内的群聊才会自动回复
export const roomWhiteList = ["我的一家", "神兽大爆炸", "小操场"]

// 联系人白名单，白名单内的联系人才会自动回复
export const aliasWhiteList = ["妈妈", "爸爸", "姐姐", "壮壮", "奶奶"]

export const keywords = [
	"小宝藏",
	"吃饭",
	"下雨",
	"天气",
	"晴天",
	"雨天",
	"阴天",
	"雪天",
	"雾天",
	"台风",
	"暴雨",
	"大风",
	"大雾",
	"大雪",
	"大雨",
]

export const contextLimit = 5 // 上下文对话的长度

export const tokensLimit = 512 // 消息长度限制
