import { DefaultSession } from "next-auth"
import type { GetServerSidePropsContext, NextApiRequest } from "next"
import type { NextRequest } from "next/server"
// import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's role. */
            role: 'user' | 'admin' | 'tenant'
            id: string
            tenantId?: string
            phoneNumber?: string
            plan: 'FREE' | 'PRO';
            selectedModule: 'INVENTORY' | 'SERVICE';
            features: {
                productAI: boolean;
                serviceAI: boolean;
                customWhatsapp: boolean;
            };
        } & DefaultSession["user"]
    }

    interface User {
        role: 'user' | 'admin' | 'tenant'
        tenantId?: string
        phoneNumber?: string
        plan: 'FREE' | 'PRO';
        selectedModule: 'INVENTORY' | 'SERVICE';
        features: {
            productAI: boolean;
            serviceAI: boolean;
            customWhatsapp: boolean;
        };
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        role: 'user' | 'admin' | 'tenant'
        id: string
        tenantId?: string
        phoneNumber?: string
        email?: string
        plan: 'FREE' | 'PRO';
        selectedModule: 'INVENTORY' | 'SERVICE';
        features: {
            productAI: boolean;
            serviceAI: boolean;
            customWhatsapp: boolean;
        };
    }

    export function getToken<R extends boolean = false>(params: {
        req: GetServerSidePropsContext["req"] | NextRequest | NextApiRequest
        secret?: string
        raw?: R
        cookieName?: string
        secureCookie?: boolean
    }): Promise<R extends true ? string : JWT | null>
}

declare module "next-auth/next" {
    import type { Session } from "next-auth"
    export function getServerSession(...args: unknown[]): Promise<Session | null>
}
