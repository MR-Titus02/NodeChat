import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";


const arcjetProtection = async (req, res, next) => {
    try{
        const decision = await aj.protect(req);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({ message: 'Rate limit exceeded. please try again later' });
            } else if (decision.reason.isBot()) {
                return res.status(403).json({ message: 'Access denied for bots' });
            } else {
                return res.status(403).json({ message: 'Request denied by Security Policy' });
            }
        }

        // check for spoofed bots
         if (decision.results.some(isSpoofedBot)) {
            return res.status(403).json({
                error: "Spoofed bot detected. Access denied.",
                message: "Malicious bot activity detected"
            })
         }
    } catch (error) {
        console.error("Error in Arcjet middleware:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
    next();
};

export default arcjetProtection;