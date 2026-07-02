const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../utils/cookies');

const auth = (req, res, next) => {
    try {
        const token = req.cookies?.[COOKIE_NAME]
            || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Sesión inválida o expirada' });
    }
};

module.exports = auth;
