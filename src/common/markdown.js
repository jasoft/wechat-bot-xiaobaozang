import { marked } from "marked"

export default class MarkDown {
    constructor() {
        this.renderer = new marked.Renderer()
        this.renderer.link = ({ href, title, text }) => {
            return `<a target="_blank" href="${href ?? ""}" title="${title ?? ""}">${text ?? ""}</a>`
        }
    }

    render(text) {
        return marked(text, { renderer: this.renderer })
    }

    extractImageLinks(text) {
        const links = []
        const renderer = new marked.Renderer()
        renderer.image = ({ href, title, text }) => {
            links.push(href)
            return ""
        }
        marked(text, { renderer })
        return links
    }
}
