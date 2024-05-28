// const pkg = require("@wcferry/core")
// const { Wcferry } = pkg
import { Wcferry } from "@wcferry/core"

const wf = new Wcferry({ host: process.env.WCF_HOST, port: parseInt(process.env.WCF_PORT) })
test("importing a module should return the expected value", () => {
	// Arrange
	const expectedValue = 42
	wf.start()
	// Act

	// Assert
	expect(actualValue).toBe(expectedValue)
})
