function resolveOrderFilters(query = {}) {
  const {
    orgName = '',
    loginUserName = '',
    adUserNick = '',
    sellerNick = '',
    itemTitle = '',
    orderStatus = '',
    startDate = '',
    endDate = ''
  } = query

  const scopedLoginUserName = String(orgName).trim()
  const filters = {
    adUserNick,
    sellerNick,
    itemTitle,
    orderStatus,
    startDate,
    endDate
  }

  if (scopedLoginUserName) {
    filters.scopedLoginUserName = scopedLoginUserName
  } else if (loginUserName) {
    filters.loginUserName = loginUserName
  }

  return filters
}

module.exports = {
  resolveOrderFilters
}
