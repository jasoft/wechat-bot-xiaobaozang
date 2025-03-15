import PocketBase from "pocketbase"
import dotenv from "dotenv"

dotenv.config()

async function getMessageExample() {
    const pb = new PocketBase(process.env.POCKETBASE_URL)

    try {
        await pb.admins.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD)

        const records = await pb.collection("messages").getList(1, 1)
        if (records.items.length > 0) {
            console.log("Example Message Record:", JSON.stringify(records.items[0], null, 2))
        } else {
            console.log("No existing message records found")
        }
    } catch (error) {
        console.error("Error:", error)
    }
}

getMessageExample()
