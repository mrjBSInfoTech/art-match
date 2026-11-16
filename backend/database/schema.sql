-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3307
-- Generation Time: Nov 15, 2026 at 06:32 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `art_match`
--

DELIMITER $$
--
-- Functions
--
DROP FUNCTION IF EXISTS `title_case_name`$$
CREATE FUNCTION `title_case_name` (`input_text` VARCHAR(255)) RETURNS VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci DETERMINISTIC BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE result_text VARCHAR(255) DEFAULT '';
    DECLARE current_char CHAR(1);
    DECLARE capitalize_next BOOLEAN DEFAULT TRUE;

    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    SET input_text = TRIM(input_text);

    WHILE i <= CHAR_LENGTH(input_text) DO

        SET current_char =
            SUBSTRING(input_text, i, 1);

        IF current_char IN (' ', '-', '''') THEN

            SET result_text =
                CONCAT(
                    result_text,
                    current_char
                );

            SET capitalize_next = TRUE;

        ELSEIF capitalize_next THEN

            SET result_text =
                CONCAT(
                    result_text,
                    UPPER(current_char)
                );

            SET capitalize_next = FALSE;

        ELSE

            SET result_text =
                CONCAT(
                    result_text,
                    LOWER(current_char)
                );

        END IF;

        SET i = i + 1;

    END WHILE;

    RETURN result_text;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `about_page_content`
--

CREATE TABLE IF NOT EXISTS `about_page_content` (
  `content_id` tinyint(3) UNSIGNED NOT NULL,
  `content_json` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `account_access`
--

CREATE TABLE IF NOT EXISTS `account_access` (
  `role` varchar(20) NOT NULL,
  `account_id` int(11) NOT NULL,
  `strikes` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `is_banned` tinyint(1) NOT NULL DEFAULT 0,
  `banned_at` datetime DEFAULT NULL,
  `ban_reason` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `account_notifications`
--

CREATE TABLE IF NOT EXISTS `account_notifications` (
  `notification_id` int(11) NOT NULL,
  `role` varchar(20) NOT NULL,
  `account_id` int(11) NOT NULL,
  `notification_type` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `order_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `accregistration`
--

CREATE TABLE IF NOT EXISTS `accregistration` (
  `registration_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `registered_date` datetime DEFAULT current_timestamp(),
  `register_status` enum('Pending','Verified') DEFAULT 'Pending',
  `approved_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `address`
--

CREATE TABLE IF NOT EXISTS `address` (
  `address_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `region` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `postal_code` varchar(100) NOT NULL,
  `street_name` varchar(300) DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `add_cart`
--

CREATE TABLE IF NOT EXISTS `add_cart` (
  `add_to_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `total_price` decimal(10,2) DEFAULT 0.00,
  `date_created` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE IF NOT EXISTS `admin` (
  `admin_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `password` varchar(100) NOT NULL,
  `password_changed` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `admin_payout_permission_request`
--

CREATE TABLE IF NOT EXISTS `admin_payout_permission_request` (
  `request_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `reason` varchar(500) DEFAULT NULL,
  `reviewed_by_admin_id` int(11) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `admin_payout_wallet_change_approval`
--

CREATE TABLE IF NOT EXISTS `admin_payout_wallet_change_approval` (
  `approval_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `decision` enum('Approved','Rejected') NOT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_payout_wallet_change_request`
--

CREATE TABLE IF NOT EXISTS `admin_payout_wallet_change_request` (
  `request_id` int(11) NOT NULL,
  `super_admin_id` int(11) NOT NULL,
  `current_wallet_id` varchar(100) NOT NULL,
  `new_wallet_id` varchar(100) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `status` enum('Pending','Approved','Applied','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
  `approvals_required` int(11) NOT NULL DEFAULT 3,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `applied_at` datetime DEFAULT NULL,
  `applied_by_admin_id` int(11) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_role`
--

CREATE TABLE IF NOT EXISTS `admin_role` (
  `admin_role_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `role` enum('super admin','admin','moderator','customize') NOT NULL DEFAULT 'admin',
  `can_add` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_promote` tinyint(1) NOT NULL DEFAULT 0,
  `can_demote` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `application_migrations`
--

CREATE TABLE IF NOT EXISTS `application_migrations` (
  `migration_key` varchar(191) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `artupload`
--

CREATE TABLE IF NOT EXISTS `artupload` (
  `artupload_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `request_status` enum('Pending','Verified','Unverified','Rejected') DEFAULT 'Pending',
  `request_date` datetime DEFAULT current_timestamp(),
  `approved_date` datetime DEFAULT NULL,
  `rejection_date` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `artwork`
--

CREATE TABLE IF NOT EXISTS `artwork` (
  `artwork_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `genre` varchar(100) DEFAULT NULL,
  `color_used` varchar(500) DEFAULT NULL,
  `art_size` varchar(100) DEFAULT NULL,
  `art_type` varchar(50) NOT NULL,
  `product` varchar(100) NOT NULL,
  `status` enum('Available','Reserved','Sold') DEFAULT 'Available',
  `is_sold` tinyint(1) NOT NULL DEFAULT 0,
  `date_created` date DEFAULT NULL,
  `artwork_details` JSON DEFAULT NULL,
  `care_instructions` text DEFAULT NULL,
  `stock_quantity` int(11) DEFAULT 0,
  `exact_art_type` varchar(100) DEFAULT NULL,
  `product_type` enum('Premade','Digital','Customize') NOT NULL DEFAULT 'Premade',
  `payment_mode` enum('straight') NOT NULL DEFAULT 'straight',
  `upfront_percentage` decimal(5,2) DEFAULT NULL,
  `product_sample_image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `artwork_reviews`
--

CREATE TABLE IF NOT EXISTS `artwork_reviews` (
  `review_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `artwork_id` int(11) DEFAULT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `comment` text DEFAULT NULL,
  `seller_response` text DEFAULT NULL,
  `seller_response_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `audit_id` int(11) NOT NULL,
  `datetime` timestamp NOT NULL DEFAULT current_timestamp(),
  `action` varchar(50) NOT NULL,
  `actor` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `status` varchar(30) NOT NULL,
  `information` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `ban_logs`
--

CREATE TABLE IF NOT EXISTS `ban_logs` (
  `ban_log_id` int(11) NOT NULL,
  `role` varchar(20) NOT NULL,
  `account_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action` enum('BAN','UNBAN') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `buyer_artwork_image_view`
--

CREATE TABLE IF NOT EXISTS `buyer_artwork_image_view` (
  `view_id` bigint(20) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `artwork_id` int(11) DEFAULT NULL,
  `image_filename` varchar(255) NOT NULL,
  `watermark_code` varchar(10) NOT NULL,
  `viewed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `buyer_watermark_code`
--

CREATE TABLE IF NOT EXISTS `buyer_watermark_code` (
  `customer_id` int(11) NOT NULL,
  `watermark_code` char(5) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `cart_item`
--

CREATE TABLE IF NOT EXISTS `cart_item` (
  `cart_item_id` int(11) NOT NULL,
  `add_to_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `quantity` int(11) NOT NULL DEFAULT 1,
  `selected_products` JSON DEFAULT NULL,
  `order_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `chat_blocks`
--

CREATE TABLE IF NOT EXISTS `chat_blocks` (
  `blocker_type` enum('buyer','seller') NOT NULL,
  `blocker_id` int(11) NOT NULL,
  `blocked_type` enum('buyer','seller') NOT NULL,
  `blocked_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_key_recovery`
--

CREATE TABLE IF NOT EXISTS `chat_key_recovery` (
  `account_type` enum('buyer','seller') NOT NULL,
  `account_id` int(11) NOT NULL,
  `public_key` text NOT NULL,
  `encrypted_private_key` text NOT NULL,
  `salt` varchar(64) NOT NULL,
  `iv` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `backup_version` tinyint(3) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `chat_public_keys`
--

CREATE TABLE IF NOT EXISTS `chat_public_keys` (
  `public_key_id` int(11) NOT NULL,
  `account_type` enum('buyer','seller') NOT NULL,
  `account_id` int(11) NOT NULL,
  `public_key` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `conversation`
--

CREATE TABLE IF NOT EXISTS `conversation` (
  `conversation_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `conversation_read_state`
--

CREATE TABLE IF NOT EXISTS `conversation_read_state` (
  `conversation_id` int(11) NOT NULL,
  `account_type` enum('buyer','seller') NOT NULL,
  `account_id` int(11) NOT NULL,
  `last_read_message_id` int(11) NOT NULL DEFAULT 0,
  `hidden_through_message_id` int(11) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE IF NOT EXISTS `customer` (
  `customer_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_private` tinyint(1) NOT NULL DEFAULT 0,
  `allow_personalized_recommendations` tinyint(1) NOT NULL DEFAULT 1,
  `consent_given_at` datetime DEFAULT NULL,
  `consent_version` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `customer_artist_follow`
--

CREATE TABLE IF NOT EXISTS `customer_artist_follow` (
  `follow_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `customer_favorite`
--

CREATE TABLE IF NOT EXISTS `customer_favorite` (
  `favorite_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE IF NOT EXISTS `events` (
  `event_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime DEFAULT NULL,
  `image_key` varchar(500) DEFAULT NULL,
  `image_original_name` varchar(255) DEFAULT NULL,
  `image_content_type` varchar(100) DEFAULT NULL,
  `image_size` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('Draft','Published','Archived') NOT NULL DEFAULT 'Published',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `faq_entries`
--

CREATE TABLE IF NOT EXISTS `faq_entries` (
  `faq_id` int(11) NOT NULL,
  `question` varchar(255) NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `feature`
--

CREATE TABLE IF NOT EXISTS `feature` (
  `feature_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL,
  `feature_scanned` text DEFAULT NULL,
  `mediums_used` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `footer_content`
--

CREATE TABLE IF NOT EXISTS `footer_content` (
  `content_id` tinyint(3) UNSIGNED NOT NULL,
  `content_json` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_certificate`
--

CREATE TABLE IF NOT EXISTS `marketplace_certificate` (
  `artwork_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `certificate_id` varchar(64) NOT NULL,
  `certificate_svg` mediumtext NOT NULL,
  `published_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_certificate_access`
--

CREATE TABLE IF NOT EXISTS `marketplace_certificate_access` (
  `access_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `order_item_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `ownership_status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `revoked_at` datetime DEFAULT NULL,
  `revocation_reason` varchar(255) DEFAULT NULL,
  `return_request_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_certificate_delivery`
--

CREATE TABLE IF NOT EXISTS `marketplace_certificate_delivery` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT current_timestamp(),
  `access_status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `revoked_at` datetime DEFAULT NULL,
  `revocation_reason` varchar(255) DEFAULT NULL,
  `return_request_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_certificate_identity`
--

CREATE TABLE IF NOT EXISTS `marketplace_certificate_identity` (
  `artwork_id` int(11) NOT NULL,
  `public_token` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_order`
--

CREATE TABLE IF NOT EXISTS `marketplace_order` (
  `order_id` int(11) NOT NULL,
  `order_number` varchar(32) DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `buyer_name` varchar(201) NOT NULL,
  `buyer_email` varchar(255) DEFAULT NULL,
  `payment_method` enum('paymongo','cod') NOT NULL,
  `payment_status` enum('Pending','Paid','Failed','Expired','Refunded') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `paymongo_checkout_session_id` varchar(100) DEFAULT NULL,
  `paymongo_checkout_url` varchar(2048) DEFAULT NULL,
  `paymongo_payment_id` varchar(100) DEFAULT NULL,
  `paymongo_payment_method` varchar(50) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `shipping_street` varchar(255) NOT NULL,
  `shipping_barangay` varchar(100) NOT NULL,
  `shipping_city` varchar(100) NOT NULL,
  `shipping_province` varchar(100) DEFAULT NULL,
  `shipping_region` varchar(100) NOT NULL,
  `shipping_postal_code` varchar(20) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 150.00,
  `total_amount` decimal(12,2) NOT NULL,
  `status` enum('Pending','Confirmed','Packed','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `parcel_photos` JSON DEFAULT NULL,
  `tracking_url` varchar(2048) DEFAULT NULL,
  `handling_instructions` JSON DEFAULT NULL,
  `original_subtotal` decimal(12,2) DEFAULT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `voucher_code` varchar(20) DEFAULT NULL,
  `courier` varchar(50) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `delivery_method` enum('door_to_door','pickup') NOT NULL DEFAULT 'door_to_door',
  `received_photos` JSON DEFAULT NULL,
  `processing_fee` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_order_delivery_proof`
--

CREATE TABLE IF NOT EXISTS `marketplace_order_delivery_proof` (
  `proof_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `photo_count` int(11) NOT NULL DEFAULT 0,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_order_item`
--

CREATE TABLE IF NOT EXISTS `marketplace_order_item` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `artwork_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `artist_name` varchar(201) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `original_unit_price` decimal(12,2) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `product_option_id` varchar(100) DEFAULT NULL,
  `product_option_name` varchar(255) DEFAULT NULL,
  `selected_products` JSON DEFAULT NULL,
  `line_total` decimal(12,2) DEFAULT NULL,
  `original_line_total` decimal(12,2) DEFAULT NULL,
  `order_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_return_item`
--

CREATE TABLE IF NOT EXISTS `marketplace_return_item` (
  `return_item_id` int(11) NOT NULL,
  `return_request_id` int(11) NOT NULL,
  `order_item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL
) ;

--
-- --------------------------------------------------------

--
-- Table structure for table `marketplace_return_request`
--

CREATE TABLE IF NOT EXISTS `marketplace_return_request` (
  `return_request_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `reason` varchar(100) NOT NULL,
  `details` text NOT NULL,
  `status` enum('Requested','Approved','Rejected','Cancelled','Return Shipped','Received','Completed') NOT NULL DEFAULT 'Requested',
  `seller_response` text DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `decision_at` datetime DEFAULT NULL,
  `return_shipped_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `return_tracking_url` varchar(2048) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `return_courier` varchar(50) DEFAULT NULL,
  `return_tracking_number` varchar(100) DEFAULT NULL,
  `evidence_photos` JSON DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `message`
--

CREATE TABLE IF NOT EXISTS `message` (
  `message_id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_type` enum('buyer','seller') NOT NULL,
  `sender_name` varchar(201) DEFAULT NULL,
  `sender_public_key` text DEFAULT NULL,
  `encryption_iv` varchar(64) DEFAULT NULL,
  `attachment_iv` varchar(64) DEFAULT NULL,
  `media_type` varchar(100) DEFAULT NULL,
  `message_data` text NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `program_page_content`
--

CREATE TABLE IF NOT EXISTS `program_page_content` (
  `content_id` tinyint(3) UNSIGNED NOT NULL,
  `content_json` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `promotion_header_requests`
--

CREATE TABLE IF NOT EXISTS `promotion_header_requests` (
  `request_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(11) NOT NULL,
  `message` varchar(200) NOT NULL,
  `button_label` varchar(60) NOT NULL,
  `button_url` varchar(1000) NOT NULL,
  `status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `promotion_slides`
--

CREATE TABLE IF NOT EXISTS `promotion_slides` (
  `slide_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `button_label` varchar(60) DEFAULT NULL,
  `button_url` varchar(2048) DEFAULT NULL,
  `image_key` varchar(500) NOT NULL,
  `image_original_name` varchar(255) DEFAULT NULL,
  `image_content_type` varchar(100) DEFAULT NULL,
  `image_size` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('Draft','Published') NOT NULL DEFAULT 'Draft',
  `review_status` enum('none','pending','accepted','rejected') NOT NULL DEFAULT 'none',
  `review_requested_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `published_until` datetime DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 2,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `promotion_slide_activity`
--

CREATE TABLE IF NOT EXISTS `promotion_slide_activity` (
  `activity_id` bigint(20) UNSIGNED NOT NULL,
  `slide_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `actor_type` enum('admin','student') NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `slide_title` varchar(200) NOT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `purchase_detail`
--

CREATE TABLE IF NOT EXISTS `purchase_detail` (
  `detail_id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `receipt`
--

CREATE TABLE IF NOT EXISTS `receipt` (
  `receipt_id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `issued_by` varchar(100) DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recommendation_interaction`
--

CREATE TABLE IF NOT EXISTS `recommendation_interaction` (
  `interaction_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `artwork_id` int(11) DEFAULT NULL,
  `event_type` varchar(32) NOT NULL,
  `search_query` varchar(255) DEFAULT NULL,
  `filter_type` varchar(50) DEFAULT NULL,
  `filter_value` varchar(255) DEFAULT NULL,
  `min_price` decimal(10,2) DEFAULT NULL,
  `max_price` decimal(10,2) DEFAULT NULL,
  `source_page` varchar(100) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_order_refund`
--

CREATE TABLE IF NOT EXISTS `seller_order_refund` (
  `refund_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `return_request_id` int(11) DEFAULT NULL,
  `provider_refund_id` varchar(100) NOT NULL,
  `provider_payment_id` varchar(100) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('Pending','Succeeded','Failed') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payment_split`
--

CREATE TABLE IF NOT EXISTS `seller_payment_split` (
  `split_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `gross_amount` decimal(12,2) NOT NULL,
  `commission_rate` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `commission_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `processing_fee_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payout_status` enum('Held','Eligible','Processing','Paid','Reversed','Failed','Cancelled') NOT NULL DEFAULT 'Held',
  `eligible_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `payout_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `provider_transfer_id` varchar(100) DEFAULT NULL,
  `provider_reference` varchar(100) DEFAULT NULL,
  `failure_reason` varchar(500) DEFAULT NULL,
  `requested_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payout_amount` decimal(12,2) DEFAULT NULL,
  `hold_reason` varchar(500) DEFAULT NULL,
  `payout_provider` enum('demo','paymongo') DEFAULT NULL,
  `approval_cycle_id` int(11) DEFAULT NULL,
  `provider_batch_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payout_account`
--

CREATE TABLE IF NOT EXISTS `seller_payout_account` (
  `payout_account_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `destination_type` varchar(24) NOT NULL,
  `institution_code` varchar(80) NOT NULL,
  `institution_name` varchar(150) NOT NULL,
  `institution_provider` varchar(80) NOT NULL,
  `account_name` varchar(180) NOT NULL,
  `account_number_ciphertext` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payout_account_approval`
--

CREATE TABLE IF NOT EXISTS `seller_payout_account_approval` (
  `approval_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `decision` enum('Approved','Rejected') NOT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payout_account_request`
--

CREATE TABLE IF NOT EXISTS `seller_payout_account_request` (
  `request_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `destination_type` varchar(24) NOT NULL,
  `institution_code` varchar(80) NOT NULL,
  `institution_name` varchar(150) NOT NULL,
  `institution_provider` varchar(80) NOT NULL,
  `account_name` varchar(180) NOT NULL,
  `account_number_ciphertext` text NOT NULL,
  `status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `rejection_reason` varchar(500) DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payout_approval`
--

CREATE TABLE IF NOT EXISTS `seller_payout_approval` (
  `approval_id` int(11) NOT NULL,
  `cycle_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `decision` enum('Approved','Rejected') NOT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payout_approval_cycle`
--

CREATE TABLE IF NOT EXISTS `seller_payout_approval_cycle` (
  `cycle_id` int(11) NOT NULL,
  `split_id` int(11) NOT NULL,
  `requested_by_admin_id` int(11) NOT NULL,
  `approval_status` enum('Pending Approval','Approved','Rejected','Invalidated') NOT NULL DEFAULT 'Pending Approval',
  `payout_provider` enum('demo','paymongo') NOT NULL,
  `payout_mode` enum('demo','test','live') NOT NULL,
  `amount_centavos` bigint(20) UNSIGNED NOT NULL,
  `snapshot_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `approved_at` datetime DEFAULT NULL,
  `released_by_admin_id` int(11) DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `invalidation_reason` varchar(500) DEFAULT NULL
) ;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_payout_attempt`
--

CREATE TABLE IF NOT EXISTS `seller_payout_attempt` (
  `attempt_id` int(11) NOT NULL,
  `split_id` int(11) NOT NULL,
  `provider_reference` varchar(100) NOT NULL,
  `provider_transfer_id` varchar(100) DEFAULT NULL,
  `status` enum('Processing','Paid','Failed','Unknown') NOT NULL DEFAULT 'Processing',
  `amount_centavos` bigint(20) UNSIGNED NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `destination_type` varchar(24) NOT NULL,
  `institution_code` varchar(80) NOT NULL,
  `institution_name` varchar(150) NOT NULL,
  `institution_provider` varchar(80) NOT NULL,
  `account_name` varchar(180) NOT NULL,
  `account_number_ciphertext` text NOT NULL,
  `admin_id` int(11) NOT NULL,
  `failure_reason` varchar(500) DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `paid_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `payout_provider` enum('demo','paymongo') NOT NULL DEFAULT 'paymongo',
  `payout_mode` enum('demo','test','live') NOT NULL DEFAULT 'test',
  `provider_batch_id` varchar(100) DEFAULT NULL
) ;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_voucher`
--

CREATE TABLE IF NOT EXISTS `seller_voucher` (
  `voucher_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `discount_type` enum('fixed','percentage','freebie') NOT NULL,
  `discount_value` decimal(12,2) DEFAULT NULL,
  `minimum_purchase` decimal(12,2) NOT NULL DEFAULT 0.00,
  `starts_on` date NOT NULL,
  `expires_on` date NOT NULL,
  `applies_to_all` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `seller_voucher_artwork`
--

CREATE TABLE IF NOT EXISTS `seller_voucher_artwork` (
  `voucher_id` int(11) NOT NULL,
  `artwork_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `storefront`
--

CREATE TABLE IF NOT EXISTS `storefront` (
  `storefront_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `shop_name` varchar(255) DEFAULT NULL,
  `shop_description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `specialties` JSON DEFAULT NULL,
  `pinned_artwork_ids` JSON DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `strike_logs`
--

CREATE TABLE IF NOT EXISTS `strike_logs` (
  `strike_log_id` int(11) NOT NULL,
  `role` varchar(20) NOT NULL,
  `account_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `strike_number` tinyint(3) UNSIGNED NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE IF NOT EXISTS `student` (
  `student_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `cor` varchar(255) DEFAULT NULL,
  `year_level` varchar(20) DEFAULT NULL,
  `student_number` varchar(50) DEFAULT NULL,
  `course` varchar(100) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `account_status` enum('active','expired') NOT NULL DEFAULT 'active',
  `expire_date` datetime NOT NULL DEFAULT (current_timestamp() + interval 3 month),
  `consent_given_at` datetime DEFAULT NULL,
  `consent_version` varchar(20) DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `support_conversation`
--

CREATE TABLE IF NOT EXISTS `support_conversation` (
  `support_conversation_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `last_customer_message_at` datetime DEFAULT NULL,
  `last_seller_message_at` datetime DEFAULT NULL,
  `last_admin_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `support_message`
--

CREATE TABLE IF NOT EXISTS `support_message` (
  `support_message_id` int(11) NOT NULL,
  `support_conversation_id` int(11) NOT NULL,
  `sender_type` enum('buyer','seller','admin') NOT NULL,
  `sender_name` varchar(201) DEFAULT NULL,
  `issue_type` varchar(100) DEFAULT NULL,
  `message_data` text DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `media_type` varchar(100) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `support_read_state`
--

CREATE TABLE IF NOT EXISTS `support_read_state` (
  `support_conversation_id` int(11) NOT NULL,
  `account_type` enum('buyer','seller','admin') NOT NULL,
  `account_id` int(11) NOT NULL,
  `last_read_message_id` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(1000) NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- --------------------------------------------------------

--
-- Table structure for table `transaction_tbl`
--

CREATE TABLE IF NOT EXISTS `transaction_tbl` (
  `transaction_id` int(11) NOT NULL,
  `address_id` int(11) NOT NULL,
  `add_to_id` int(11) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `date_created` datetime DEFAULT current_timestamp(),
  `total_amount` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `about_page_content`
--
ALTER TABLE `about_page_content`
  ADD PRIMARY KEY (`content_id`);

--
-- Indexes for table `account_access`
--
ALTER TABLE `account_access`
  ADD PRIMARY KEY (`role`,`account_id`);

--
-- Indexes for table `account_notifications`
--
ALTER TABLE `account_notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_account_notifications_account` (`role`,`account_id`),
  ADD KEY `idx_account_notifications_created` (`created_at`),
  ADD KEY `idx_account_notifications_order` (`order_id`);

--
-- Indexes for table `accregistration`
--
ALTER TABLE `accregistration`
  ADD PRIMARY KEY (`registration_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `address`
--
ALTER TABLE `address`
  ADD PRIMARY KEY (`address_id`),
  ADD KEY `fk_address_customer` (`customer_id`);

--
-- Indexes for table `add_cart`
--
ALTER TABLE `add_cart`
  ADD PRIMARY KEY (`add_to_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `admin_payout_permission_request`
--
ALTER TABLE `admin_payout_permission_request`
  ADD PRIMARY KEY (`request_id`),
  ADD UNIQUE KEY `uq_admin_payout_permission_admin` (`admin_id`),
  ADD KEY `fk_payout_perm_reviewer` (`reviewed_by_admin_id`);

--
-- Indexes for table `admin_payout_wallet_change_approval`
--
ALTER TABLE `admin_payout_wallet_change_approval`
  ADD PRIMARY KEY (`approval_id`),
  ADD UNIQUE KEY `uq_wallet_change_admin` (`request_id`,`admin_id`),
  ADD KEY `fk_wallet_change_approval_admin` (`admin_id`);

--
-- Indexes for table `admin_payout_wallet_change_request`
--
ALTER TABLE `admin_payout_wallet_change_request`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `idx_wallet_change_status` (`status`),
  ADD KEY `fk_wallet_change_super_admin` (`super_admin_id`),
  ADD KEY `fk_wallet_change_applier` (`applied_by_admin_id`);

--
-- Indexes for table `admin_role`
--
ALTER TABLE `admin_role`
  ADD PRIMARY KEY (`admin_role_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `application_migrations`
--
ALTER TABLE `application_migrations`
  ADD PRIMARY KEY (`migration_key`);

--
-- Indexes for table `artupload`
--
ALTER TABLE `artupload`
  ADD PRIMARY KEY (`artupload_id`),
  ADD KEY `artwork_id` (`artwork_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `artwork`
--
ALTER TABLE `artwork`
  ADD PRIMARY KEY (`artwork_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `artwork_reviews`
--
ALTER TABLE `artwork_reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD UNIQUE KEY `order_item_id` (`order_item_id`),
  ADD KEY `fk_artwork_review_order` (`order_id`),
  ADD KEY `fk_artwork_review_artwork` (`artwork_id`),
  ADD KEY `idx_artwork_review_seller` (`seller_id`,`created_at`),
  ADD KEY `idx_artwork_review_customer` (`customer_id`,`created_at`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`audit_id`);

--
-- Indexes for table `ban_logs`
--
ALTER TABLE `ban_logs`
  ADD PRIMARY KEY (`ban_log_id`),
  ADD KEY `idx_ban_logs_account` (`role`,`account_id`),
  ADD KEY `idx_ban_logs_created` (`created_at`);

--
-- Indexes for table `buyer_artwork_image_view`
--
ALTER TABLE `buyer_artwork_image_view`
  ADD PRIMARY KEY (`view_id`),
  ADD KEY `idx_buyer_artwork_image_view_code` (`watermark_code`,`viewed_at`),
  ADD KEY `idx_buyer_artwork_image_view_artwork` (`artwork_id`,`viewed_at`),
  ADD KEY `idx_buyer_artwork_image_view_customer` (`customer_id`,`viewed_at`);

--
-- Indexes for table `buyer_watermark_code`
--
ALTER TABLE `buyer_watermark_code`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `watermark_code` (`watermark_code`);

--
-- Indexes for table `cart_item`
--
ALTER TABLE `cart_item`
  ADD PRIMARY KEY (`cart_item_id`),
  ADD UNIQUE KEY `add_to_id` (`add_to_id`,`artwork_id`),
  ADD KEY `artwork_id` (`artwork_id`);

--
-- Indexes for table `chat_blocks`
--
ALTER TABLE `chat_blocks`
  ADD PRIMARY KEY (`blocker_type`,`blocker_id`,`blocked_type`,`blocked_id`),
  ADD KEY `idx_chat_blocks_target` (`blocked_type`,`blocked_id`);

--
-- Indexes for table `chat_key_recovery`
--
ALTER TABLE `chat_key_recovery`
  ADD PRIMARY KEY (`account_type`,`account_id`);

--
-- Indexes for table `chat_public_keys`
--
ALTER TABLE `chat_public_keys`
  ADD PRIMARY KEY (`public_key_id`),
  ADD UNIQUE KEY `uq_chat_public_key_account` (`account_type`,`account_id`);

--
-- Indexes for table `conversation`
--
ALTER TABLE `conversation`
  ADD PRIMARY KEY (`conversation_id`),
  ADD UNIQUE KEY `student_id` (`student_id`,`customer_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `conversation_read_state`
--
ALTER TABLE `conversation_read_state`
  ADD PRIMARY KEY (`conversation_id`,`account_type`,`account_id`),
  ADD KEY `idx_conversation_read_account` (`account_type`,`account_id`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `customer_artist_follow`
--
ALTER TABLE `customer_artist_follow`
  ADD PRIMARY KEY (`follow_id`),
  ADD UNIQUE KEY `uq_customer_artist_follow` (`customer_id`,`student_id`),
  ADD KEY `idx_customer_artist_follow_student` (`student_id`,`created_at`);

--
-- Indexes for table `customer_favorite`
--
ALTER TABLE `customer_favorite`
  ADD PRIMARY KEY (`favorite_id`),
  ADD UNIQUE KEY `uq_customer_favorite` (`customer_id`,`artwork_id`),
  ADD KEY `fk_customer_favorite_artwork` (`artwork_id`),
  ADD KEY `idx_customer_favorite_customer` (`customer_id`,`created_at`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_events_admin` (`admin_id`),
  ADD KEY `idx_events_status_start` (`status`,`start_at`);

--
-- Indexes for table `faq_entries`
--
ALTER TABLE `faq_entries`
  ADD PRIMARY KEY (`faq_id`);

--
-- Indexes for table `feature`
--
ALTER TABLE `feature`
  ADD PRIMARY KEY (`feature_id`),
  ADD KEY `artwork_id` (`artwork_id`);

--
-- Indexes for table `footer_content`
--
ALTER TABLE `footer_content`
  ADD PRIMARY KEY (`content_id`);

--
-- Indexes for table `marketplace_certificate`
--
ALTER TABLE `marketplace_certificate`
  ADD PRIMARY KEY (`artwork_id`),
  ADD KEY `idx_marketplace_certificate_seller` (`seller_id`,`published_at`);

--
-- Indexes for table `marketplace_certificate_access`
--
ALTER TABLE `marketplace_certificate_access`
  ADD PRIMARY KEY (`access_id`),
  ADD UNIQUE KEY `uq_certificate_access_order_item` (`order_item_id`),
  ADD KEY `idx_certificate_access_customer` (`customer_id`,`ownership_status`),
  ADD KEY `idx_certificate_access_order` (`order_id`,`order_item_id`),
  ADD KEY `idx_certificate_access_artwork` (`artwork_id`,`ownership_status`);

--
-- Indexes for table `marketplace_certificate_delivery`
--
ALTER TABLE `marketplace_certificate_delivery`
  ADD PRIMARY KEY (`order_item_id`),
  ADD UNIQUE KEY `uq_certificate_delivery_message` (`message_id`),
  ADD KEY `fk_certificate_delivery_conversation` (`conversation_id`),
  ADD KEY `idx_certificate_delivery_order` (`order_id`,`sent_at`);

--
-- Indexes for table `marketplace_certificate_identity`
--
ALTER TABLE `marketplace_certificate_identity`
  ADD PRIMARY KEY (`artwork_id`),
  ADD UNIQUE KEY `public_token` (`public_token`);

--
-- Indexes for table `marketplace_order`
--
ALTER TABLE `marketplace_order`
  ADD PRIMARY KEY (`order_id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `idx_marketplace_order_customer` (`customer_id`,`created_at`),
  ADD KEY `idx_marketplace_order_seller` (`seller_id`,`created_at`),
  ADD KEY `idx_marketplace_order_payment_reference` (`payment_reference`);

--
-- Indexes for table `marketplace_order_delivery_proof`
--
ALTER TABLE `marketplace_order_delivery_proof`
  ADD PRIMARY KEY (`proof_id`),
  ADD UNIQUE KEY `uq_delivery_proof_order` (`order_id`),
  ADD KEY `idx_delivery_proof_seller` (`seller_id`,`submitted_at`);

--
-- Indexes for table `marketplace_order_item`
--
ALTER TABLE `marketplace_order_item`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `fk_marketplace_order_item_order` (`order_id`),
  ADD KEY `idx_marketplace_order_item_artwork` (`artwork_id`);

--
-- Indexes for table `marketplace_return_item`
--
ALTER TABLE `marketplace_return_item`
  ADD PRIMARY KEY (`return_item_id`),
  ADD UNIQUE KEY `uq_marketplace_return_item` (`return_request_id`,`order_item_id`),
  ADD KEY `idx_marketplace_return_item_order_item` (`order_item_id`,`return_request_id`);

--
-- Indexes for table `marketplace_return_request`
--
ALTER TABLE `marketplace_return_request`
  ADD PRIMARY KEY (`return_request_id`),
  ADD KEY `idx_marketplace_return_order` (`order_id`,`status`),
  ADD KEY `idx_marketplace_return_customer` (`customer_id`,`requested_at`),
  ADD KEY `idx_marketplace_return_seller` (`seller_id`,`requested_at`),
  ADD KEY `idx_marketplace_return_conversation` (`conversation_id`,`requested_at`);

--
-- Indexes for table `message`
--
ALTER TABLE `message`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `conversation_id` (`conversation_id`);

--
-- Indexes for table `program_page_content`
--
ALTER TABLE `program_page_content`
  ADD PRIMARY KEY (`content_id`);

--
-- Indexes for table `promotion_header_requests`
--
ALTER TABLE `promotion_header_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_promotion_header_request_admin` (`reviewed_by`),
  ADD KEY `idx_promotion_header_request_status` (`status`,`created_at`),
  ADD KEY `idx_promotion_header_request_student` (`student_id`,`created_at`);

--
-- Indexes for table `promotion_slides`
--
ALTER TABLE `promotion_slides`
  ADD PRIMARY KEY (`slide_id`),
  ADD UNIQUE KEY `uq_promotion_slides_sort_order` (`sort_order`),
  ADD KEY `fk_promotion_slides_admin` (`admin_id`),
  ADD KEY `idx_promotion_slides_student` (`student_id`,`slide_id`),
  ADD KEY `idx_promotion_slides_review` (`review_status`,`review_requested_at`),
  ADD KEY `idx_promotion_slides_status_order` (`status`,`sort_order`,`slide_id`);

--
-- Indexes for table `promotion_slide_activity`
--
ALTER TABLE `promotion_slide_activity`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `idx_promotion_slide_activity_slide` (`slide_id`,`created_at`),
  ADD KEY `idx_promotion_slide_activity_student` (`student_id`,`created_at`),
  ADD KEY `idx_promotion_slide_activity_actor` (`actor_type`,`actor_id`,`created_at`);

--
-- Indexes for table `purchase_detail`
--
ALTER TABLE `purchase_detail`
  ADD PRIMARY KEY (`detail_id`),
  ADD KEY `transaction_id` (`transaction_id`),
  ADD KEY `artwork_id` (`artwork_id`);

--
-- Indexes for table `receipt`
--
ALTER TABLE `receipt`
  ADD PRIMARY KEY (`receipt_id`),
  ADD KEY `transaction_id` (`transaction_id`);

--
-- Indexes for table `recommendation_interaction`
--
ALTER TABLE `recommendation_interaction`
  ADD PRIMARY KEY (`interaction_id`),
  ADD KEY `idx_rec_customer_time` (`customer_id`,`created_at`),
  ADD KEY `idx_rec_customer_event` (`customer_id`,`event_type`,`created_at`),
  ADD KEY `idx_rec_artwork_time` (`artwork_id`,`created_at`),
  ADD KEY `idx_rec_event_type` (`event_type`),
  ADD KEY `idx_rec_session_time` (`session_id`,`created_at`),
  ADD KEY `idx_rec_session_event` (`session_id`,`event_type`,`created_at`);

--
-- Indexes for table `seller_order_refund`
--
ALTER TABLE `seller_order_refund`
  ADD PRIMARY KEY (`refund_id`),
  ADD UNIQUE KEY `uq_seller_order_refund_provider` (`provider_refund_id`),
  ADD KEY `idx_seller_order_refund_order` (`order_id`,`status`),
  ADD KEY `idx_seller_order_refund_return` (`return_request_id`,`status`);

--
-- Indexes for table `seller_payment_split`
--
ALTER TABLE `seller_payment_split`
  ADD PRIMARY KEY (`split_id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD UNIQUE KEY `uq_seller_payment_split_transfer` (`provider_transfer_id`),
  ADD KEY `idx_seller_payment_split_seller` (`seller_id`,`payout_status`),
  ADD KEY `idx_seller_payment_split_reference` (`payment_reference`);

--
-- Indexes for table `seller_payout_account`
--
ALTER TABLE `seller_payout_account`
  ADD PRIMARY KEY (`payout_account_id`),
  ADD UNIQUE KEY `uq_seller_payout_account_student` (`student_id`);

--
-- Indexes for table `seller_payout_account_approval`
--
ALTER TABLE `seller_payout_account_approval`
  ADD PRIMARY KEY (`approval_id`),
  ADD UNIQUE KEY `uq_payout_account_request_admin` (`request_id`,`admin_id`),
  ADD KEY `fk_payout_account_admin_approval` (`admin_id`);

--
-- Indexes for table `seller_payout_account_request`
--
ALTER TABLE `seller_payout_account_request`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `idx_seller_payout_account_request_student` (`student_id`,`status`);

--
-- Indexes for table `seller_payout_approval`
--
ALTER TABLE `seller_payout_approval`
  ADD PRIMARY KEY (`approval_id`),
  ADD UNIQUE KEY `uq_payout_cycle_admin` (`cycle_id`,`admin_id`),
  ADD KEY `fk_payout_approval_admin` (`admin_id`);

--
-- Indexes for table `seller_payout_approval_cycle`
--
ALTER TABLE `seller_payout_approval_cycle`
  ADD PRIMARY KEY (`cycle_id`),
  ADD KEY `idx_payout_cycle_split` (`split_id`,`cycle_id`),
  ADD KEY `fk_payout_cycle_requester` (`requested_by_admin_id`),
  ADD KEY `fk_payout_cycle_releaser` (`released_by_admin_id`);

--
-- Indexes for table `seller_payout_attempt`
--
ALTER TABLE `seller_payout_attempt`
  ADD PRIMARY KEY (`attempt_id`),
  ADD UNIQUE KEY `uq_seller_payout_attempt_reference` (`provider_reference`),
  ADD UNIQUE KEY `uq_seller_payout_attempt_transfer` (`provider_transfer_id`),
  ADD KEY `idx_seller_payout_attempt_split` (`split_id`,`status`);

--
-- Indexes for table `seller_voucher`
--
ALTER TABLE `seller_voucher`
  ADD PRIMARY KEY (`voucher_id`),
  ADD KEY `idx_seller_voucher_student` (`student_id`,`created_at`),
  ADD KEY `idx_seller_voucher_code_active` (`code`,`starts_on`,`expires_on`);

--
-- Indexes for table `seller_voucher_artwork`
--
ALTER TABLE `seller_voucher_artwork`
  ADD PRIMARY KEY (`voucher_id`,`artwork_id`),
  ADD KEY `fk_seller_voucher_artwork_artwork` (`artwork_id`);

--
-- Indexes for table `storefront`
--
ALTER TABLE `storefront`
  ADD PRIMARY KEY (`storefront_id`),
  ADD UNIQUE KEY `student_id` (`student_id`);

--
-- Indexes for table `strike_logs`
--
ALTER TABLE `strike_logs`
  ADD PRIMARY KEY (`strike_log_id`),
  ADD KEY `idx_strike_logs_account` (`role`,`account_id`),
  ADD KEY `idx_strike_logs_created` (`created_at`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `student_number` (`student_number`);

--
-- Indexes for table `support_conversation`
--
ALTER TABLE `support_conversation`
  ADD PRIMARY KEY (`support_conversation_id`),
  ADD UNIQUE KEY `uq_support_conversation_customer` (`customer_id`),
  ADD UNIQUE KEY `uq_support_conversation_student` (`student_id`);

--
-- Indexes for table `support_message`
--
ALTER TABLE `support_message`
  ADD PRIMARY KEY (`support_message_id`),
  ADD KEY `idx_support_message_conversation` (`support_conversation_id`,`support_message_id`);

--
-- Indexes for table `support_read_state`
--
ALTER TABLE `support_read_state`
  ADD PRIMARY KEY (`support_conversation_id`,`account_type`,`account_id`),
  ADD KEY `idx_support_read_account` (`account_type`,`account_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `transaction_tbl`
--
ALTER TABLE `transaction_tbl`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `add_to_id` (`add_to_id`),
  ADD KEY `fk_transaction_address` (`address_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account_notifications`
--
ALTER TABLE `account_notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accregistration`
--
ALTER TABLE `accregistration`
  MODIFY `registration_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `address`
--
ALTER TABLE `address`
  MODIFY `address_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `add_cart`
--
ALTER TABLE `add_cart`
  MODIFY `add_to_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_payout_permission_request`
--
ALTER TABLE `admin_payout_permission_request`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_payout_wallet_change_approval`
--
ALTER TABLE `admin_payout_wallet_change_approval`
  MODIFY `approval_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_payout_wallet_change_request`
--
ALTER TABLE `admin_payout_wallet_change_request`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_role`
--
ALTER TABLE `admin_role`
  MODIFY `admin_role_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `artupload`
--
ALTER TABLE `artupload`
  MODIFY `artupload_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `artwork`
--
ALTER TABLE `artwork`
  MODIFY `artwork_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `artwork_reviews`
--
ALTER TABLE `artwork_reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `audit_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ban_logs`
--
ALTER TABLE `ban_logs`
  MODIFY `ban_log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `buyer_artwork_image_view`
--
ALTER TABLE `buyer_artwork_image_view`
  MODIFY `view_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cart_item`
--
ALTER TABLE `cart_item`
  MODIFY `cart_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_public_keys`
--
ALTER TABLE `chat_public_keys`
  MODIFY `public_key_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conversation`
--
ALTER TABLE `conversation`
  MODIFY `conversation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer`
--
ALTER TABLE `customer`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_artist_follow`
--
ALTER TABLE `customer_artist_follow`
  MODIFY `follow_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_favorite`
--
ALTER TABLE `customer_favorite`
  MODIFY `favorite_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `faq_entries`
--
ALTER TABLE `faq_entries`
  MODIFY `faq_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feature`
--
ALTER TABLE `feature`
  MODIFY `feature_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_certificate_access`
--
ALTER TABLE `marketplace_certificate_access`
  MODIFY `access_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_order`
--
ALTER TABLE `marketplace_order`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_order_delivery_proof`
--
ALTER TABLE `marketplace_order_delivery_proof`
  MODIFY `proof_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_order_item`
--
ALTER TABLE `marketplace_order_item`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_return_item`
--
ALTER TABLE `marketplace_return_item`
  MODIFY `return_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_return_request`
--
ALTER TABLE `marketplace_return_request`
  MODIFY `return_request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message`
--
ALTER TABLE `message`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `promotion_header_requests`
--
ALTER TABLE `promotion_header_requests`
  MODIFY `request_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `promotion_slides`
--
ALTER TABLE `promotion_slides`
  MODIFY `slide_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `promotion_slide_activity`
--
ALTER TABLE `promotion_slide_activity`
  MODIFY `activity_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_detail`
--
ALTER TABLE `purchase_detail`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `receipt`
--
ALTER TABLE `receipt`
  MODIFY `receipt_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recommendation_interaction`
--
ALTER TABLE `recommendation_interaction`
  MODIFY `interaction_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_order_refund`
--
ALTER TABLE `seller_order_refund`
  MODIFY `refund_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payment_split`
--
ALTER TABLE `seller_payment_split`
  MODIFY `split_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payout_account`
--
ALTER TABLE `seller_payout_account`
  MODIFY `payout_account_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payout_account_approval`
--
ALTER TABLE `seller_payout_account_approval`
  MODIFY `approval_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payout_account_request`
--
ALTER TABLE `seller_payout_account_request`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payout_approval`
--
ALTER TABLE `seller_payout_approval`
  MODIFY `approval_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payout_approval_cycle`
--
ALTER TABLE `seller_payout_approval_cycle`
  MODIFY `cycle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_payout_attempt`
--
ALTER TABLE `seller_payout_attempt`
  MODIFY `attempt_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_voucher`
--
ALTER TABLE `seller_voucher`
  MODIFY `voucher_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `storefront`
--
ALTER TABLE `storefront`
  MODIFY `storefront_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `strike_logs`
--
ALTER TABLE `strike_logs`
  MODIFY `strike_log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student`
--
ALTER TABLE `student`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_conversation`
--
ALTER TABLE `support_conversation`
  MODIFY `support_conversation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_message`
--
ALTER TABLE `support_message`
  MODIFY `support_message_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_tbl`
--
ALTER TABLE `transaction_tbl`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accregistration`
--
ALTER TABLE `accregistration`
  ADD CONSTRAINT `accregistration_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `accregistration_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE CASCADE;

--
-- Constraints for table `address`
--
ALTER TABLE `address`
  ADD CONSTRAINT `fk_address_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `add_cart`
--
ALTER TABLE `add_cart`
  ADD CONSTRAINT `add_cart_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_payout_permission_request`
--
ALTER TABLE `admin_payout_permission_request`
  ADD CONSTRAINT `fk_payout_perm_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payout_perm_reviewer` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL;

--
-- Constraints for table `admin_payout_wallet_change_approval`
--
ALTER TABLE `admin_payout_wallet_change_approval`
  ADD CONSTRAINT `fk_wallet_change_approval_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`),
  ADD CONSTRAINT `fk_wallet_change_approval_req` FOREIGN KEY (`request_id`) REFERENCES `admin_payout_wallet_change_request` (`request_id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_payout_wallet_change_request`
--
ALTER TABLE `admin_payout_wallet_change_request`
  ADD CONSTRAINT `fk_wallet_change_applier` FOREIGN KEY (`applied_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wallet_change_super_admin` FOREIGN KEY (`super_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_role`
--
ALTER TABLE `admin_role`
  ADD CONSTRAINT `admin_role_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE CASCADE;

--
-- Constraints for table `artupload`
--
ALTER TABLE `artupload`
  ADD CONSTRAINT `artupload_ibfk_1` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `artupload_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE CASCADE;

--
-- Constraints for table `artwork`
--
ALTER TABLE `artwork`
  ADD CONSTRAINT `artwork_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `artwork_reviews`
--
ALTER TABLE `artwork_reviews`
  ADD CONSTRAINT `fk_artwork_review_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_artwork_review_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_artwork_review_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `marketplace_order_item` (`order_item_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_artwork_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_artwork_reviews_seller` FOREIGN KEY (`seller_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `buyer_artwork_image_view`
--
ALTER TABLE `buyer_artwork_image_view`
  ADD CONSTRAINT `fk_buyer_artwork_image_view_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_buyer_artwork_image_view_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE SET NULL;

--
-- Constraints for table `buyer_watermark_code`
--
ALTER TABLE `buyer_watermark_code`
  ADD CONSTRAINT `fk_buyer_watermark_code_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE;

--
-- Constraints for table `cart_item`
--
ALTER TABLE `cart_item`
  ADD CONSTRAINT `cart_item_ibfk_1` FOREIGN KEY (`add_to_id`) REFERENCES `add_cart` (`add_to_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_item_ibfk_2` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE;

--
-- Constraints for table `conversation`
--
ALTER TABLE `conversation`
  ADD CONSTRAINT `conversation_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversation_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_artist_follow`
--
ALTER TABLE `customer_artist_follow`
  ADD CONSTRAINT `fk_customer_artist_follow_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_customer_artist_follow_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_favorite`
--
ALTER TABLE `customer_favorite`
  ADD CONSTRAINT `fk_customer_favorite_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_customer_favorite_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `fk_events_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL;

--
-- Constraints for table `feature`
--
ALTER TABLE `feature`
  ADD CONSTRAINT `feature_ibfk_1` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_certificate`
--
ALTER TABLE `marketplace_certificate`
  ADD CONSTRAINT `fk_marketplace_certificate_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_marketplace_certificate_seller` FOREIGN KEY (`seller_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_certificate_delivery`
--
ALTER TABLE `marketplace_certificate_delivery`
  ADD CONSTRAINT `fk_certificate_delivery_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`conversation_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_certificate_delivery_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_certificate_delivery_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `marketplace_order_item` (`order_item_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_certificate_identity`
--
ALTER TABLE `marketplace_certificate_identity`
  ADD CONSTRAINT `marketplace_certificate_identity_ibfk_1` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_order_delivery_proof`
--
ALTER TABLE `marketplace_order_delivery_proof`
  ADD CONSTRAINT `fk_delivery_proof_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_order_item`
--
ALTER TABLE `marketplace_order_item`
  ADD CONSTRAINT `fk_marketplace_order_item_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_marketplace_order_item_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_return_item`
--
ALTER TABLE `marketplace_return_item`
  ADD CONSTRAINT `fk_marketplace_return_item_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `marketplace_order_item` (`order_item_id`),
  ADD CONSTRAINT `fk_marketplace_return_item_request` FOREIGN KEY (`return_request_id`) REFERENCES `marketplace_return_request` (`return_request_id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_return_request`
--
ALTER TABLE `marketplace_return_request`
  ADD CONSTRAINT `fk_marketplace_return_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`conversation_id`),
  ADD CONSTRAINT `fk_marketplace_return_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  ADD CONSTRAINT `fk_marketplace_return_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`),
  ADD CONSTRAINT `fk_marketplace_return_seller` FOREIGN KEY (`seller_id`) REFERENCES `student` (`student_id`);

--
-- Constraints for table `message`
--
ALTER TABLE `message`
  ADD CONSTRAINT `message_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`conversation_id`) ON DELETE CASCADE;

--
-- Constraints for table `promotion_header_requests`
--
ALTER TABLE `promotion_header_requests`
  ADD CONSTRAINT `fk_promotion_header_request_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_promotion_header_request_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `promotion_slides`
--
ALTER TABLE `promotion_slides`
  ADD CONSTRAINT `fk_promotion_slides_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_promotion_slides_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_detail`
--
ALTER TABLE `purchase_detail`
  ADD CONSTRAINT `purchase_detail_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transaction_tbl` (`transaction_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_detail_ibfk_2` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE;

--
-- Constraints for table `receipt`
--
ALTER TABLE `receipt`
  ADD CONSTRAINT `receipt_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transaction_tbl` (`transaction_id`) ON DELETE CASCADE;

--
-- Constraints for table `recommendation_interaction`
--
ALTER TABLE `recommendation_interaction`
  ADD CONSTRAINT `fk_rec_interaction_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rec_interaction_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `seller_order_refund`
--
ALTER TABLE `seller_order_refund`
  ADD CONSTRAINT `fk_seller_order_refund_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`),
  ADD CONSTRAINT `fk_seller_order_refund_return` FOREIGN KEY (`return_request_id`) REFERENCES `marketplace_return_request` (`return_request_id`);

--
-- Constraints for table `seller_payment_split`
--
ALTER TABLE `seller_payment_split`
  ADD CONSTRAINT `fk_seller_payment_split_order` FOREIGN KEY (`order_id`) REFERENCES `marketplace_order` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_seller_payment_split_seller` FOREIGN KEY (`seller_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `seller_payout_account`
--
ALTER TABLE `seller_payout_account`
  ADD CONSTRAINT `fk_seller_payout_account_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`);

--
-- Constraints for table `seller_payout_account_approval`
--
ALTER TABLE `seller_payout_account_approval`
  ADD CONSTRAINT `fk_payout_account_admin_approval` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`),
  ADD CONSTRAINT `fk_payout_account_req_approval` FOREIGN KEY (`request_id`) REFERENCES `seller_payout_account_request` (`request_id`) ON DELETE CASCADE;

--
-- Constraints for table `seller_payout_account_request`
--
ALTER TABLE `seller_payout_account_request`
  ADD CONSTRAINT `fk_payout_account_request_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`);

--
-- Constraints for table `seller_payout_approval`
--
ALTER TABLE `seller_payout_approval`
  ADD CONSTRAINT `fk_payout_approval_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`),
  ADD CONSTRAINT `fk_payout_approval_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `seller_payout_approval_cycle` (`cycle_id`);

--
-- Constraints for table `seller_payout_approval_cycle`
--
ALTER TABLE `seller_payout_approval_cycle`
  ADD CONSTRAINT `fk_payout_cycle_releaser` FOREIGN KEY (`released_by_admin_id`) REFERENCES `admin` (`admin_id`),
  ADD CONSTRAINT `fk_payout_cycle_requester` FOREIGN KEY (`requested_by_admin_id`) REFERENCES `admin` (`admin_id`),
  ADD CONSTRAINT `fk_payout_cycle_split` FOREIGN KEY (`split_id`) REFERENCES `seller_payment_split` (`split_id`);

--
-- Constraints for table `seller_payout_attempt`
--
ALTER TABLE `seller_payout_attempt`
  ADD CONSTRAINT `fk_seller_payout_attempt_split` FOREIGN KEY (`split_id`) REFERENCES `seller_payment_split` (`split_id`);

--
-- Constraints for table `seller_voucher`
--
ALTER TABLE `seller_voucher`
  ADD CONSTRAINT `fk_seller_voucher_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `seller_voucher_artwork`
--
ALTER TABLE `seller_voucher_artwork`
  ADD CONSTRAINT `fk_seller_voucher_artwork_artwork` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_seller_voucher_artwork_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `seller_voucher` (`voucher_id`) ON DELETE CASCADE;

--
-- Constraints for table `storefront`
--
ALTER TABLE `storefront`
  ADD CONSTRAINT `fk_storefront_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `support_conversation`
--
ALTER TABLE `support_conversation`
  ADD CONSTRAINT `fk_support_conversation_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_support_conversation_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `support_message`
--
ALTER TABLE `support_message`
  ADD CONSTRAINT `fk_support_message_conversation` FOREIGN KEY (`support_conversation_id`) REFERENCES `support_conversation` (`support_conversation_id`) ON DELETE CASCADE;

--
-- Constraints for table `support_read_state`
--
ALTER TABLE `support_read_state`
  ADD CONSTRAINT `fk_support_read_conversation` FOREIGN KEY (`support_conversation_id`) REFERENCES `support_conversation` (`support_conversation_id`) ON DELETE CASCADE;

--
-- Constraints for table `transaction_tbl`
--
ALTER TABLE `transaction_tbl`
  ADD CONSTRAINT `fk_transaction_address` FOREIGN KEY (`address_id`) REFERENCES `address` (`address_id`),
  ADD CONSTRAINT `transaction_tbl_ibfk_1` FOREIGN KEY (`add_to_id`) REFERENCES `add_cart` (`add_to_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
