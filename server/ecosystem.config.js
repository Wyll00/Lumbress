// pm2: mantiene el backend vivo y lo arranca al reiniciar el VPS.
// En el servidor:  cd /var/www/lumbres/server && pm2 start ecosystem.config.js
//                  pm2 save && pm2 startup   (una vez, para el autoarranque)
module.exports = {
    apps: [
        {
            name: 'lumbres-api',
            script: 'server.js',
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            max_memory_restart: '400M',
            env: { NODE_ENV: 'production' },
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            time: true,
        },
    ],
};
