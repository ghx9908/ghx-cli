const { stringifyJS } = require("./util/util")

class ConfigTransform {
  // 文件信息
  constructor(options) {
    this.fileDescriptor = options
  }

  // value 文件内容
  transform(value) {
    let file = this.getDefaultFile()
    const { type, filename } = file

    if (type !== "js") {
      throw new Error("哎呀，出错了，仅支持 js 后缀的配置文件")
    }

    const content = this.getContent(value, filename)

    return {
      filename,
      content,
    }
  }

  getContent(value, filename) {
    if (filename === "vue.config.js") {
      return (
        `const { defineConfig } = require('@vue/cli-service')\n` +
        `module.exports = defineConfig(${stringifyJS(value, null, 2)})`
      )
    } else {
      return `module.exports = ${stringifyJS(value, null, 2)}`
    }
  }

  // 获取 fileDescriptor 第1个对象作为 type 和 filename
  getDefaultFile() {
    const [type] = Object.keys(this.fileDescriptor)
    const [filename] = this.fileDescriptor[type]
    return { type, filename }
  }
}

module.exports = ConfigTransform
