import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    telefono?: string;
    role: string;
    ligaId: string;
    ligaSubdominio?: string;
    equipoId?: string;
    equipoNombre?: string;
    numeroCasaca?: number;
    fotoUrl?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      telefono?: string;
      role: string;
      ligaId: string;
      ligaSubdominio?: string;
      equipoId?: string;
      equipoNombre?: string;
      numeroCasaca?: number;
      fotoUrl?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    ligaId: string;
    ligaSubdominio?: string;
    telefono?: string;
    equipoId?: string;
    equipoNombre?: string;
    numeroCasaca?: number;
    fotoUrl?: string;
  }
}