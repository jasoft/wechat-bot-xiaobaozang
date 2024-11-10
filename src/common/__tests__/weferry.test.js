// 示例代码
import { wxClient } from "../wxmessage.js"

const client = wxClient
console.log(client.getContacts())
console.log(client.getContact("filehelper"))
test("connect is success", () => {
  const isLogin = client.isLogin()
  const userinfo = client.getUserInfo()
  expect(isLogin).toBe(true)
  expect(client.getContacts().length).toBeGreaterThan(0)
  expect(client.getContact("filehelper").name).toBe("文件传输助手")
  expect(userinfo.wxid).toBe("wxid_lzn88besya2s12")
})

const off = client.listening((msg) => {
  console.log("收到消息:", msg.content)
})
