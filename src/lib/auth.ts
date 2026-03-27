import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';

import { clientPromise } from "@/lib/mongodb";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const MONGODB_URI = process.env.MONGODB_URI;
const uri = new URL(MONGODB_URI!);
const dbName = uri.pathname.substring(1) || 'billzzyDB';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: dbName }) as Adapter,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials) return null;

          if (credentials.email === process.env.ADMIN_EMAIL && credentials.password === process.env.ADMIN_PASSWORD) {
            return { id: 'master-admin-01', email: process.env.ADMIN_EMAIL, role: 'admin' as const, plan: 'PRO', features: { productAI: true, serviceAI: true, customWhatsapp: true } };
          }

          await dbConnect();
          const user = await User.findOne({ email: credentials.email }).select('+password');

          if (!user || !user.password) return null;

          const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordCorrect) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            tenantId: user.tenantId?.toString() || user.subdomain || user.email,
            phoneNumber: user.phoneNumber, plan: user.plan || 'FREE',
            features: user.features || { productAI: false, serviceAI: false, customWhatsapp: false }
          };
        } catch {
          return null;
        }
      }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
      //   const u = user as { id: string; role?: string; tenantId?: string; subdomain?: string; email?: string; phoneNumber?: string };
      //   token.id = u.id;
      //   token.role = (u.role as "admin" | "user" | "tenant") || 'user';
      //   token.tenantId = u.tenantId || u.subdomain || u.email;
      //   token.phoneNumber = u.phoneNumber;
      //    token.plan = u.plan;
      //   token.features = u.features;
      // }
      const u = user as any;
        token.id = u.id;
        token.role = u.role || 'user';
        token.tenantId = u.tenantId;
        token.phoneNumber = u.phoneNumber;
        token.plan = u.plan || 'FREE';
        token.features = u.features || { productAI: false, serviceAI: false, customWhatsapp: false };
      }

      // if (trigger === "update") {
      //   if (session?.phoneNumber) token.phoneNumber = session.phoneNumber;
      //   if (session?.name) token.name = session.name;
      // }
       if (trigger === "update" && session) {
        if (session.phoneNumber) token.phoneNumber = session.phoneNumber;
        if (session.plan) token.plan = session.plan;
        if (session.features) token.features = session.features;
      }


      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;

        // FIX: Cast to specific allowed literals
        session.user.role = token.role as "user" | "admin" | "tenant";

        session.user.tenantId = token.tenantId as string;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.plan = token.plan as 'FREE' | 'PRO';
        session.user.features = token.features as any;
      }
      return session;
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

