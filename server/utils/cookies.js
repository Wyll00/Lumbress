const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_NAME = 'token';

const cookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
});

module.exports = { COOKIE_NAME, cookieOptions };
