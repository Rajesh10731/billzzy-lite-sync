import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';

import { clientPromise } from "@/lib/mongodb";
import dbConnect from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import { User as NextAuthUser } from "next-auth";
import { JWT } from "next-auth/jwt";

const MONGODB_URI = process.env.MONGODB_URI;
const uri = new URL(MONGODB_URI!);
const dbName = uri.pathname.substring(1) || 'billzzyDB';

function mapUserToToken(token: JWT, user: NextAuthUser) {
  token.id = user.id;
  token.role = (user.role || 'user') as 'user' | 'admin' | 'tenant';
  token.tenantId = user.tenantId;
  token.phoneNumber = user.phoneNumber;
  token.plan = (user.plan || 'FREE') as 'FREE' | 'PRO';
  token.selectedModule = (user.selectedModule || 'INVENTORY') as 'INVENTORY' | 'SERVICE';
  token.features = user.features || { productAI: false, serviceAI: false, customWhatsapp: false };
}

async function syncTokenWithDb(token: JWT, overwriteId = false) {
  if (!token.email) return;
  await dbConnect();
  const dbUser = await User.findOne({ email: token.email });
  if (!dbUser) return;

  if (overwriteId) token.id = dbUser._id.toString();
  token.plan = (dbUser.plan || 'FREE') as 'FREE' | 'PRO';
  token.selectedModule = (dbUser.selectedModule || 'INVENTORY') as 'INVENTORY' | 'SERVICE';
  token.features = {
    productAI: dbUser.features?.productAI || false,
    serviceAI: dbUser.features?.serviceAI || false,
    customWhatsapp: dbUser.features?.customWhatsapp || false
  };
  token.role = (dbUser.role || 'user') as 'user' | 'admin' | 'tenant';
  if (dbUser.phoneNumber) token.phoneNumber = dbUser.phoneNumber;
  if (dbUser.name) token.name = dbUser.name;
}

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
            return {
              id: 'master-admin-01',
              email: process.env.ADMIN_EMAIL,
              role: 'admin' as const,
              plan: 'PRO' as const,
              selectedModule: 'INVENTORY' as const,
              features: { productAI: true, serviceAI: true, customWhatsapp: true }
            };
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
            selectedModule: user.selectedModule || 'INVENTORY',
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
    async jwt({ token, user }) {
      if (user) {
        const u = user as NextAuthUser;
        mapUserToToken(token, u);
      }
 
      // ALWAYS sync with DB to ensure admin changes (plan, selectedModule) are reflected immediately
      // on next session check/navigation without requiring re-login.
      if (token.email) {
        await syncTokenWithDb(token, false);
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
        session.user.selectedModule = token.selectedModule as 'INVENTORY' | 'SERVICE';
        session.user.features = token.features as IUser['features'];
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

