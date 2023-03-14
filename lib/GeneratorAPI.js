const fs = require("fs")
const ejs = require("ejs")
const path = require("path")
const { isBinaryFileSync } = require("isbinaryfile")
const { getPluginLink, matchesPluginId } = require("@vue/cli-shared-utils")
const {
  extractCallDir,
  mergeDeps,
  isObject,
  toShortPluginId,
} = require("./util/util")

class GeneratorAPI {
  /**
   *
   * @param {*} id 插件ID
   * @param {*} generator 生成器函数
   * @param {*} options 插件的选项
   * @param {*} rootOptions  根选项，也就是preset
   */
  constructor(id, generator, options, rootOptions) {
    this.id = id
    this.generator = generator
    this.options = options
    this.rootOptions = rootOptions

    this.pluginsData = generator.plugins
      .filter(({ id }) => id !== `@vue/cli-service`)
      .map(({ id }) => ({
        name: toShortPluginId(id),
        link: getPluginLink(id),
      }))

    this._entryFile = undefined
  }
  //给 fileMiddlewares 赋值
  render(source, additionalData = {}) {
    // 获取调用的目录
    const baseDir = extractCallDir()

    if (typeof source === "string") {
      // 获得模板路径
      source = path.resolve(baseDir, source)

      // 暂存
      this._injectFileMiddleware(async (files) => {
        const data = this._resolveData(additionalData)
        // 读取 source 目录下所有文件
        const globby = require("globby")
        //匹配所有的文件
        const _files = await globby(["**/*"], { cwd: source, dot: true })

        for (const rawPath of _files) {
          // 生成文件时，_ 换成 .   __直接删掉
          const targetPath = rawPath
            .split("/")
            .map((filename) => {
              if (filename.charAt(0) === "_" && filename.charAt(1) !== "_") {
                return `.${filename.slice(1)}`
              }
              if (filename.charAt(0) === "_" && filename.charAt(1) === "_") {
                return `${filename.slice(1)}`
              }
              return filename
            })
            .join("/")

          // 源文件路径
          const sourcePath = path.resolve(source, rawPath)
          // 读取文件内容
          const content = this.renderFile(sourcePath, data)
          // files 记录文件及文件内容
          if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
            files[targetPath] = content
          }
        }
      })
    }
  }

  // 合并 option
  _resolveData(additionalData) {
    return Object.assign(
      {
        options: this.options,
        rootOptions: this.rootOptions,
        plugins: this.pluginsData,
      },
      additionalData
    )
  }

  _injectFileMiddleware(middleware) {
    // 把中间件放入数组
    this.generator.fileMiddlewares.push(middleware)
  }

  renderFile(name, data) {
    // 二进制文件，如图片，直接返回
    if (isBinaryFileSync(name)) {
      return fs.readFileSync(name)
    }

    // 其他文件用 ejs 渲染返回
    const template = fs.readFileSync(name, "utf-8")
    return ejs.render(template, data)
  }
  // 给 generator  pkg 赋值
  extendPackage(fields, options = {}) {
    const pkg = this.generator.pkg
    const toMerge = fields

    for (const key in toMerge) {
      const value = toMerge[key]
      const existing = pkg[key]

      // 合并
      if (isObject(value) && isObject(existing)) {
        pkg[key] = mergeDeps(existing || {}, value)
      } else {
        // 不在 pkg 则直接放
        pkg[key] = value
      }
    }
  }

  hasPlugin(id) {
    const pluginExists = [...this.generator.plugins.map((p) => p.id)].some(
      (pid) => matchesPluginId(id, pid)
    )

    return pluginExists
  }
}

module.exports = GeneratorAPI
