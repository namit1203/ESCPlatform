drop database nodelogin1;
CREATE DATABASE IF NOT EXISTS `nodelogin1` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `nodelogin1`;

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
(2, 'namit03', '1f0c5f828de862844ffdc19ce12cb1facdf41495', 'namit291203@gmail.com', 'Member', 'activated', '', '', '2022-01-11 17:30:11', '2022-01-12 19:47:11', '', '');
CREATE TABLE Team (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  member_id INT ,
  game_type VARCHAR(255) NOT NULL,
  contact_type VARCHAR(255) NOT NULL,
  contact_detail VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  captain_id INT NOT NULL,
  tournament_id INT,
  avatar LONGBLOB,
  FOREIGN KEY (captain_id) REFERENCES accounts(id)

);

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

  CREATE TABLE IF NOT EXISTS `tournament` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(50) NOT NULL,
    `detail` varchar(50) NOT NULL,
    `type` enum('free','payable') NOT NULL DEFAULT 'free',
    `game_type` varchar(50) NOT NULL,
    `start_date` DATETIME NOT NULL,
    `end_date` DATETIME NOT NULL,
    `tournament_format` VARCHAR(255) NOT NULL,
    `creator_id`INT NOT NULL,
    `total_team`INT NOT NULL,
    `team_id` INT,
    `decription` varchar(50) NOT NULL,
    `prize_decription` varchar(50) NOT NULL,
    `prize_total` INT NOT NULL,
    `prize_1`INT NOT NULL,
    `prize_2`INT NOT NULL,
    `prize_3`INT NOT NULL,
    `prize_4`INT NOT NULL,
    `banner` LONGBLOB,
    `checkin_time` varchar(50) NOT NULL,
    `approved` TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (creator_id) REFERENCES accounts(id),
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `match` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `team_1_id` INT NOT NULL,
  `team_2_id` INT NOT NULL,
 `game_type` VARCHAR(255) NOT NULL,
  `match_date` DATETIME NOT NULL,
  `winner_id` INT,
  FOREIGN KEY (team_1_id) REFERENCES Team(id),
  FOREIGN KEY (team_2_id) REFERENCES Team(id),
  FOREIGN KEY (winner_id) REFERENCES Team(id)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8;

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `category`) VALUES
(1, 'account_activation', 'false', 'General'),
(2, 'mail_from', 'Your Company Name <noreply@yourdomain.com>', 'General'),
(3, 'csrf_protection', 'false', 'Add-ons'),
(4, 'brute_force_protection', 'false', 'Add-ons'),
(5, 'twofactor_protection', 'false', 'Add-ons'),
(6, 'auto_login_after_register', 'false', 'Registration'),
(7, 'recaptcha', 'false', 'reCAPTCHA'),
(8, 'recaptcha_site_key', '6Lcf4U4mAAAAABywWKKVcvV175m3IH5OR50a0r2g', 'reCAPTCHA'),
(9, 'recaptcha_secret_key', '6LeIxAcTAAAAAGG-6Lcf4U4mAAAAAL_mL3TElZFcC3MrwpJAu80v1V52', 'reCAPTCHA');