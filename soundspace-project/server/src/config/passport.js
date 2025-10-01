const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.SERVER_URL || 'http://localhost:8800'}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;

    // tìm theo googleId trước
    let user = await User.findOne({ googleId: profile.id });

    // nếu chưa có, thử tìm bằng email
    // Sửa thành
    if (user) {
        user.googleId = profile.id;
        const googleAvatar = profile.photos[0]?.value;
        // Luôn ưu tiên avatar Google nếu có, hoặc nếu avatar hiện tại là avatar mặc định
        if (googleAvatar && (user.avatar === '/default-avatar.png' || !user.avatar)) {
            user.avatar = googleAvatar;
        }
        await user.save();
    }
    // nếu vẫn chưa có user thì tạo mới
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        username: profile.displayName,
        email,
        avatar: profile.photos[0]?.value || '/default-avatar.png'
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// serialize / deserialize (mặc dù mình xài JWT, nhưng cứ để cho chắc)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;