import { Request } from "firebase-functions/v2/https";
import { Response } from "express";

type OnRequestHandler = (req: Request, res: Response) => void | Promise<void>;

export const withSecurityHeaders = (handler: OnRequestHandler) => {
  return async (req: Request, res: Response) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    res.setHeader("Cache-Control", "no-store");

    await handler(req, res);
  };
};
