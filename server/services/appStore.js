const { db } = require('../db')
const { usesMysqlApp } = require('../config/database')
const mysqlDb = require('../db/mysql')

function isMysqlApp() {
  return usesMysqlApp()
}

function currentTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

async function queryAll(sql, params = []) {
  if (!usesMysqlApp()) {
    return db.prepare(sql).all(...params)
  }
  return mysqlDb.queryAppAll(sql, params)
}

async function queryOne(sql, params = []) {
  if (!usesMysqlApp()) {
    return db.prepare(sql).get(...params)
  }
  return mysqlDb.queryAppOne(sql, params)
}

async function execute(sql, params = []) {
  if (!usesMysqlApp()) {
    return db.prepare(sql).run(...params)
  }
  return mysqlDb.executeApp(sql, params)
}

function getLastInsertId(result) {
  if (!usesMysqlApp()) {
    return result.lastInsertRowid
  }
  return result.insertId
}

async function insertIgnore(sqliteSql, mysqlSql, params = []) {
  return execute(usesMysqlApp() ? mysqlSql : sqliteSql, params)
}

module.exports = {
  isMysqlApp,
  currentTimestamp,
  queryAll,
  queryOne,
  execute,
  getLastInsertId,
  insertIgnore
}
