function stringifyJS(value) {
  const { stringify } = require("javascript-stringify")
  // 2个空格格式化显示
  return stringify(value, null, 2)
}

module.exports = {
  stringifyJS,
}
