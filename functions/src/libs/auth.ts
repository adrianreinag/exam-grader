import { Request } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireIdToken(req: Request) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized: Missing or invalid Authorization header");
  }

  const token = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new HttpError(401, "Unauthorized: Invalid token");
  }
}
