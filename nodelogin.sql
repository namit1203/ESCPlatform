CREATE DATABASE IF NOT EXISTS `nodelogin` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `nodelogin`;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` enum('Member','Admin') NOT NULL DEFAULT 'Member',
  `activation_code` varchar(255) NOT NULL DEFAULT '',
  `rememberme` varchar(255) NOT NULL DEFAULT '',
  `reset` varchar(255) NOT NULL DEFAULT '',
  `registered` datetime NOT NULL DEFAULT current_timestamp(),
  `last_seen` datetime NOT NULL DEFAULT current_timestamp(),
  `tfa_code` varchar(255) NOT NULL DEFAULT '',
  `ip` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

INSERT INTO `accounts` (`id`, `username`, `password`, `email`, `role`, `activation_code`, `rememberme`, `reset`, `registered`, `last_seen`, `tfa_code`, `ip`) VALUES
(1, 'admin', 'd033e22ae348aeb5660fc2140aec35850c4da997', 'admin@example.com', 'Admin', 'activated', '', '', '2022-01-11 17:30:11', '2022-02-01 19:10:30', '', ''),
(2, 'member', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'member@example.com', 'Member', 'activated', '', '', '2022-01-11 17:30:11', '2022-01-12 19:47:11', '', '');

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(255) NOT NULL,
  `attempts_left` tinyint(1) NOT NULL DEFAULT 5,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ip_address` (`ip_address`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'General',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8;

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `category`) VALUES
(1, 'account_activation', 'false', 'General'),
(2, 'mail_from', 'Your Company Name <noreply@yourdomain.com>', 'General'),
(3, 'csrf_protection', 'false', 'Add-ons'),
(4, 'brute_force_protection', 'false', 'Add-ons'),
(5, 'twofactor_protection', 'false', 'Add-ons'),
(6, 'auto_login_after_register', 'false', 'Registration'),
(7, 'recaptcha', 'false', 'reCAPTCHA'),
(8, 'recaptcha_site_key', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', 'reCAPTCHA'),
(9, 'recaptcha_secret_key', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe', 'reCAPTCHA');