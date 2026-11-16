
import { Webhook } from "svix";
import User from "../models/user.js";

export const clerkWebhooks = async (req, res) => {
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        const headers = {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        };

        // Verify the original raw request body
        const payload = req.body.toString("utf8");
        const { data, type } = whook.verify(payload, headers);

        switch (type) {
            case "user.created": {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0]?.email_address,
                    name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                    image: data.image_url,
                    resume: ""
                };

                await User.create(userData);
                break;
            }

            case "user.updated": {
                const userData = {
                    email: data.email_addresses[0]?.email_address,
                    name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                    image: data.image_url
                };

                await User.findByIdAndUpdate(data.id, userData);
                break;
            }

            case "user.deleted": {
                await User.findByIdAndDelete(data.id);
                break;
            }

            default:
                console.log("Unhandled webhook event:", type);
        }

        return res.status(200).json({
            success: true,
            message: "Webhook processed successfully"
        });

    } catch (error) {
        console.error("Webhook Error:", error.message);

        return res.status(400).json({
            success: false,
            message: "Webhook Error"
        });
    }
};
