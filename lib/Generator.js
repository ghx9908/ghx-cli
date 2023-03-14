const PackageManager = require("./PackageManager")
const ConfigTransform = require("./ConfigTransform")
const GeneratorAPI = require("./GeneratorAPI")
const { sortObject, writeFileTree, isPlugin } = require("./util/util.js")
let normalizeFilePaths = require("./util/normalizeFilePaths")
const defaultConfigTransforms = {
  vue: new ConfigTransform({
    js: ["vue.config.js"],
  }),
  babel: new ConfigTransform({
    js: ["babel.config.js"],
  }),
  postcss: new ConfigTransform({
    js: ["postcss.config.js"],
  }),
  eslintConfig: new ConfigTransform({
    js: [".eslintrc.js"],
  }),
  jest: new ConfigTransform({
    js: ["jest.config.js"],
  }),
  "lint-staged": new ConfigTransform({
    js: ["lint-staged.config.js"],
  }),
}

class Generator {
  /**
   *
   * @param {*} context 项目目录
   * @param {*} pkg 项目的package.json内容
   *           plugins [{id,apply,options}]
   */
  constructor(context, { pkg = {}, plugins = [], files = {} } = {}) {
    this.context = context
    this.plugins = plugins // [{id,apply,options}]
    this.files = files //生成器先把所有要生成的文件和文件内容放在files对象
    this.fileMiddlewares = [] //生成文件的中间件
    //每个插件都会向中间件里插入中间件 fn
    //然后中间会负责往this.files里写文件 key value
    this.pkg = Object.assign({}, pkg)
    this.allPluginIds = Object.keys(this.pkg.dependencies || {})
      .concat(Object.keys(this.pkg.devDependencies || {}))
      .filter(isPlugin) //[]

    this.originalPkg = pkg
    this.pm = new PackageManager({ context }) // 实例化打包对象
    this.rootOptions = {}
    this.defaultConfigTransforms = defaultConfigTransforms // 记录 babel, vue 等配置文件默认名字，并提供了提取文件内容的能力。

    this.exitLogs = []

    const cliService = plugins.find((p) => p.id === "@vue/cli-service") // @vue/cli-service 插件

    const rootOptions = cliService ? cliService.options : {} //cliService的配置对象就是preset,也就是根配置

    this.rootOptions = rootOptions
  }

  async generate({
    extractConfigFiles = false,
    checkExisting = false,
    sortPackageJson = true,
  } = {}) {
    // 准备工作 初始化插件，修改fileMiddlewares和pkg
    // for 循环给 给每个插件 创建GeneratorAPI
    await this.initPlugins()
    // 将 package.json 中的一些配置提取到专用文件中。
    this.extractConfigFiles(extractConfigFiles, checkExisting)
    // 提取文件内容
    await this.resolveFiles()
    // pkg 字段排序
    if (sortPackageJson) {
      this.sortPkg()
    }
    // 更新 package.json 数据
    this.files["package.json"] = JSON.stringify(this.pkg, null, 2) + "\n"
    // 生成项目文件，配置文件
    await writeFileTree(this.context, this.files)
  }

  async initPlugins() {
    const { rootOptions } = this

    for (const plugin of this.plugins) {
      const { id, apply, options } = plugin
      //为每个插件创建一个GeneratorAPI对象
      const api = new GeneratorAPI(id, this, options, rootOptions)

      await apply(api, options, rootOptions, {})
    }
  }

  extractConfigFiles() {
    const ensureEOL = (str) => {
      if (str.charAt(str.length - 1) !== "\n") {
        return str + "\n"
      }
      return str
    }

    const extract = (key) => {
      const value = this.pkg[key]
      const configTransform = this.defaultConfigTransforms[key]
      // 用于处理配置文件名称，文件内容，并记录到 this.files
      const res = configTransform.transform(
        value,
        false,
        this.files,
        this.context
      )
      const { content, filename } = res
      this.files[filename] = ensureEOL(content)
      // this.files['babel.config.js'] = 文件内容
      // this.files['vue.config.js'] = 文件内容
    }

    // 提取 vue, babel 配置文件名称及其内容
    extract("vue")
    extract("babel")
  }
  // 执行中间函数
  async resolveFiles() {
    for (const middleware of this.fileMiddlewares) {
      await middleware(this.files)
    }
    normalizeFilePaths(this.files)
  }

  sortPkg() {
    // 默认排序
    this.pkg.dependencies = sortObject(this.pkg.dependencies)
    this.pkg.devDependencies = sortObject(this.pkg.devDependencies)

    // 按 serve, build... 排序
    this.pkg.scripts = sortObject(this.pkg.scripts, [
      "serve",
      "build",
      "test:unit",
      "test:e2e",
      "lint",
      "deploy",
    ])

    // 按 name version... 排序
    this.pkg = sortObject(this.pkg, [
      "name",
      "version",
      "private",
      "description",
      "author",
      "scripts",
      "main",
      "module",
      "browser",
      "jsDelivr",
      "unpkg",
      "files",
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "vue",
      "babel",
      "eslintConfig",
      "prettier",
      "postcss",
      "browserslist",
      "jest",
    ])
  }
}

module.exports = Generator
