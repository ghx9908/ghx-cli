const fs = require("fs-extra")
const path = require("path")
const ora = require("ora")

//写入文件
function writeFileTree(dir, files) {
  Object.keys(files).forEach((name) => {
    const filePath = path.join(dir, name)
    fs.ensureDirSync(path.dirname(filePath)) //先确保文件所在的目录 是存在
    fs.writeFileSync(filePath, files[name])
  })
}

function stringifyJS(value) {
  const { stringify } = require("javascript-stringify")
  // 2个空格格式化显示
  return stringify(value, null, 2)
}
//提取调用的目录
function extractCallDir() {
  // extract api.render() callsite file location using error stack
  const obj = {}
  Error.captureStackTrace(obj)
  const callSite = obj.stack.split("\n")[3]

  // the regexp for the stack when called inside a named function
  const namedStackRegExp = /\s\((.*):\d+:\d+\)$/
  // the regexp for the stack when called inside an anonymous
  const anonymousStackRegExp = /at (.*):\d+:\d+$/

  let matchResult = callSite.match(namedStackRegExp)
  if (!matchResult) {
    matchResult = callSite.match(anonymousStackRegExp)
  }

  const fileName = matchResult[1]
  return path.dirname(fileName)
}
//合并依赖
function mergeDeps(sourceDeps, depsToInject) {
  const result = Object.assign({}, sourceDeps)

  for (const depName in depsToInject) {
    const sourceRange = sourceDeps[depName]
    const injectingRange = depsToInject[depName]

    if (sourceRange === injectingRange) continue

    result[depName] = injectingRange
  }
  return result
}

const isObject = (val) => val && typeof val === "object"

function sortObject(obj, keyOrder, dontSortByUnicode) {
  if (!obj) return
  const res = {}

  if (keyOrder) {
    keyOrder.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = obj[key]
        delete obj[key]
      }
    })
  }

  const keys = Object.keys(obj)

  !dontSortByUnicode && keys.sort()
  keys.forEach((key) => {
    res[key] = obj[key]
  })

  return res
}

function printScripts(pkg) {
  const descriptions = {
    build: "Compiles and minifies for production",
    serve: "Compiles and hot-reloads for development",
    lint: "Lints and fixes files",
    "test:e2e": "Run your end-to-end tests",
    "test:unit": "Run your unit tests",
  }

  return Object.keys(pkg.scripts || {})
    .map((key) => {
      if (!descriptions[key]) return ""
      return [
        `\n### ${descriptions[key]}`,
        "```",
        `npm run ${key}`,
        "```",
        "",
      ].join("\n")
    })
    .join("")
}

function generateReadme(pkg) {
  return [
    `# ${pkg.name}\n`,
    "## Project setup",
    "```",
    `npm install`,
    "```",
    printScripts(pkg),
    "### Customize configuration",
    "See [Configuration Reference](https://cli.vuejs.org/config/).",
    "",
  ].join("\n")
}

const pluginRE = /^@vue\/cli-plugin-/
const isPlugin = (id) => {
  // @vue/cli-plugin-eslint
  return pluginRE.test(id)
}

const toShortPluginId = function (id) {
  return id.replace(pluginRE, "") //@vue/cli-plugin-eslint => eslint
}

async function sleep(n) {
  return new Promise((resolve, reject) => setTimeout(resolve, n))
}

async function wrapLoading(fn, message, ...args) {
  // 制作了一个等待的loading
  const spinner = ora(message)
  spinner.start() //开启加载
  try {
    let repos = await fn(...args) // axios.get()
    spinner.succeed() // 成功
    return repos
  } catch (e) {
    spinner.fail("request failed , refetch...")
    await sleep(1000)
    return wrapLoading(fn, message, ...args)
  }
}
module.exports = {
  writeFileTree,
  stringifyJS,
  extractCallDir,
  mergeDeps,
  isObject,
  sortObject,
  generateReadme,
  isPlugin,
  toShortPluginId,
  sleep,
  wrapLoading,
}
