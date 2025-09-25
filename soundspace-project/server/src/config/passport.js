const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.SERVER_URL || 'http://localhost:8800'}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // email có thể nằm ở profile.emails
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    let user = await User.findOne({ googleId: profile.id });
    if (!user && email) {
      // nếu user đã tồn tại bằng email (đăng ký bằng form), thì gắn googleId
      user = await User.findOne({ email });
      if (user) {
        user.googleId = profile.id;
        await user.save();
      }
    }
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        username: profile.displayName,
        email
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// serialize / deserialize không dùng session (session: false) nhưng vẫn safe
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
