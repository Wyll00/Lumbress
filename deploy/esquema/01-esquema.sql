
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `anuncios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `anuncios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `titulo_libro` varchar(255) NOT NULL,
  `autor` varchar(255) DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `moneda` varchar(5) DEFAULT '€',
  `estado_libro` enum('Nuevo','Como nuevo','Buen estado','Aceptable') DEFAULT 'Buen estado',
  `genero` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen_url` varchar(500) DEFAULT NULL,
  `contacto` varchar(200) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `vendido` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `direccion` varchar(255) DEFAULT NULL,
  `codigo_postal` varchar(15) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `pais` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_vendido` (`vendido`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `anuncios_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `blog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `resumen` varchar(400) DEFAULT NULL,
  `contenido` mediumtext NOT NULL,
  `portada_url` varchar(500) DEFAULT NULL,
  `categoria` varchar(80) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'publicado',
  `auto_generado` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_estado_created` (`estado`,`created_at`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `blog_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `calendar_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `errores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `errores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `huella` varchar(64) NOT NULL,
  `mensaje` text DEFAULT NULL,
  `stack` text DEFAULT NULL,
  `ruta` varchar(255) DEFAULT NULL,
  `metodo` varchar(8) DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `veces` int(11) NOT NULL DEFAULT 1,
  `primera_vez` timestamp NULL DEFAULT current_timestamp(),
  `ultima_vez` timestamp NULL DEFAULT current_timestamp(),
  `resuelto` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_huella` (`huella`),
  KEY `idx_resuelto` (`resuelto`),
  KEY `idx_ultima` (`ultima_vez`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `estanterias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `estanterias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `emoji` varchar(16) DEFAULT '?',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_shelf` (`usuario_id`,`nombre`),
  CONSTRAINT `fk_estanteria_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `estanterias_libros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `estanterias_libros` (
  `estanteria_id` int(11) NOT NULL,
  `libro_id` int(11) NOT NULL,
  PRIMARY KEY (`estanteria_id`,`libro_id`),
  KEY `fk_el_book` (`libro_id`),
  CONSTRAINT `fk_el_book` FOREIGN KEY (`libro_id`) REFERENCES `libros` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_el_shelf` FOREIGN KEY (`estanteria_id`) REFERENCES `estanterias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `etiquetas_literarias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `etiquetas_literarias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_nombre` (`usuario_id`,`nombre`),
  CONSTRAINT `etiquetas_literarias_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=526 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `libros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `libros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `autor` varchar(255) NOT NULL,
  `genero` varchar(100) DEFAULT NULL,
  `formato` varchar(100) DEFAULT NULL,
  `estado_lectura` varchar(100) DEFAULT NULL,
  `impacto_emocional` varchar(255) DEFAULT NULL,
  `cita_memorable` text DEFAULT NULL,
  `calificacion` decimal(3,1) DEFAULT NULL,
  `numero_paginas` int(11) DEFAULT NULL,
  `paginas_leidas` int(11) DEFAULT 0,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `portada_url` longtext DEFAULT NULL,
  `notas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notas`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `archivo_url` varchar(500) DEFAULT NULL,
  `archivo_tipo` varchar(10) DEFAULT NULL,
  `origen` varchar(20) NOT NULL DEFAULT 'usuario',
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `libros_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `libros_etiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `libros_etiquetas` (
  `libro_id` int(11) NOT NULL,
  `etiqueta_id` int(11) NOT NULL,
  PRIMARY KEY (`libro_id`,`etiqueta_id`),
  KEY `etiqueta_id` (`etiqueta_id`),
  CONSTRAINT `libros_etiquetas_ibfk_1` FOREIGN KEY (`libro_id`) REFERENCES `libros` (`id`) ON DELETE CASCADE,
  CONSTRAINT `libros_etiquetas_ibfk_2` FOREIGN KEY (`etiqueta_id`) REFERENCES `etiquetas_literarias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mensajes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mensajes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `emisor_id` int(11) NOT NULL,
  `receptor_id` int(11) NOT NULL,
  `contenido` text NOT NULL,
  `leido` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `anuncio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_conv` (`emisor_id`,`receptor_id`),
  KEY `idx_receptor_leido` (`receptor_id`,`leido`),
  CONSTRAINT `mensajes_ibfk_1` FOREIGN KEY (`emisor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mensajes_ibfk_2` FOREIGN KEY (`receptor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `noticias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `noticias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(500) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `link` varchar(1000) NOT NULL,
  `source` varchar(100) DEFAULT NULL,
  `image_url` varchar(1500) DEFAULT NULL,
  `fecha_publicacion` datetime DEFAULT NULL,
  `fecha_capturada` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_link` (`link`(500)),
  KEY `idx_fecha_pub` (`fecha_publicacion`),
  KEY `idx_source` (`source`)
) ENGINE=InnoDB AUTO_INCREMENT=32123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `novedades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `novedades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `autor` varchar(160) NOT NULL,
  `sinopsis` text DEFAULT NULL,
  `portada_url` varchar(500) DEFAULT NULL,
  `enlace` varchar(500) NOT NULL,
  `genero` varchar(80) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'aprobado',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_estado_created` (`estado`,`created_at`),
  KEY `idx_usuario` (`usuario_id`),
  CONSTRAINT `novedades_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `palabras_aprendidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `palabras_aprendidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `libro_id` int(11) DEFAULT NULL,
  `palabra` varchar(190) NOT NULL,
  `definicion` text DEFAULT NULL,
  `idioma` varchar(10) DEFAULT 'es',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_word` (`usuario_id`,`palabra`),
  KEY `libro_id` (`libro_id`),
  CONSTRAINT `palabras_aprendidas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `palabras_aprendidas_ibfk_2` FOREIGN KEY (`libro_id`) REFERENCES `libros` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `podcasts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `podcasts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `autor` varchar(150) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `url_fuente` varchar(500) DEFAULT NULL,
  `portada_url` mediumtext DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `estado` enum('por_escuchar','escuchando','escuchado') DEFAULT 'por_escuchar',
  `rating` tinyint(4) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `episodios_total` int(11) DEFAULT 0,
  `episodios_escuchados` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `audio_url` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  CONSTRAINT `podcasts_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `post_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_likes` (
  `post_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  PRIMARY KEY (`post_id`,`usuario_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('reseña','recomendacion','reflexion','general') DEFAULT 'general',
  `titulo` varchar(200) DEFAULT NULL,
  `contenido` text NOT NULL,
  `imagen` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reading_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reading_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `hours` int(11) NOT NULL,
  `log_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reading_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subrayados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subrayados` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `libro_id` int(11) NOT NULL,
  `cfi_range` varchar(500) NOT NULL,
  `texto` text DEFAULT NULL,
  `color` varchar(20) DEFAULT 'amber',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_libro` (`libro_id`),
  CONSTRAINT `fk_sub_libro` FOREIGN KEY (`libro_id`) REFERENCES `libros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `suscripciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suscripciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `plan` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `current_period_end` datetime DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_usuario` (`usuario_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `taller_novela`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `taller_novela` (
  `usuario_id` int(11) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`usuario_id`),
  CONSTRAINT `taller_novela_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trafico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trafico` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tipo` varchar(12) NOT NULL DEFAULT 'request',
  `metodo` varchar(8) DEFAULT NULL,
  `ruta` varchar(255) DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `pais` varchar(80) DEFAULT NULL,
  `pais_codigo` varchar(2) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_pais` (`pais_codigo`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `trafico_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9583 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `phone` varchar(30) DEFAULT NULL,
  `profile_image` mediumtext DEFAULT NULL,
  `reading_hours` int(11) DEFAULT 0,
  `podcast_seconds` int(10) unsigned DEFAULT 0,
  `reading_goal` int(11) DEFAULT NULL,
  `public_shelf` tinyint(1) DEFAULT 0,
  `plan` varchar(20) NOT NULL DEFAULT 'free',
  `plan_status` varchar(20) DEFAULT NULL,
  `storage_used_bytes` bigint(20) NOT NULL DEFAULT 0,
  `is_verified` tinyint(1) DEFAULT 0,
  `highlight_labels` text DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verification_code` varchar(10) DEFAULT NULL,
  `verification_expires` datetime DEFAULT NULL,
  `reset_code` varchar(10) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

