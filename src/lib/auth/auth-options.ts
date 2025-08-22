import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@/lib/supabase/server";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = await createClient();
        
        // Intentar login con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (authError || !authData.user) {
          return null;
        }

        // Obtener información mínima del usuario para reducir tamaño del token
        const { data: userData }: { data: any } = await supabase
          .from('usuarios')
          .select('id, nombre, role, liga_id, ligas(subdominio)')
          .eq('id', authData.user.id)
          .single();

        // Si no existe el usuario, intentar vinculación automática
        if (!userData) {
          console.log('🔗 Usuario no encontrado, intentando vinculación automática...');
          
          try {
            const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/vincular-jugador`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: credentials.email,
                userId: authData.user.id
              }),
            });

            if (response.ok) {
              const vinculacionResult = await response.json();
              console.log('✅ Vinculación exitosa:', vinculacionResult.message);
              
              // Volver a buscar los datos del usuario
              const { data: newUserData }: { data: any } = await supabase
                .from('usuarios')
                .select('id, nombre, role, liga_id, ligas(subdominio)')
                .eq('id', authData.user.id)
                .single();
              
              if (newUserData) {
                return {
                  id: authData.user.id,
                  email: authData.user.email!,
                  name: newUserData.nombre,
                  role: newUserData.role,
                  ligaId: newUserData.liga_id,
                  ligaSubdominio: Array.isArray(newUserData.ligas) ? newUserData.ligas[0]?.subdominio : newUserData.ligas?.subdominio,
                };
              }
            }
          } catch (vinculacionError) {
            console.error('❌ Error en vinculación automática:', vinculacionError);
          }
          
          return null;
        }

        return {
          id: authData.user.id,
          email: authData.user.email!,
          name: userData.nombre,
          role: userData.role,
          ligaId: userData.liga_id,
          ligaSubdominio: Array.isArray(userData.ligas) ? userData.ligas[0]?.subdominio : userData.ligas?.subdominio,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Solo información esencial en el token para evitar que sea muy grande
        token.id = user.id;
        token.role = user.role;
        token.ligaId = user.ligaId;
        token.ligaSubdominio = user.ligaSubdominio;

      }
      
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Solo información esencial para evitar headers grandes
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.ligaId = token.ligaId as string;
        session.user.ligaSubdominio = token.ligaSubdominio as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (reducido de 30 días por defecto)
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 // 24 hours
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};