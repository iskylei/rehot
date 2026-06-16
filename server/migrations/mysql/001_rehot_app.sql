-- REHOT 应用库建表脚本
-- 数据库：rehot（系统用户、权限、菜单、热浪、登录配置等）

CREATE DATABASE IF NOT EXISTS `rehot`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `rehot`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(64) DEFAULT '',
  `status` varchar(16) DEFAULT 'enabled',
  `role_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_uq` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户';

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `code` varchar(32) NOT NULL,
  `description` varchar(255) DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_code_uq` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色';

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `code` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_code_uq` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='权限';

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `role_permissions_role_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_permission_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色权限关联';

CREATE TABLE IF NOT EXISTS `menus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int DEFAULT 0,
  `title` varchar(64) NOT NULL,
  `path` varchar(128) DEFAULT '',
  `icon` varchar(64) DEFAULT '',
  `permission_code` varchar(64) DEFAULT '',
  `sort_order` int DEFAULT 0,
  `enabled` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='菜单';

CREATE TABLE IF NOT EXISTS `heat_waves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `region` varchar(64) NOT NULL,
  `city` varchar(64) NOT NULL,
  `max_temperature` decimal(5, 2) NOT NULL,
  `alert_level` varchar(16) NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'planned',
  `start_date` varchar(16) NOT NULL,
  `end_date` varchar(16) DEFAULT '',
  `description` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='热浪事件';

CREATE TABLE IF NOT EXISTS `app_settings` (
  `key` varchar(64) NOT NULL,
  `value` text NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应用配置';

-- mysql 全量模式时，订单表也可放在 rehot 库
CREATE TABLE IF NOT EXISTS `sys_tb_order` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `biz_order_id` varchar(64) NOT NULL COMMENT '淘宝子编号',
  `parent_order_id` varchar(64) DEFAULT NULL COMMENT '淘宝主编号',
  `seller_nick` varchar(32) DEFAULT NULL COMMENT '服务商昵称',
  `item_title` varchar(128) DEFAULT NULL COMMENT '商品名称',
  `item_id` varchar(32) DEFAULT NULL COMMENT '商品编号',
  `ad_user_nick` varchar(32) DEFAULT NULL COMMENT '达人昵称',
  `agency_nick` varchar(64) DEFAULT NULL COMMENT '机构昵称',
  `order_status` varchar(64) DEFAULT NULL COMMENT '订单状态',
  `order_paid_time` varchar(64) DEFAULT NULL COMMENT '支付日期',
  `order_amount` varchar(32) DEFAULT NULL COMMENT '支付金额',
  `predict_amount` varchar(64) DEFAULT NULL COMMENT '预估佣金收入',
  `order_commission_amount` varchar(64) DEFAULT NULL COMMENT '成交金额',
  `seller_commission_ratio` varchar(16) DEFAULT NULL COMMENT '佣金比例',
  `remark` varchar(128) DEFAULT NULL COMMENT '备注',
  `refund_amount` varchar(32) DEFAULT NULL COMMENT '退款金额',
  `predict_total_amount` varchar(32) DEFAULT NULL COMMENT '预测总金额',
  `buy_amount` int DEFAULT NULL COMMENT '购买数量',
  `create_by` varchar(64) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `login_user_name` varchar(128) DEFAULT NULL COMMENT '机构名称',
  `user_flow` varchar(100) DEFAULT NULL COMMENT '流量',
  PRIMARY KEY (`id`),
  KEY `sys_tb_order_order_paid_time_IDX` (`order_paid_time`, `item_title`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='直播订单';
