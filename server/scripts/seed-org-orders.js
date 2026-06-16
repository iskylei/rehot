require('../config/env')
const { initMysqlPools } = require('../db/mysql')
const { usesMysqlOrders } = require('../config/database')
const { seedOrgOrders } = require('../seeds/orgOrdersSeed')

if (require.main === module) {
  const force = process.argv.includes('--force')

  ;(async () => {
    if (usesMysqlOrders()) {
      await initMysqlPools()
    } else {
      require('../db')
    }

    const result = await seedOrgOrders({ force })
    console.log(result.message || result)
    if (result.organizations?.length) {
      console.log(`机构列表：${result.organizations.join('、')}`)
    }
  })().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}

module.exports = { seedOrgOrders }
