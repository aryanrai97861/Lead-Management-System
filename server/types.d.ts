import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: User;
    }
  }
}
