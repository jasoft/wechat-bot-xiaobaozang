import axios from "axios"
import fs from "fs"

export async function downloadFile(url, targetName) {
	const response = await axios({
		url,
		method: "GET",
		responseType: "stream",
	})

	const writer = fs.createWriteStream(targetName)

	response.data.pipe(writer)

	return new Promise((resolve, reject) => {
		writer.on("finish", resolve)
		writer.on("error", reject)
	})
}
