-- MySQL dump 10.13  Distrib 5.7.17, for macos10.12 (x86_64)
--
-- Host: 127.0.0.1    Database: likemap
-- ------------------------------------------------------
-- Server version	5.6.25

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `lm_agree`
--

DROP TABLE IF EXISTS `lm_agree`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_agree` (
  `ag_id` int(11) NOT NULL AUTO_INCREMENT,
  `ag_long` double NOT NULL,
  `ag_lat` double NOT NULL,
  `ag_agree` float NOT NULL,
  `ag_comment` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `ag_user` varchar(50) COLLATE utf8_bin NOT NULL,
  `ag_image_ref` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `ag_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ag_ip` varchar(20) COLLATE utf8_bin NOT NULL,
  `ag_like_id` int(11) DEFAULT NULL,
  `ag_hwref` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`ag_id`),
  KEY `li_long` (`ag_long`,`ag_lat`),
  KEY `li_long_2` (`ag_long`),
  KEY `li_lat` (`ag_lat`)
) ENGINE=InnoDB AUTO_INCREMENT=4446 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_category`
--

DROP TABLE IF EXISTS `lm_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_category` (
  `ca_id` int(11) NOT NULL AUTO_INCREMENT,
  `ca_application` varchar(45) NOT NULL,
  PRIMARY KEY (`ca_id`),
  UNIQUE KEY `ca_id_UNIQUE` (`ca_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_category_name`
--

DROP TABLE IF EXISTS `lm_category_name`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_category_name` (
  `can_id` int(11) NOT NULL AUTO_INCREMENT,
  `can_language` varchar(10) NOT NULL DEFAULT 'de',
  `can_name` varchar(45) NOT NULL,
  `can_description` varchar(160) NOT NULL,
  `can_category_id` int(11) NOT NULL,
  PRIMARY KEY (`can_id`),
  UNIQUE KEY `can_id_UNIQUE` (`can_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_category_value`
--

DROP TABLE IF EXISTS `lm_category_value`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_category_value` (
  `cav_id` int(11) NOT NULL AUTO_INCREMENT,
  `cav_category_id` int(11) NOT NULL,
  PRIMARY KEY (`cav_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_category_value_name`
--

DROP TABLE IF EXISTS `lm_category_value_name`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_category_value_name` (
  `cavn_id` int(11) NOT NULL AUTO_INCREMENT,
  `cavn_language` varchar(10) NOT NULL,
  `cavn_name` varchar(45) NOT NULL,
  `cavn_category_value_id` int(11) NOT NULL,
  PRIMARY KEY (`cavn_id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_confirmations`
--

DROP TABLE IF EXISTS `lm_confirmations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_confirmations` (
  `co_id` int(11) NOT NULL AUTO_INCREMENT,
  `co_uid` varchar(50) COLLATE utf8_bin NOT NULL,
  `co_email` varchar(120) COLLATE utf8_bin DEFAULT NULL,
  `co_sms` varchar(30) COLLATE utf8_bin DEFAULT NULL,
  `co_key` varchar(50) COLLATE utf8_bin NOT NULL,
  `co_date_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `co_hwref` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`co_id`),
  UNIQUE KEY `co_key` (`co_key`)
) ENGINE=InnoDB AUTO_INCREMENT=488 DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='confirmation codes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_customer`
--

DROP TABLE IF EXISTS `lm_customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_customer` (
  `cu_id` int(11) NOT NULL AUTO_INCREMENT,
  `cu_user_id` int(11) NOT NULL DEFAULT '0',
  `cu_address` varchar(300) COLLATE utf8_bin DEFAULT NULL,
  `cu_tax_id` varchar(30) COLLATE utf8_bin DEFAULT NULL,
  `cu_reference` varchar(30) COLLATE utf8_bin DEFAULT NULL,
  `cu_payment_reference` varchar(30) COLLATE utf8_bin DEFAULT NULL,
  `cu_credit` int(11) NOT NULL DEFAULT '0' COMMENT 'Current credits',
  `cu_validated` tinyint(1) NOT NULL DEFAULT '0',
  `cu_type` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT 'basic',
  `cu_language` varchar(4) COLLATE utf8_bin NOT NULL DEFAULT 'de',
  `cu_country` varchar(4) COLLATE utf8_bin NOT NULL DEFAULT 'AT',
  `cu_full_name` varchar(60) COLLATE utf8_bin NOT NULL,
  `cu_default_category` varchar(128) COLLATE utf8_bin NOT NULL DEFAULT ' ',
  `cu_default_long` double NOT NULL,
  `cu_default_lat` double NOT NULL,
  `cu_default_image_ref` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT 'smile',
  `cu_default_marker` varchar(50) COLLATE utf8_bin NOT NULL,
  `cu_email` varchar(1024) COLLATE utf8_bin NOT NULL,
  `cu_phone` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `cu_contact` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `cu_webpage` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `cu_status` varchar(45) COLLATE utf8_bin DEFAULT 'new',
  `cu_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cu_id`),
  KEY `cu_user_id` (`cu_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_customer_validation`
--

DROP TABLE IF EXISTS `lm_customer_validation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_customer_validation` (
  `cv_id` int(11) NOT NULL AUTO_INCREMENT,
  `cv_customer_id` int(11) NOT NULL,
  `cv_code` varchar(45) DEFAULT NULL,
  `cv_comment` varchar(160) DEFAULT NULL,
  `cv_user_id` int(11) NOT NULL,
  `cv_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cv_nickname` varchar(128) DEFAULT 'none',
  PRIMARY KEY (`cv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_event`
--

DROP TABLE IF EXISTS `lm_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_event` (
  `ev_id` int(11) NOT NULL AUTO_INCREMENT,
  `ev_spot_id` int(11) NOT NULL,
  `ev_description` varchar(1024) CHARACTER SET utf8mb4 NOT NULL,
  `ev_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ev_image_ref` varchar(1024) COLLATE utf8_bin NOT NULL,
  `ev_url` varchar(1024) COLLATE utf8_bin NOT NULL,
  `ev_title` varchar(160) CHARACTER SET utf8mb4 NOT NULL,
  `ev_hash` varchar(50) COLLATE utf8_bin NOT NULL,
  `ev_source` varchar(50) COLLATE utf8_bin NOT NULL,
  `ev_time_description` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT ' ',
  PRIMARY KEY (`ev_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3450 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_feedback`
--

DROP TABLE IF EXISTS `lm_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_feedback` (
  `fe_id` int(11) NOT NULL AUTO_INCREMENT,
  `fe_details` varchar(1024) DEFAULT NULL,
  `fe_use` varchar(160) DEFAULT NULL,
  `fe_how` varchar(160) DEFAULT NULL,
  `fe_ip` varchar(64) DEFAULT NULL,
  `fe_user_id` int(11) NOT NULL,
  `fe_date_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fe_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_gift`
--

DROP TABLE IF EXISTS `lm_gift`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_gift` (
  `gi_id` int(11) NOT NULL AUTO_INCREMENT,
  `gi_user_id` int(11) NOT NULL COMMENT 'user that gets the gift',
  `gi_promotion_id` int(11) NOT NULL COMMENT 'ref of promotion',
  `gi_image_reference` varchar(1024) COLLATE utf8_bin NOT NULL COMMENT 'optional custom image',
  `gi_end_time` timestamp NULL DEFAULT NULL COMMENT 'end of validity',
  `gi_promotion` varchar(160) CHARACTER SET utf8mb4 DEFAULT 'Grex-app sends you this gift.',
  `gi_comment` varchar(160) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Grex-app sends you this gift.',
  `gi_user_nick` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT ' ',
  `gi_is_redeemed` tinyint(1) NOT NULL DEFAULT '0',
  `gi_redeem_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `gi_redeem_longitude` double DEFAULT NULL,
  `gi_redeem_latitude` double DEFAULT NULL,
  `gi_code` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT 'GREX',
  `gi_longitude` double NOT NULL DEFAULT '0',
  `gi_latitude` double NOT NULL DEFAULT '0',
  `gi_promotion_instance_id` int(11) NOT NULL DEFAULT '0',
  `gi_user_comment` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `gi_hint` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `gi_count` int(11) NOT NULL DEFAULT '0',
  `gi_is_canceled` tinyint(1) NOT NULL DEFAULT '0',
  `gi_warn_time` timestamp NULL DEFAULT NULL,
  `gi_warn_message` varchar(1024) CHARACTER SET utf8mb4 DEFAULT NULL,
  `gi_warn_is_sent` tinyint(1) NOT NULL DEFAULT '0',
  `gi_warn_title` varchar(160) CHARACTER SET utf8mb4 DEFAULT NULL,
  PRIMARY KEY (`gi_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1093 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_image_cache`
--

DROP TABLE IF EXISTS `lm_image_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_image_cache` (
  `imc_id` int(11) NOT NULL AUTO_INCREMENT,
  `imc_image_reference` varchar(50) NOT NULL DEFAULT 'smile',
  `imc_comment` varchar(160) CHARACTER SET utf8mb4 DEFAULT NULL,
  `imc_customer_id` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`imc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_like`
--

DROP TABLE IF EXISTS `lm_like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_like` (
  `li_id` int(11) NOT NULL AUTO_INCREMENT,
  `li_long` double NOT NULL,
  `li_lat` double NOT NULL,
  `li_heading` double NOT NULL DEFAULT '0',
  `li_elevation` double NOT NULL DEFAULT '0',
  `li_like` float NOT NULL,
  `li_comment` varchar(160) CHARACTER SET utf8mb4 DEFAULT NULL,
  `li_user` varchar(50) COLLATE utf8_bin NOT NULL,
  `li_image_ref` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `li_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `li_ip` varchar(20) COLLATE utf8_bin NOT NULL,
  `li_vitality` int(11) NOT NULL DEFAULT '0',
  `li_agree` int(11) NOT NULL DEFAULT '0',
  `li_disagree` int(11) NOT NULL DEFAULT '0',
  `li_agree_short` int(11) NOT NULL DEFAULT '0',
  `li_disagree_short` int(11) NOT NULL DEFAULT '0',
  `li_date_created` timestamp NULL DEFAULT NULL,
  `li_promotion` varchar(160) CHARACTER SET utf8mb4 DEFAULT 'www.grex-app.com',
  `li_promo_id` int(11) DEFAULT NULL,
  `li_type` char(6) COLLATE utf8_bin NOT NULL DEFAULT 'LKE' COMMENT 'type of like',
  `li_view_count` int(11) NOT NULL DEFAULT '0',
  `li_category` varchar(128) CHARACTER SET utf8mb4 NOT NULL DEFAULT ' ',
  `li_event_id` int(11) NOT NULL DEFAULT '0',
  `li_marker_reference` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `li_marker_inner_reference` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `li_marker_tag_reference` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `li_kill_count` int(11) NOT NULL DEFAULT '0',
  `li_is_deactivated` tinyint(1) NOT NULL DEFAULT '0',
  `li_chat_count` int(11) NOT NULL DEFAULT '0',
  `li_strict_category` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `li_address` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `li_phone` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `li_contact_name` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `li_detail` varchar(1024) CHARACTER SET utf8mb4 DEFAULT NULL,
  `li_special_url` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `li_ignore_distance` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`li_id`),
  KEY `li_long` (`li_long`,`li_lat`),
  KEY `li_vitality` (`li_vitality`),
  FULLTEXT KEY `li_comment` (`li_comment`),
  FULLTEXT KEY `li_category` (`li_category`)
) ENGINE=MyISAM AUTO_INCREMENT=3461 DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='MyISAM for Fulltext Index';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_messaging`
--

DROP TABLE IF EXISTS `lm_messaging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_messaging` (
  `me_id` int(11) NOT NULL AUTO_INCREMENT,
  `me_type` varchar(6) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'none',
  `me_title` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
  `me_message` varchar(1014) CHARACTER SET utf8mb4 DEFAULT NULL,
  `me_message_html` varchar(1014) DEFAULT NULL,
  `me_status` int(11) NOT NULL DEFAULT '0',
  `me_recipients_group_id` int(11) NOT NULL DEFAULT '0',
  `me_user_id` int(11) DEFAULT NULL,
  `me_customer_id` int(11) DEFAULT NULL,
  `me_recipients_count` int(11) DEFAULT '0',
  `me_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `me_valid_until` timestamp NULL DEFAULT NULL,
  `me_phone_number` varchar(32) DEFAULT NULL,
  `me_promotion_instance` int(11) NOT NULL DEFAULT '0',
  `me_promotion_id` int(11) DEFAULT '0',
  `me_response_to` int(11) DEFAULT '0',
  `me_email` int(1) DEFAULT '0',
  `me_sms` int(1) DEFAULT '0',
  `me_chat` int(1) DEFAULT '0',
  `me_handled` int(1) DEFAULT '0',
  `me_read` int(1) DEFAULT '0',
  `me_sender_id` int(11) DEFAULT '0',
  PRIMARY KEY (`me_id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_profile`
--

DROP TABLE IF EXISTS `lm_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_profile` (
  `pro_id` int(11) NOT NULL AUTO_INCREMENT,
  `pro_customer_id` int(11) NOT NULL,
  `pro_name` varchar(64) NOT NULL,
  `pro_description` varchar(128) NOT NULL,
  `pro_key` varchar(32) NOT NULL DEFAULT 'none',
  `pro_application` varchar(10) NOT NULL DEFAULT 'help2day',
  PRIMARY KEY (`pro_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_profile_image_map`
--

DROP TABLE IF EXISTS `lm_profile_image_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_profile_image_map` (
  `pim_id` int(11) NOT NULL AUTO_INCREMENT,
  `pim_profile_id` int(11) NOT NULL,
  `pim_promotion_image_reference` varchar(64) DEFAULT NULL,
  `pim_filter_image_reference` varchar(64) DEFAULT NULL,
  `pim_customer_id` int(11) NOT NULL,
  PRIMARY KEY (`pim_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_promotion`
--

DROP TABLE IF EXISTS `lm_promotion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_promotion` (
  `pr_id` int(11) NOT NULL AUTO_INCREMENT,
  `pr_like_id` int(11) NOT NULL,
  `pr_gift_comment` varchar(160) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'GREX sends you this gift.',
  `pr_user_comment` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `pr_gift_image_reference` varchar(1024) COLLATE utf8_bin NOT NULL DEFAULT 'smile',
  `pr_gift_audio_reference` varchar(128) COLLATE utf8_bin DEFAULT NULL,
  `pr_gift_count` int(11) NOT NULL DEFAULT '0' COMMENT 'max playouts',
  `pr_gift_units_per_count` int(11) NOT NULL DEFAULT '1',
  `pr_gift_age` int(11) NOT NULL DEFAULT '0' COMMENT 'age in seconds',
  `pr_gift_block` int(11) NOT NULL DEFAULT '82400' COMMENT 'blocking time in seconds',
  `pr_start_time` timestamp NULL DEFAULT NULL,
  `pr_end_time` timestamp NULL DEFAULT NULL,
  `pr_customer_id` int(11) NOT NULL,
  `pr_customer_nick` varchar(60) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'ACME',
  `pr_current_count` int(11) NOT NULL DEFAULT '0' COMMENT 'already sent gifts',
  `pr_promotion` varchar(160) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'www.grex-app.com',
  `pr_hint` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `pr_instance_id` int(11) NOT NULL DEFAULT '0',
  `pr_name` varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'no name',
  `pr_code` varchar(6) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'PRCO',
  `pr_push` int(11) NOT NULL DEFAULT '0' COMMENT 'create push messages of higher than zero',
  `pr_duration` int(11) NOT NULL DEFAULT '7200',
  `pr_notifications` int(2) NOT NULL DEFAULT '0',
  `pr_is_helping_ticket` tinyint(1) NOT NULL DEFAULT '0',
  `pr_notification_phone` varchar(32) COLLATE utf8_bin DEFAULT NULL,
  `pr_requires_registration` tinyint(1) NOT NULL DEFAULT '0',
  `pr_allow_upcount` tinyint(1) NOT NULL DEFAULT '0',
  `pr_gift_phone` varchar(32) COLLATE utf8_bin DEFAULT NULL,
  `pr_impact` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `pr_impact_long` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `pr_impact_image_ref` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `pr_profile_id` int(11) DEFAULT '0',
  UNIQUE KEY `pr_id` (`pr_id`)
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_promotion_category_value_map`
--

DROP TABLE IF EXISTS `lm_promotion_category_value_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_promotion_category_value_map` (
  `pcam_id` int(11) NOT NULL AUTO_INCREMENT,
  `pcam_promotion_id` int(11) NOT NULL,
  `pcam_category_value_id` int(11) NOT NULL,
  PRIMARY KEY (`pcam_id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_promotion_instance`
--

DROP TABLE IF EXISTS `lm_promotion_instance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_promotion_instance` (
  `pi_id` int(11) NOT NULL AUTO_INCREMENT,
  `pi_start_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pi_end_time` timestamp NULL DEFAULT NULL,
  `pi_promotion_id` int(11) NOT NULL,
  `pi_gift_count` int(11) NOT NULL,
  `pi_gift_image_reference` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `pi_name` varchar(50) COLLATE utf8_bin NOT NULL,
  `pi_gift_comment` varchar(160) COLLATE utf8_bin NOT NULL,
  `pi_user_comment` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `pi_hint` varchar(160) COLLATE utf8_bin DEFAULT NULL,
  `pi_start_user_id` int(11) NOT NULL DEFAULT '0',
  `pi_end_user_id` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`pi_id`)
) ENGINE=InnoDB AUTO_INCREMENT=674 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_promotion_profile_map`
--

DROP TABLE IF EXISTS `lm_promotion_profile_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_promotion_profile_map` (
  `pp_id` int(11) NOT NULL AUTO_INCREMENT,
  `pp_profile_id` int(11) NOT NULL,
  `pp_promotion_id` int(11) NOT NULL,
  PRIMARY KEY (`pp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_recipients`
--

DROP TABLE IF EXISTS `lm_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_recipients` (
  `re_id` int(11) NOT NULL AUTO_INCREMENT,
  `re_customer_id` int(11) NOT NULL,
  `re_user_id` int(11) DEFAULT NULL,
  `re_email` varchar(1024) DEFAULT NULL,
  `re_phone` varchar(32) DEFAULT NULL,
  `re_locale` varchar(6) NOT NULL DEFAULT 'at-at',
  `re_group_id` int(11) NOT NULL,
  `re_email_encrypted` varchar(1024) DEFAULT NULL,
  `re_phone_encrypted` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`re_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_roles`
--

DROP TABLE IF EXISTS `lm_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_roles` (
  `ro_id` int(11) NOT NULL AUTO_INCREMENT,
  `ro_customer_id` int(11) NOT NULL,
  `ro_name` varchar(64) CHARACTER SET utf8 NOT NULL DEFAULT 'NONE',
  PRIMARY KEY (`ro_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sessions`
--

DROP TABLE IF EXISTS `lm_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sessions` (
  `se_session_id` varchar(255) COLLATE utf8_bin NOT NULL,
  `se_expires` int(11) unsigned NOT NULL,
  `se_data` text COLLATE utf8_bin,
  PRIMARY KEY (`se_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sig_event`
--

DROP TABLE IF EXISTS `lm_sig_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sig_event` (
  `se_id` int(11) NOT NULL AUTO_INCREMENT,
  `se_title` varchar(45) DEFAULT NULL,
  `se_message` varchar(300) DEFAULT NULL,
  `se_image_ref` varchar(45) DEFAULT NULL,
  `se_date` datetime DEFAULT NULL,
  `se_type` varchar(16) DEFAULT NULL,
  `se_marker` varchar(45) DEFAULT NULL,
  `se_sender_id` int(11) NOT NULL DEFAULT '1',
  `se_long` float DEFAULT NULL,
  `se_lat` float DEFAULT NULL,
  `se_category` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`se_id`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sig_image`
--

DROP TABLE IF EXISTS `lm_sig_image`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sig_image` (
  `si_id` int(11) NOT NULL AUTO_INCREMENT,
  `si_image_ref` varchar(45) DEFAULT NULL,
  `si_source_id` int(11) DEFAULT NULL,
  `si_key` varchar(45) DEFAULT NULL,
  `si_duration` int(11) DEFAULT NULL COMMENT 'duration in seconds',
  PRIMARY KEY (`si_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sig_kiosk_session`
--

DROP TABLE IF EXISTS `lm_sig_kiosk_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sig_kiosk_session` (
  `ks_id` int(11) NOT NULL AUTO_INCREMENT,
  `ks_key` varchar(45) NOT NULL DEFAULT 'none',
  `ks_category` varchar(45) DEFAULT NULL,
  `ks_longitude` float DEFAULT NULL,
  `ks_latitude` float DEFAULT NULL,
  `ks_radius` float DEFAULT NULL,
  `ks_statistic_category` varchar(45) DEFAULT NULL,
  `ks_session_title` varchar(45) DEFAULT NULL,
  `ks_session_message` varchar(160) DEFAULT NULL,
  `ks_video_url` varchar(1024) DEFAULT NULL,
  `ks_center_image_ref` varchar(45) DEFAULT NULL,
  `ks_animation` int(11) DEFAULT '0',
  `ks_api_key` varchar(45) NOT NULL,
  PRIMARY KEY (`ks_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sig_source`
--

DROP TABLE IF EXISTS `lm_sig_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sig_source` (
  `ss_id` int(11) NOT NULL AUTO_INCREMENT,
  `ss_url` varchar(1024) NOT NULL,
  `ss_user_id` int(11) DEFAULT NULL,
  `ss_date` varchar(45) DEFAULT NULL,
  `ss_year` int(11) DEFAULT NULL,
  `ss_title` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`ss_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sig_static_dataset`
--

DROP TABLE IF EXISTS `lm_sig_static_dataset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sig_static_dataset` (
  `ssd_id` int(11) NOT NULL AUTO_INCREMENT,
  `ssd_source_id` int(11) DEFAULT NULL,
  `ssd_hours` float DEFAULT NULL,
  `ssd_year` int(11) DEFAULT NULL,
  `ssd_category` varchar(45) DEFAULT NULL,
  `ssd_long` float DEFAULT NULL,
  `ssd_lat` float DEFAULT NULL,
  `ssd_radius` float DEFAULT NULL COMMENT 'km',
  `ssd_customer_id` int(11) DEFAULT NULL,
  `ssd_user_id` int(11) DEFAULT NULL,
  `ssd_region_nation` varchar(256) DEFAULT NULL,
  `ssd_region_province` varchar(256) DEFAULT NULL,
  `ssd_region_district` varchar(256) DEFAULT NULL,
  `ssd_region_community` varchar(256) DEFAULT NULL,
  `ssd_region_location` varchar(256) DEFAULT NULL,
  `ssd_region_address` varchar(256) DEFAULT NULL,
  `ssd_date` datetime DEFAULT NULL,
  `ssd_image_ref` varchar(45) DEFAULT NULL,
  `ssd_message` varchar(64) DEFAULT NULL,
  `ssd_title` varchar(45) DEFAULT NULL,
  `ssd_key` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`ssd_id`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_sig_video`
--

DROP TABLE IF EXISTS `lm_sig_video`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_sig_video` (
  `sv_id` int(11) NOT NULL AUTO_INCREMENT,
  `sv_url` varchar(45) DEFAULT NULL,
  `sv_key` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`sv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_timeline`
--

DROP TABLE IF EXISTS `lm_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_timeline` (
  `ti_id` int(11) NOT NULL AUTO_INCREMENT,
  `ti_like_id` int(11) NOT NULL DEFAULT '0',
  `ti_user_id` int(11) NOT NULL DEFAULT '0',
  `ti_message` varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'ups',
  `ti_promotion_id` int(11) NOT NULL DEFAULT '0',
  `ti_timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ti_type` int(2) NOT NULL DEFAULT '0' COMMENT '0 message, 1 hidden message',
  `ti_language` char(8) COLLATE utf8_bin NOT NULL DEFAULT 'de',
  `ti_parameter` varchar(32) COLLATE utf8_bin NOT NULL,
  `ti_title` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `ti_sender_id` int(11) DEFAULT NULL,
  `ti_response_to` int(11) DEFAULT NULL,
  PRIMARY KEY (`ti_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5114 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_user_category_value_map`
--

DROP TABLE IF EXISTS `lm_user_category_value_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_user_category_value_map` (
  `ucam_id` int(11) NOT NULL AUTO_INCREMENT,
  `ucam_user_id` int(11) NOT NULL,
  `ucam_category_value_id` int(11) NOT NULL,
  PRIMARY KEY (`ucam_id`)
) ENGINE=InnoDB AUTO_INCREMENT=320 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_user_device`
--

DROP TABLE IF EXISTS `lm_user_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_user_device` (
  `ud_id` int(11) NOT NULL AUTO_INCREMENT,
  `ud_uid` varchar(50) COLLATE utf8_bin NOT NULL,
  `ud_hwref` varchar(50) COLLATE utf8_bin NOT NULL,
  `ud_date_created` timestamp NULL DEFAULT NULL,
  `ud_initial_uid` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `ud_reference_id` varchar(1024) COLLATE utf8_bin DEFAULT '',
  `ud_language_code` varchar(16) COLLATE utf8_bin DEFAULT 'en',
  `ud_device_class` varchar(16) COLLATE utf8_bin DEFAULT 'android_mobile',
  `ud_system` varchar(256) COLLATE utf8_bin DEFAULT NULL,
  `ud_new_uid` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `ud_facebook_token` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `ud_email` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `ud_application` varchar(32) COLLATE utf8_bin DEFAULT NULL,
  `ud_version` varchar(32) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`ud_id`),
  KEY `INDEX` (`ud_hwref`)
) ENGINE=InnoDB AUTO_INCREMENT=922 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_user_profile_map`
--

DROP TABLE IF EXISTS `lm_user_profile_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_user_profile_map` (
  `upm_id` int(11) NOT NULL AUTO_INCREMENT,
  `upm_user_id` int(11) NOT NULL,
  `upm_profile_id` int(11) NOT NULL,
  `upm_weight` float DEFAULT NULL,
  PRIMARY KEY (`upm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_user_role_map`
--

DROP TABLE IF EXISTS `lm_user_role_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_user_role_map` (
  `urm_id` int(11) NOT NULL AUTO_INCREMENT,
  `urm_user_id` int(11) NOT NULL,
  `urm_role_id` int(11) NOT NULL,
  PRIMARY KEY (`urm_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_users`
--

DROP TABLE IF EXISTS `lm_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_users` (
  `us_id` int(20) unsigned NOT NULL AUTO_INCREMENT,
  `us_image_ref` char(40) COLLATE utf8_bin DEFAULT NULL,
  `us_email` char(254) COLLATE utf8_bin DEFAULT NULL,
  `us_nickname` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
  `us_uid` varchar(50) COLLATE utf8_bin NOT NULL COMMENT 'UID of user',
  `us_uid_update` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `us_facebook_id` varchar(120) COLLATE utf8_bin DEFAULT NULL,
  `us_facebook_token_shop` text COLLATE utf8_bin,
  `us_pw` varchar(50) COLLATE utf8_bin DEFAULT NULL COMMENT 'password of user',
  `us_pw_hashed` varchar(512) COLLATE utf8_bin DEFAULT NULL,
  `us_salt` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `us_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `us_action_control_flags` int(11) NOT NULL DEFAULT '0',
  `us_date_created` timestamp NULL DEFAULT NULL,
  `us_gift_count` int(11) NOT NULL DEFAULT '0',
  `us_like_count` int(11) NOT NULL DEFAULT '0',
  `us_agree_count` int(11) NOT NULL DEFAULT '0',
  `us_share_count` int(11) NOT NULL DEFAULT '0',
  `us_activity_rank` int(11) NOT NULL DEFAULT '0',
  `us_reset_password_token` varchar(100) COLLATE utf8_bin DEFAULT NULL,
  `us_reset_password_expires` timestamp NULL DEFAULT NULL,
  `us_phone` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `us_phone_encrypted` varchar(64) COLLATE utf8_bin DEFAULT NULL,
  `us_customer_id` int(11) DEFAULT '0',
  `us_role` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '0',
  `us_allow_email_notification` tinyint(1) NOT NULL DEFAULT '0',
  `us_allow_sms_notification` tinyint(1) NOT NULL DEFAULT '0',
  `us_long` float DEFAULT '16.37',
  `us_lat` float DEFAULT '48.2',
  `us_long_radius` float DEFAULT '0.3',
  `us_lat_radius` float DEFAULT '0.3',
  `us_email_encrypted` varchar(512) COLLATE utf8_bin DEFAULT NULL,
  `us_zoom` float DEFAULT NULL,
  `us_dont_encrypt_email` int(1) DEFAULT '0',
  `us_about_me` varchar(1024) COLLATE utf8_bin DEFAULT NULL,
  `us_sorted` int(11) DEFAULT '0',
  `us_settings_open` int(11) DEFAULT '0',
  PRIMARY KEY (`us_id`),
  KEY `us_uid` (`us_uid`),
  FULLTEXT KEY `us_nickname` (`us_nickname`)
) ENGINE=MyISAM AUTO_INCREMENT=982 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lm_view`
--

DROP TABLE IF EXISTS `lm_view`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lm_view` (
  `vw_id` int(12) unsigned NOT NULL AUTO_INCREMENT,
  `vw_like_id` varchar(50) COLLATE utf8_bin NOT NULL COMMENT 'like id',
  `vw_source` varchar(50) COLLATE utf8_bin NOT NULL COMMENT 'IP of client',
  `vw_reference` varchar(50) COLLATE utf8_bin DEFAULT NULL COMMENT 'uid of referencing user',
  `vw_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'timestamp of view',
  `vw_promotor` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT 'likemap',
  `vw_viewer` varchar(50) COLLATE utf8_bin DEFAULT NULL COMMENT 'uid of viewer if available',
  `vw_facility` varchar(256) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`vw_id`),
  KEY `vw_like_id` (`vw_like_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2616 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-10-18 21:57:56
