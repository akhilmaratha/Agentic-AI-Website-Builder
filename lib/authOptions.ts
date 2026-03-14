import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import connectToDatabase from "./mongoose";
import { User } from "@/server/models";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user.email) {
        try {
          await connectToDatabase();
          const existingUser = await User.findOne({ email: user.email });
          if (!existingUser) {
            await User.create({
              name: user.name || "User",
              email: user.email,
              image: user.image || "",
              provider: account?.provider || "google",
              plan: "free",
            });
          }
        } catch (e) {
          console.error("Error creating user on sign in", e);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.provider = account?.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).provider = token.provider;
        
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: session.user.email });
          if (dbUser) {
            (session.user as Record<string, unknown>).plan = dbUser.plan;
            (session.user as Record<string, unknown>).dbId = dbUser._id;
            (session.user as Record<string, unknown>).generationsToday = dbUser.generationsToday || 0;
            (session.user as Record<string, unknown>).lastGenerationDate = dbUser.lastGenerationDate;
          }
        } catch (e) {}
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, redirect to builder
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/builder`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
