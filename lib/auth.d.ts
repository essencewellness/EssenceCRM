import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "admin" | "terapeuta";
      username: string;
      precisaMudarPassword: boolean;
    };
  }

  interface User {
    role?: string;
    username?: string;
    precisaMudarPassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    username?: string;
    precisaMudarPassword?: boolean;
  }
}
