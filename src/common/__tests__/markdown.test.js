// 引入要测试的 MarkDown 类
import MarkDown from "../markdown.js"

describe("MarkDown", () => {
    let md

    // 在每个测试前初始化 MarkDown 实例
    beforeEach(() => {
        md = new MarkDown()
    })

    // 测试 render 方法是否正确渲染 Markdown 文本
    test("should correctly render markdown text", () => {
        const input = "# Hello World"
        const output = md.render(input)
        expect(output).toContain("<h1>Hello World</h1>")
    })

    // 测试是否正确提取图片链接
    test("should extract image links from markdown text", () => {
        const input = "![alt text](http://example.com/image.png)"
        const links = md.extractImageLinks(input)
        expect(links).toEqual(["http://example.com/image.png"])
    })

    // 测试链接是否被正确渲染，包括 target="_blank"
    test('should render links with target="_blank"', () => {
        const input = "[GitHub](http://github.com)"
        const output = md.render(input)
        expect(output).toContain('<a target="_blank" href="http://github.com" title="">GitHub</a>')
    })
})
