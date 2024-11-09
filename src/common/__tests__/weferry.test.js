// 示例代码
const { Wcferry } = require("@zippybee/wechatcore")

const client = new Wcferry({ port: 30049, host: "192.168.1.15" })

client.start()

const isLogin = client.isLogin()
const userinfo = client.getUserInfo()
console.log(client.getContacts())
client.getContact("filehelper")
test("connect is success", () => {
  expect(isLogin).toBe(true)
  expect(userinfo.wxid).toBe("wxid_lzn88besya2s12")
})

const off = client.listening((msg) => {
  console.log("收到消息:", msg.content)
})
