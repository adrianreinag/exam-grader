import { Request } from "firebase-functions/v2/https";
import { Response } from "express";

type OnRequestHandler = (req: Request, res: Response) => void | Promise<void>;

export const withCors = (handler: OnRequestHandler) => {
  return (req: Request, res: Response) => {
    // Los secretos se inyectan en process.env
    const allowedOriginsConfig = process.env.CORS_ALLOWED_ORIGINS || "";
    const allowedOrigins = allowedOriginsConfig.split(",");

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Vary", "Origin");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
      res.setHeader("Access-Control-Max-Age", "3600");
      res.status(204).send("");
      return;
    }

    handler(req, res);
  };
};
