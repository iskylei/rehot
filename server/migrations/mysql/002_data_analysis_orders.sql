-- 生产直播订单库建表脚本
-- 数据库：data_analysis（与线上一致）

CREATE DATABASE IF NOT EXISTS `data_analysis`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `data_analysis`;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='直播数据';
