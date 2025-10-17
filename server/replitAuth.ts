import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if this is a self-hosted deployment (no Replit auth)
// USE_LOCAL_AUTH=true can force local auth even in Replit for testing
const isSelfHosted = process.env.USE_LOCAL_AUTH === 'true' || !process.env.REPL_ID || process.env.REPL_ID === 'self-hosted' || !process.env.REPLIT_DOMAINS;

const getOidcConfig = memoize(
  async () => {
    if (isSelfHosted) {
      return null; // Skip OIDC for self-hosted
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // For self-hosted: don't require secure cookies (Apache/nginx handle SSL)
      // For Replit: use secure cookies in production
      secure: isSelfHosted ? false : process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allow cookies to be sent on redirects
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (isSelfHosted) {
    // Self-hosted mode: Use local authentication with username/password
    console.log("Running in self-hosted mode - using local authentication");
    
    // Create default admin user if not exists
    const defaultUsername = process.env.ADMIN_USERNAME || 'danny';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'DJ6146dj!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    const defaultUser = {
      id: defaultUsername,
      email: `${defaultUsername}@localhost`,
      firstName: 'Danny',
      lastName: 'Admin',
      profileImageUrl: null,
      passwordHash,
      isLocal: true
    };
    
    // Only create if doesn't exist
    const existingUser = await storage.getUser(defaultUsername);
    if (!existingUser) {
      await storage.upsertUser(defaultUser);
      console.log(`Default admin user created. Username: ${defaultUsername}, Password: ${defaultPassword}`);
    }
    
    // Configure local strategy
    passport.use(new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      async (username, password, done) => {
        try {
          // For self-hosted, username is the user ID
          const user = await storage.getUser(username);
          
          if (!user || !user.passwordHash) {
            return done(null, false, { message: 'Invalid credentials' });
          }
          
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid credentials' });
          }
          
          return done(null, { claims: { sub: user.id } });
        } catch (error) {
          return done(error);
        }
      }
    ));
    
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    
    // Login route - POST for form submission
    app.post("/api/login", (req, res, next) => {
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ error: 'Authentication error' });
        }
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.logIn(user, (err) => {
          if (err) {
            return res.status(500).json({ error: 'Login failed' });
          }
          // Save session before sending response to ensure cookie is set
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              return res.status(500).json({ error: 'Session save failed' });
            }
            return res.status(200).json({ success: true, redirect: '/' });
          });
        });
      })(req, res, next);
    });
    
    // Logout route
    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect('/login');
      });
    });
    
    return;
  }

  const config = await getOidcConfig();
  
  if (!config) {
    throw new Error("OIDC configuration is null - this should not happen in Replit mode");
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      if (!config) {
        return res.redirect('/');
      }
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Self-hosted mode: require local authentication
  if (isSelfHosted) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
  }

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
